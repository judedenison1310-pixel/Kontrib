// User-facing "Continue with Google" sign-in. Sits alongside the existing
// WhatsApp OTP flow — it does NOT replace it. WhatsApp is still the primary
// identifier; this just lets users authenticate the first leg (and have their
// email captured) by tapping a Google account, then completing with WhatsApp
// OTP on first signup.
//
// Required env vars: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET.
//
// Routes added here:
//   GET  /api/auth/google/start             — kick off OAuth (signup OR link)
//   GET  /api/auth/google/callback          — Google redirects back here
//   POST /api/auth/google/exchange          — one-time code → device token
//   POST /api/auth/google/intent/:id        — read pending signup intent
//   POST /api/auth/google/complete-signup   — { intentId, phoneNumber, otp } → user
//   POST /api/auth/google/link/start        — (authed) start link flow, returns OAuth URL
//
// Passport strategy is registered under the name "google-app" so it doesn't
// collide with the ops-auth strategy (which uses the default "google" name).

import crypto from "crypto";
import passport from "passport";
import {
  Strategy as GoogleStrategy,
  type Profile,
  type VerifyCallback,
} from "passport-google-oauth20";
import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { sendWelcomeEmail } from "./email";

type GoogleProfileBits = {
  googleSub: string;
  email: string;
  fullName: string;
  picture?: string;
};

type SignupIntent = GoogleProfileBits & { createdAt: number };
type ExchangeCode = { userId: string; createdAt: number };
type LinkIntent = { userId: string; createdAt: number };

const INTENT_TTL_MS = 10 * 60 * 1000; // 10 minutes
const EXCHANGE_TTL_MS = 2 * 60 * 1000; // 2 minutes — one-time code
const STATE_NONCE_TTL_MS = 10 * 60 * 1000;

const signupIntents = new Map<string, SignupIntent>();
const exchangeCodes = new Map<string, ExchangeCode>();
const linkIntents = new Map<string, LinkIntent>();

function gc(): void {
  const now = Date.now();
  for (const [k, v] of signupIntents) if (now - v.createdAt > INTENT_TTL_MS) signupIntents.delete(k);
  for (const [k, v] of exchangeCodes) if (now - v.createdAt > EXCHANGE_TTL_MS) exchangeCodes.delete(k);
  for (const [k, v] of linkIntents) if (now - v.createdAt > INTENT_TTL_MS) linkIntents.delete(k);
}
setInterval(gc, 60 * 1000).unref?.();

// Browser-bound, single-use nonces for OAuth state. Stored in the express
// session (already mounted by setupOpsAuth) so the callback can verify the
// browser that initiated /start is the same one returning from Google. This
// prevents OAuth login-CSRF (attacker stitching their Google account into a
// victim's browser session).
declare module "express-session" {
  interface SessionData {
    googleAppStateNonces?: { nonce: string; createdAt: number }[];
  }
}

function issueStateNonce(req: Request): string {
  const nonce = makeCode();
  const list = req.session.googleAppStateNonces ?? [];
  // Drop expired entries and cap the list so a misbehaving client can't
  // grow the session unboundedly.
  const now = Date.now();
  const trimmed = list.filter((n) => now - n.createdAt < STATE_NONCE_TTL_MS).slice(-9);
  trimmed.push({ nonce, createdAt: now });
  req.session.googleAppStateNonces = trimmed;
  return nonce;
}

function consumeStateNonce(req: Request, nonce: string): boolean {
  const list = req.session.googleAppStateNonces ?? [];
  const now = Date.now();
  const idx = list.findIndex(
    (n) => n.nonce === nonce && now - n.createdAt < STATE_NONCE_TTL_MS,
  );
  if (idx === -1) return false;
  list.splice(idx, 1);
  req.session.googleAppStateNonces = list;
  return true;
}

function makeCode(): string {
  return crypto.randomBytes(24).toString("base64url");
}

function buildAbsoluteUrl(req: Request, path: string): string {
  const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${proto}://${host}${path}`;
}

