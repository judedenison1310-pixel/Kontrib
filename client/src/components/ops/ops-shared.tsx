// Phase 4 — Shared helpers for the Kontrib ops shell.
// Authentication is now handled by Google sign-in (see server/ops-auth.ts) and
// a session cookie. opsFetch just needs to send credentials so the browser
// includes the session cookie on every request.

import { Badge } from "@/components/ui/badge";

/**
 * Sends a JSON request to an `/api/ops/...` endpoint. Includes session cookies
 * automatically. On 401 (session expired / not signed in) the page will reload
 * back to the lock screen via the auth check at the top of the ops page.
 */
export async function opsFetch<T = any>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: any,
): Promise<T> {
  const headers: Record<string, string> = {};
  if (body) headers["Content-Type"] = "application/json";
  const res = await fetch(path, {
    method,
    headers,
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed: any;
  try { parsed = text ? JSON.parse(text) : {}; } catch { parsed = { message: text }; }
  if (!res.ok) {
    const msg = parsed?.message || `Request failed (${res.status})`;
    const err: any = new Error(msg);
    err.status = res.status;
    err.needsLogin = parsed?.needsLogin === true || res.status === 401;
    throw err;
  }
  return parsed as T;
}

export function formatDateTime(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-NG", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function formatNgn(n: number | string): string {
  const v = typeof n === "string" ? parseFloat(n) : n;
  if (!isFinite(v)) return "—";
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 }).format(v);
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    approved: "bg-green-500/20 text-green-300",
    rejected: "bg-red-500/20 text-red-300",
    pending: "bg-amber-500/20 text-amber-300",
    suspended: "bg-red-500/20 text-red-300",
    active: "bg-green-500/20 text-green-300",
    none: "bg-gray-500/20 text-gray-400",
    complete: "bg-green-500/20 text-green-300",
    paid: "bg-blue-500/20 text-blue-300",
    unpaid: "bg-amber-500/20 text-amber-300",
  };
  const cls = map[status] || "bg-gray-500/20 text-gray-300";
  return <Badge className={`${cls} border-0 text-xs capitalize`}>{status.replace(/_/g, " ")}</Badge>;
}
