// Phase 4 — Shared helpers for the Kontrib ops shell.
// Provides a tiny `opsFetch` wrapper that auto-attaches the ops password
// (stored in sessionStorage by the parent ops page).

import { Badge } from "@/components/ui/badge";

export const OPS_PASS_KEY = "kontrib_ops_pass";

export function getOpsPassword(): string {
  return sessionStorage.getItem(OPS_PASS_KEY) || "";
}

/**
 * Sends a JSON request to an `/api/ops/...` endpoint. Always appends the ops
 * password as a query parameter so the server's `requireOpsAuth` accepts it.
 * Throws on non-2xx with the parsed error message when possible.
 */
export async function opsFetch<T = any>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: any,
): Promise<T> {
  const password = getOpsPassword();
  const sep = path.includes("?") ? "&" : "?";
  const url = `${path}${sep}password=${encodeURIComponent(password)}`;
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json", "x-ops-password": password } : { "x-ops-password": password },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed: any;
  try { parsed = text ? JSON.parse(text) : {}; } catch { parsed = { message: text }; }
  if (!res.ok) {
    const msg = parsed?.message || `Request failed (${res.status})`;
    throw new Error(msg);
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