function htmlEscape(s: string): string {
  return s.replace(/[&<>"']/g, (ch) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!,
  );
}

function renderErrorPage(title: string, body: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${htmlEscape(title)}</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body{font-family:system-ui,sans-serif;background:#f9fafb;color:#111;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:1rem;}
  .card{max-width:420px;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;}
  h1{font-size:18px;margin:0 0 8px;}
  p{font-size:14px;color:#374151;line-height:1.5;margin:0 0 16px;}
  a{color:#2563eb;font-size:13px;}
</style></head>
<body><div class="card"><h1>${htmlEscape(title)}</h1><p>${htmlEscape(body)}</p>
<a href="/">← Back to sign-in</a></div></body></html>`;
}

export function setupAppGoogleAuth(app: Express): void {
  const clientID = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientID || !clientSecret) {
    console.warn(
      "[app-google-auth] GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set — 'Continue with Google' will be unavailable.",
    );
  } else {
    // Use a callback URL distinct from the ops one. The strategy is registered
    // under the name "google-app" so passport.authenticate("google-app", ...)
    // is unambiguous.
    passport.use(
      "google-app",
      new GoogleStrategy(
        {
          clientID,
          clientSecret,
          callbackURL: "/api/auth/google/callback",
          passReqToCallback: false,
        },
        (
          _accessToken: string,
          _refreshToken: string,
          profile: Profile,
          done: VerifyCallback,
        ) => {
          const email = profile.emails?.[0]?.value?.toLowerCase().trim();
          if (!email) {
            return done(null, false, { message: "Google did not return an email." });
          }
          const bits: GoogleProfileBits = {
            googleSub: profile.id,
            email,
            fullName: profile.displayName || email.split("@")[0],
            picture: profile.photos?.[0]?.value,
          };
          return done(null, bits as any);
        },
      ),
    );
  }

  // ---- Status endpoint so the UI can hide the button if not configured. ----
  app.get("/api/auth/google/status", (_req, res) => {
    res.json({ configured: !!(clientID && clientSecret) });
  });

  // ---- Start OAuth ----
  app.get(
    "/api/auth/google/start",
    (req: Request, res: Response, next: NextFunction) => {
      if (!clientID || !clientSecret) {
        return res
          .status(503)
          .send(
            renderErrorPage(
              "Google sign-in not configured",
              "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are missing on the server.",
            ),
          );
      }
      // The caller may pass an opaque purpose tag (currently "link:<intentId>")
      // — we wrap it with a single-use, session-bound nonce so the callback
      // can prove it came from a flow this browser actually initiated.
      const purpose = typeof req.query.state === "string" ? req.query.state : "signin";
      const nonce = issueStateNonce(req);
      const state = `${nonce}.${purpose}`;
      req.session.save((err) => {
        if (err) {
          console.error("[app-google-auth] session save failed:", err);
          return res
            .status(500)
            .send(renderErrorPage("Sign-in failed", "Could not start sign-in. Please try again."));
        }
        passport.authenticate("google-app", {
          scope: ["profile", "email"],
          prompt: "select_account",
          state,
          session: false,
        })(req, res, next);
      });
    },
  );

  // ---- OAuth callback ----
  app.get(
    "/api/auth/google/callback",
    (req: Request, res: Response, next: NextFunction) => {
      passport.authenticate(
        "google-app",
        { session: false },
        async (err: any, profile: GoogleProfileBits | false, info: any) => {
          if (err) {
            console.error("[app-google-auth] callback error:", err);
            return res
              .status(500)
              .send(renderErrorPage("Sign-in failed", String(err?.message || err)));
          }
          if (!profile) {
            return res
              .status(400)
              .send(
                renderErrorPage(
                  "Sign-in cancelled",
                  info?.message || "Google did not return an account.",
                ),
              );
          }

          try {
            // Validate OAuth state — first segment is the session-bound nonce,
            // rest is the original purpose tag ("signin" or "link:<id>").
            const stateRaw = typeof req.query.state === "string" ? req.query.state : "";
            const dotIdx = stateRaw.indexOf(".");
            const stateNonce = dotIdx === -1 ? "" : stateRaw.slice(0, dotIdx);
            const purpose = dotIdx === -1 ? stateRaw : stateRaw.slice(dotIdx + 1);
            if (!stateNonce || !consumeStateNonce(req, stateNonce)) {
              return res
                .status(400)
                .send(
                  renderErrorPage(
                    "Sign-in expired",
                    "This sign-in link is invalid or expired. Please return to Kontrib and tap Continue with Google again.",
                  ),
                );
            }
            const linkMatch = purpose.match(/^link:(.+)$/);

            // ============ LINK FLOW ============
            // An already-signed-in WhatsApp-first user is attaching a Google
            // account to their profile.
            if (linkMatch) {
              const intentId = linkMatch[1];
              const linkIntent = linkIntents.get(intentId);
              linkIntents.delete(intentId);
              if (!linkIntent || Date.now() - linkIntent.createdAt > INTENT_TTL_MS) {
                return res
                  .status(400)
                  .send(
                    renderErrorPage(
                      "Link request expired",
                      "Please go back to your dashboard and try linking again.",
                    ),
                  );
              }

              // Make sure no OTHER user already owns this google account / email.
              const ownedBySub = await storage.getUserByGoogleSub(profile.googleSub);
              if (ownedBySub && ownedBySub.id !== linkIntent.userId) {
                return res
                  .status(409)
                  .send(
                    renderErrorPage(
                      "This Google account is already linked",
                      "Another Kontrib account is already using this Google email. Sign out and sign in with Google instead, or use a different Google account.",
                    ),
                  );
              }
              const ownedByEmail = await storage.getUserByEmail(profile.email);
              if (ownedByEmail && ownedByEmail.id !== linkIntent.userId) {
                return res
                  .status(409)
                  .send(
                    renderErrorPage(
                      "Email already in use",
                      "This email is already attached to a different Kontrib account.",
                    ),
                  );
              }

              const linkedUser = await storage.linkGoogleIdentity(linkIntent.userId, {
                googleSub: profile.googleSub,
                email: profile.email,
                fullName: profile.fullName,
              });
              // Fire-and-forget welcome email so a slow/failing provider can't
              // hold up the redirect back into the app.
              void sendWelcomeEmail({
                to: profile.email,
                fullName: linkedUser?.fullName || profile.fullName,
              }).catch((e) =>
                console.error("[app-google-auth] welcome email failed:", e),
              );
              return res.redirect("/?googleLinked=1");
            }

            // ============ SIGN-IN / SIGN-UP FLOW ============
            // 1) Existing user by google_sub → log in.
            // 2) Else existing user by email → link sub, log in.
            // 3) Else new — stash a signup intent and ask for WhatsApp OTP.
            let user =
              (await storage.getUserByGoogleSub(profile.googleSub)) ||
              undefined;

            if (!user) {
              const byEmail = await storage.getUserByEmail(profile.email);
              if (byEmail) {
                user = await storage.linkGoogleIdentity(byEmail.id, {
                  googleSub: profile.googleSub,
                  email: profile.email,
                  fullName: profile.fullName,
                });
              }
            }

            if (user) {
              if ((user as any).suspendedAt) {
                return res
                  .status(403)
                  .send(
                    renderErrorPage(
                      "Account suspended",
                      "This account has been suspended. Please contact support@kontrib.app.",
                    ),
                  );
              }
              const code = makeCode();
              exchangeCodes.set(code, { userId: user.id, createdAt: Date.now() });
              return res.redirect(`/?googleAuth=${encodeURIComponent(code)}`);
            }

            // New user — stash the Google profile and ask for WhatsApp.
            const intentId = makeCode();
            signupIntents.set(intentId, {
              googleSub: profile.googleSub,
              email: profile.email,
              fullName: profile.fullName,
              picture: profile.picture,
              createdAt: Date.now(),
            });
            return res.redirect(`/?googleSignup=${encodeURIComponent(intentId)}`);
          } catch (e: any) {
            console.error("[app-google-auth] callback fatal:", e);
            return res
              .status(500)
              .send(renderErrorPage("Sign-in failed", String(e?.message || e)));
          }
        },
      )(req, res, next);
    },
  );

  // ---- Exchange one-time code for device token (used by login & post-signup) ----
  app.post("/api/auth/google/exchange", async (req: Request, res: Response) => {
    try {
      const { code, deviceInfo } = req.body ?? {};
      if (!code || typeof code !== "string") {
        return res.status(400).json({ message: "Code is required" });
      }
      const entry = exchangeCodes.get(code);
      exchangeCodes.delete(code); // one-time use, even on failure
      if (!entry || Date.now() - entry.createdAt > EXCHANGE_TTL_MS) {
        return res.status(400).json({ message: "Sign-in link expired. Please try again." });
      }
      const user = await storage.getUser(entry.userId);
      if (!user) {
        return res.status(404).json({ message: "Account not found." });
      }
      // Re-check suspension at token-issuance time. Suspension may have been
      // applied between the callback and the exchange, and the exchange path
      // is the actual moment a usable device token gets minted.
      if ((user as any).suspendedAt) {
        return res.status(403).json({
          message: "This account is suspended. Please contact support@kontrib.app.",
        });
      }
      const deviceToken = await storage.createDeviceToken(user.id, deviceInfo || "google-oauth");
      return res.json({
        user: { ...user, password: undefined },
        deviceToken,
      });
    } catch (e: any) {
      console.error("[app-google-auth] exchange error:", e);
      return res.status(500).json({ message: "Could not complete sign-in." });
    }
  });

  // ---- Inspect a pending signup intent (so the UI can prefill name/email) ----
  app.get("/api/auth/google/intent/:id", (req: Request, res: Response) => {
    const intent = signupIntents.get(req.params.id);
    if (!intent || Date.now() - intent.createdAt > INTENT_TTL_MS) {
      return res.status(404).json({ message: "Signup link expired. Please start again." });
    }
    res.json({
      email: intent.email,
      fullName: intent.fullName,
      picture: intent.picture,
    });
  });

  // ---- Finish Google signup with WhatsApp OTP ----
  app.post(
    "/api/auth/google/complete-signup",
    async (req: Request, res: Response) => {
      try {
        const { intentId, phoneNumber, otp, deviceInfo } = req.body ?? {};
        if (!intentId || !phoneNumber || !otp) {
          return res
            .status(400)
            .json({ message: "intentId, phoneNumber and otp are required" });
        }
        const intent = signupIntents.get(intentId);
        if (!intent || Date.now() - intent.createdAt > INTENT_TTL_MS) {
          return res
            .status(400)
            .json({ message: "Signup link expired. Please start again with Google." });
        }

        const otpOk = await storage.verifyOtp(phoneNumber, otp);
        if (!otpOk) {
          return res.status(400).json({ message: "Invalid or expired OTP." });
        }

        // Either the phone or the google sub may already belong to a user.
        // Prefer existing-by-phone, then link Google to it.
        let user =
          (await storage.getUserByPhoneNumber(phoneNumber)) || undefined;

        // Block suspended accounts from being completed/linked/logged in.
        if (user && (user as any).suspendedAt) {
          return res.status(403).json({
            message: "This account is suspended. Please contact support@kontrib.app.",
          });
        }

        if (user) {
          // Make sure this Google account isn't owned by someone else already.
          const ownedBySub = await storage.getUserByGoogleSub(intent.googleSub);
          if (ownedBySub && ownedBySub.id !== user.id) {
            return res.status(409).json({
              message:
                "That Google account is already linked to a different Kontrib account.",
            });
          }
          user = await storage.linkGoogleIdentity(user.id, {
            googleSub: intent.googleSub,
            email: intent.email,
            fullName: intent.fullName,
          });
        } else {
          // Brand new user.
          const ownedBySub = await storage.getUserByGoogleSub(intent.googleSub);
          if (ownedBySub) {
            // Edge case: the Google account already had an account but we
            // didn't see it before because phone didn't match. Log them in.
            user = ownedBySub;
          } else {
            user = await storage.createUserFromGoogleAndPhone({
              phoneNumber,
              email: intent.email,
              googleSub: intent.googleSub,
              fullName: intent.fullName,
            });
          }
        }

        if (!user) {
          return res.status(500).json({ message: "Could not create your account." });
        }

        // Defense in depth — re-check suspension before minting a token.
        if ((user as any).suspendedAt) {
          return res.status(403).json({
            message: "This account is suspended. Please contact support@kontrib.app.",
          });
        }

        // Burn the intent now that signup succeeded.
        signupIntents.delete(intentId);

        // Fire-and-forget welcome email — same promise we make in the link
        // banner ("we'll email your receipts here"), now that an email is
        // attached to the account for the first time.
        if (intent.email) {
          void sendWelcomeEmail({
            to: intent.email,
            fullName: user.fullName || intent.fullName,
          }).catch((e) =>
            console.error("[app-google-auth] welcome email failed:", e),
          );
        }

        const deviceToken = await storage.createDeviceToken(
          user.id,
          deviceInfo || "google-oauth",
        );
        return res.json({
          user: { ...user, password: undefined },
          deviceToken,
        });
      } catch (e: any) {
        console.error("[app-google-auth] complete-signup error:", e);
        return res.status(500).json({ message: "Could not finish signup." });
      }
    },
  );

  // ---- Authed: start "Link Google" flow from inside the app ----
  app.post(
    "/api/auth/google/link/start",
    async (req: Request, res: Response) => {
      try {
        const authUser = (req as any).authUser as { id: string } | undefined;
        if (!authUser?.id) {
          return res.status(401).json({ message: "Sign in required." });
        }
        if (!clientID || !clientSecret) {
          return res.status(503).json({ message: "Google sign-in is not configured on this server." });
        }
        const intentId = makeCode();
        linkIntents.set(intentId, {
          userId: authUser.id,
          createdAt: Date.now(),
        });
        const authUrl = buildAbsoluteUrl(
          req,
          `/api/auth/google/start?state=${encodeURIComponent("link:" + intentId)}`,
        );
        return res.json({ authUrl });
      } catch (e: any) {
        console.error("[app-google-auth] link-start error:", e);
        return res.status(500).json({ message: "Could not start link flow." });
      }
    },
  );
}
