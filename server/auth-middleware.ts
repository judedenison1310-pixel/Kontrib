import type { Request, Response, NextFunction } from "express";
import type { User } from "@shared/schema";
import { storage } from "./storage";

// We attach the validated user to req under a custom key so other routes can
// trust the actor identity without re-reading the device token themselves.
// Using a loose cast keeps this file free of module-augmentation noise — the
// helpers below are the only intended access points.
export interface RequestWithAuth extends Request {
  authUser?: User | null;
}

// Reads X-Device-Token from the request and resolves it to a User (or null
// if the header is missing/invalid/expired). Never throws — it just attaches
// req.authUser and continues. Routes decide whether to require it.
export async function attachAuthUser(req: Request, _res: Response, next: NextFunction) {
  try {
    const headerVal = req.header("X-Device-Token") || req.header("x-device-token");
    const token = typeof headerVal === "string" && headerVal.trim() ? headerVal.trim() : null;
    if (token) {
      const user = await storage.validateDeviceToken(token);
      (req as RequestWithAuth).authUser = user ?? null;
    }
  } catch (err) {
    // Don't block the request on auth lookup errors; downstream guards will
    // reject if the route needs an authed user.
    console.error("attachAuthUser error:", err);
  }
  next();
}

// Returns the authed user or sends a 401 and returns null. Use at the top of
// any route that requires authentication.
//
//   const actor = requireAuthUser(req, res);
//   if (!actor) return; // 401 already sent
export function requireAuthUser(req: Request, res: Response): User | null {
  const user = (req as RequestWithAuth).authUser;
  if (!user) {
    res.status(401).json({ message: "Please sign in again to continue." });
    return null;
  }
  return user;
}

// Some routes accept an actorId / createdBy in the body for legacy reasons.
// This helper verifies that, when provided, the body value matches the
// device-token user. Returns the trusted user id or sends 403 and null.
export function requireActorMatchesAuth(
  req: Request,
  res: Response,
  bodyActorId: unknown,
): string | null {
  const actor = requireAuthUser(req, res);
  if (!actor) return null;
  if (bodyActorId && typeof bodyActorId === "string" && bodyActorId !== actor.id) {
    res.status(403).json({ message: "You can only act on your own behalf." });
    return null;
  }
  return actor.id;
}
