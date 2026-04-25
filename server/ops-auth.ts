// Phase 4 — Google OAuth login for the Kontrib Ops dashboard.
// Replaces the previous shared OPS_PASSWORD with Google sign-in restricted to a
// hard-coded allowlist of admin emails. Sessions are stored in memory (fine for
// a small ops team; expires when the server restarts).
//
// Required environment variables:
//   GOOGLE_CLIENT_ID      - OAuth 2.0 Client ID from Google Cloud Console
//   GOOGLE_CLIENT_SECRET  - OAuth 2.0 Client Secret from Google Cloud Console
//   SESSION_SECRET        - Any long random string used to sign session cookies
//   OPS_BASE_URL          - Optional. Public origin used to build the OAuth
//                            callback URL (e.g. https://kontrib.app). Falls back
//                            to req.protocol + host on the first request.

import session from "express-session";
import createMemoryStore from "memorystore";
import passport from "passport";
import {
  Strategy as GoogleStrategy,
  type Profile,
  type VerifyCallback,
} from "passport-google-oauth20";
import type { Express, Request, Response, NextFunction } from "express";

// Lower-case allowlist for case-insensitive comparison.
export const OPS_ADMIN_EMAILS = [
  "support@kontrib.app",
  "jude.denison1310@gmail.com",
];

export type OpsSessionUser = {
  email: string;
  name?: string;
  picture?: string;
  loggedInAt: number;
};

declare module "express-session" {
  interface SessionData {
    opsUser?: OpsSessionUser;
  }
}

function isAllowedEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return OPS_ADMIN_EMAILS.includes(email.toLowerCase().trim());
}

/**
 * Mount the ops auth middleware (session + passport + OAuth routes).
 * Safe to call before the rest of the app's routes — does NOT register the
 * `/api/ops/...` business routes themselves; those still live in routes.ts.
 */
export function setupOpsAuth(app: Express): void {
  const sessionSecret =
    process.env.SESSION_SECRET ||
    process.env.OPS_PASSWORD || // fallback so the server still boots in dev
    "kontrib-ops-dev-session-secret-change-me";

  const isProduction = process.env.NODE_ENV === "production";

  const MemoryStore = createMemoryStore(session);
  app.set("trust proxy", 1); // required for secure cookies behind Replit's proxy

  app.use(
    session({
      name: "kontrib.ops.sid",
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      store: new MemoryStore({ checkPeriod: 24 * 60 * 60 * 1000 }),
      cookie: {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      },
    }),
  );

  app.use(passport.initialize());
  app.use(passport.session());

  // We don't store users in a DB — just round-trip the email object.
  passport.serializeUser((user: any, done) => done(null, user));
  passport.deserializeUser((obj: any, done) => done(null, obj));

  const clientID = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (clientID && clientSecret) {
    passport.use(
      new GoogleStrategy(
        {
          clientID,
          clientSecret,
          // Use a relative callback URL so the same code works on
          // localhost, .replit.dev preview domains and kontrib.app.
          callbackURL: "/api/ops/auth/google/callback",
        },
        (
          _accessToken: string,
          _refreshToken: string,
          profile: Profile,
          done: VerifyCallback,
        ) => {
          const email = profile.emails?.[0]?.value?.toLowerCase().trim();
          if (!isAllowedEmail(email)) {
            // Reject — the failureRedirect will explain it to the user.
            return done(null, false, {
              message: "This Google account is not authorised for Kontrib Ops.",
            });
          }
          const user: OpsSessionUser = {
            email: email!,
            name: profile.displayName,
            picture: profile.photos?.[0]?.value,
            loggedInAt: Date.now(),
          };
          return done(null, user);
        },
      ),
    );
  } else {
    console.warn(
      "[ops-auth] GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set — Google login will be unavailable.",
    );
  }

  // ----- Routes ----------------------------------------------------------

  app.get("/api/ops/auth/me", (req: Request, res: Response) => {
    const user = req.session?.opsUser;
    res.json({
      authed: !!user,
      user: user ?? null,
      googleConfigured: !!(clientID && clientSecret),
    });
  });

  app.get(
    "/api/ops/auth/google",
    (req: Request, res: Response, next: NextFunction) => {
      if (!clientID || !clientSecret) {
        return res.status(503).send(
          renderErrorPage(
            "Google login is not configured",
            "The server is missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET. Add them in Replit secrets and redeploy.",
          ),
        );
      }
      passport.authenticate("google", {
        scope: ["profile", "email"],
        prompt: "select_account",
      })(req, res, next);
    },
  );

  app.get(
    "/api/ops/auth/google/callback",
    (req: Request, res: Response, next: NextFunction) => {
      passport.authenticate(
        "google",
        { session: false },
        (err: any, user: OpsSessionUser | false, info: any) => {
          if (err) {
            return res
              .status(500)
              .send(renderErrorPage("Sign-in failed", String(err?.message || err)));
          }
          if (!user) {
            return res
              .status(403)
              .send(
                renderErrorPage(
                  "Access denied",
                  info?.message ||
                    "This Google account is not authorised for Kontrib Ops.",
                ),
              );
          }
          // Attach to session manually so we don't need passport's user model.
          req.session.opsUser = user;
          req.session.save((saveErr) => {
            if (saveErr) {
              return res
                .status(500)
                .send(
                  renderErrorPage("Session error", String(saveErr.message || saveErr)),
                );
            }
            res.redirect("/ops");
          });
        },
      )(req, res, next);
    },
  );

  app.post("/api/ops/auth/logout", (req: Request, res: Response) => {
    req.session.destroy(() => {
      res.clearCookie("kontrib.ops.sid");
      res.json({ ok: true });
    });
  });
}

/**
 * Express middleware that allows a request through only if the session belongs
 * to an allow-listed admin. Replaces the previous OPS_PASSWORD check.
 * Returns 401 with a JSON body so the client can redirect to the lock screen.
 */
export function requireOpsSession(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const user = req.session?.opsUser;
  if (!user || !isAllowedEmail(user.email)) {
    res.status(401).json({ message: "Not signed in", needsLogin: true });
    return;
  }
  next();
}

/** Returns the current ops session user or null. Useful for actorId fields. */
export function getOpsUser(req: Request): OpsSessionUser | null {
  return req.session?.opsUser ?? null;
}

function renderErrorPage(title: string, body: string): string {
  const safeTitle = escapeHtml(title);
  const safeBody = escapeHtml(body);
  return `<!doctype html><html><head><meta charset="utf-8"><title>${safeTitle}</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body{font-family:system-ui,sans-serif;background:#030712;color:#f9fafb;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:1rem;}
  .card{max-width:420px;background:#111827;border:1px solid #1f2937;border-radius:12px;padding:24px;}
  h1{font-size:18px;margin:0 0 8px;color:#f87171;}
  p{font-size:14px;color:#d1d5db;line-height:1.5;margin:0 0 16px;}
  a{color:#60a5fa;font-size:13px;}
</style></head>
<body><div class="card"><h1>${safeTitle}</h1><p>${safeBody}</p>
<a href="/ops">← Back to ops</a></div></body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!,
  );
}
