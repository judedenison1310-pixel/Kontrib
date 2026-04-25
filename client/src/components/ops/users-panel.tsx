// Phase 4 — Ops Users panel.
// Search by name / phone / id / referral code; click a row to open a side
// drawer with the full user record, group memberships, and a suspend toggle.

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { Search, ShieldAlert, ShieldCheck, Users as UsersIcon, Loader2, Phone, Hash, Award } from "lucide-react";
import { opsFetch, formatDateTime, formatNgn, StatusPill } from "./ops-shared";

type UserHit = {
  id: string; fullName: string | null; phoneNumber: string; role: string;
  adminKycStatus: string; suspendedAt: string | null; createdAt: string;
};
type SearchResp = { users: UserHit[] };
type DetailResp = {
  user: any;
  groupsAsAdmin: Array<{ id: string; name: string; groupType: string; suspendedAt: string | null }>;
  groupsAsMember: Array<{ id: string; name: string; groupType: string; joinedAt: string | null }>;
  contributionsCount: number;
  totalContributed: string;
  pushSubscriptionCount: number;
};

export function UsersPanel({ actorId }: { actorId: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const search = useQuery<SearchResp>({
    queryKey: ["/api/ops/users/search", submitted],
    queryFn: () => opsFetch("GET", `/api/ops/users/search?q=${encodeURIComponent(submitted)}`),
  });

  const detail = useQuery<DetailResp>({
    queryKey: ["/api/ops/users", openId],
    queryFn: () => opsFetch("GET", `/api/ops/users/${openId}`),
    enabled: !!openId,
  });

  const suspendMut = useMutation({
    mutationFn: async (vars: { userId: string; reason: string }) =>
      opsFetch("POST", `/api/ops/users/${vars.userId}/suspend`, { reason: vars.reason, actorId }),
    onSuccess: () => {
      toast({ title: "User suspended" });
      qc.invalidateQueries({ queryKey: ["/api/ops/users"] });
      qc.invalidateQueries({ queryKey: ["/api/ops/users/search"] });
      setReason("");
    },
    onError: (err: any) => toast({ title: "Failed to suspend", description: err?.message, variant: "destructive" }),
  });

  const unsuspendMut = useMutation({
    mutationFn: async (userId: string) =>
      opsFetch("POST", `/api/ops/users/${userId}/unsuspend`, { actorId }),
    onSuccess: () => {
      toast({ title: "Suspension lifted" });
      qc.invalidateQueries({ queryKey: ["/api/ops/users"] });
      qc.invalidateQueries({ queryKey: ["/api/ops/users/search"] });
    },
    onError: (err: any) => toast({ title: "Failed", description: err?.message, variant: "destructive" }),
  });

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(query.trim());
  };

  const hits = search.data?.users || [];

  return (
    <div className="space-y-4">
      <form onSubmit={onSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Name, phone, user ID, or referral code"
            className="pl-9 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
            data-testid="input-ops-users-search"
          />
        </div>
        <Button type="submit" className="bg-primary" data-testid="button-ops-users-search">Search</Button>
      </form>

      {search.isLoading && <p className="text-gray-400 text-sm">Searching…</p>}
      {!search.isLoading && submitted === "" && hits.length > 0 && (
        <p className="text-xs text-gray-500">Showing {hits.length} most-recent users. Type to filter.</p>
      )}
      {!search.isLoading && submitted !== "" && hits.length === 0 && (
        <div className="text-center py-10 text-gray-500">No users match "{submitted}"</div>
      )}

      <div className="space-y-2">
        {hits.map(u => (
          <Card key={u.id} className="bg-gray-900 border-gray-800 hover:border-gray-700 cursor-pointer" onClick={() => setOpenId(u.id)} data-testid={`row-user-${u.id}`}>
            <CardContent className="p-4 flex items-center gap-4">
              <UsersIcon className="h-5 w-5 text-gray-400" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm text-white truncate">{u.fullName || "(no name)"}</p>
                  <span className="text-gray-500 text-xs">·</span>
                  <p className="text-gray-400 text-xs">{u.phoneNumber}</p>
                  {u.role === "admin" && <Badge text="admin" cls="bg-purple-500/20 text-purple-300" />}
                  {u.suspendedAt && <Badge text="suspended" cls="bg-red-500/20 text-red-300" />}
                  {u.adminKycStatus !== "none" && <Badge text={`KYC ${u.adminKycStatus}`} cls={kycCls(u.adminKycStatus)} />}
                </div>
                <p className="text-gray-500 text-xs mt-0.5">Joined {formatDateTime(u.createdAt)}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Sheet open={!!openId} onOpenChange={o => { if (!o) setOpenId(null); setReason(""); }}>
        <SheetContent className="bg-gray-900 border-gray-800 text-white sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-white">User detail</SheetTitle>
          </SheetHeader>
          {detail.isLoading || !detail.data ? (
            <div className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin text-gray-400 mx-auto" /></div>
          ) : (
            <div className="space-y-5 mt-4">
              <div>
                <p className="text-lg font-bold">{detail.data.user.fullName || "(no name)"}</p>
                <p className="text-gray-400 text-sm flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {detail.data.user.phoneNumber}</p>
                <p className="text-gray-500 text-xs flex items-center gap-1.5 mt-0.5"><Hash className="h-3 w-3" /> {detail.data.user.id}</p>
                {detail.data.user.referralCode && (
                  <p className="text-gray-500 text-xs flex items-center gap-1.5 mt-0.5"><Award className="h-3 w-3" /> Referral code: <span className="text-gray-300">{detail.data.user.referralCode}</span></p>
                )}
              </div>

              {detail.data.user.suspendedAt && (
                <div className="bg-red-950/40 border border-red-900 rounded-lg p-3">
                  <p className="font-semibold text-red-300 text-sm flex items-center gap-1.5"><ShieldAlert className="h-4 w-4" /> Suspended {formatDateTime(detail.data.user.suspendedAt)}</p>
                  {detail.data.user.suspendedReason && <p className="text-red-200 text-sm mt-1">Reason: {detail.data.user.suspendedReason}</p>}
                  <Button
                    onClick={() => openId && unsuspendMut.mutate(openId)}
                    disabled={unsuspendMut.isPending}
                    className="bg-green-600 hover:bg-green-700 text-white text-xs mt-3"
                    data-testid="button-ops-user-unsuspend"
                  >
                    {unsuspendMut.isPending ? "…" : "Lift suspension"}
                  </Button>
                </div>
              )}

              <Stat label="Role" value={detail.data.user.role} />
              <Stat label="Admin KYC" value={detail.data.user.adminKycStatus} />
              <Stat label="Total contributed" value={formatNgn(detail.data.totalContributed)} />
              <Stat label="Contributions made" value={String(detail.data.contributionsCount)} />
              <Stat label="Active push subscriptions" value={String(detail.data.pushSubscriptionCount)} />

              {detail.data.groupsAsAdmin.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Admin of</p>
                  <div className="space-y-1.5">
                    {detail.data.groupsAsAdmin.map(g => (
                      <div key={g.id} className="bg-gray-800 rounded-lg px-3 py-2 text-sm flex items-center justify-between">
                        <div>
                          <p className="text-white">{g.name}</p>
                          <p className="text-gray-500 text-xs">{g.groupType}</p>
                        </div>
                        {g.suspendedAt && <StatusPill status="suspended" />}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detail.data.groupsAsMember.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Member of ({detail.data.groupsAsMember.length})</p>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {detail.data.groupsAsMember.map(g => (
                      <div key={g.id} className="bg-gray-800 rounded-lg px-3 py-2 text-xs flex items-center justify-between">
                        <span className="text-white">{g.name}</span>
                        <span className="text-gray-500">{g.joinedAt ? formatDateTime(g.joinedAt) : "—"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!detail.data.user.suspendedAt && (
                <div className="border-t border-gray-800 pt-4 space-y-2">
                  <p className="text-sm font-semibold text-red-300 flex items-center gap-1.5"><ShieldAlert className="h-4 w-4" /> Suspend account</p>
                  <p className="text-xs text-gray-400">User will be blocked from logging in. Provide a clear, actionable reason.</p>
                  <Textarea
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder="e.g. Repeated TOS violation reported on 14 Apr"
                    className="bg-gray-800 border-gray-700 text-white text-sm"
                    rows={3}
                    data-testid="textarea-ops-user-suspend-reason"
                  />
                  <Button
                    onClick={() => openId && suspendMut.mutate({ userId: openId, reason: reason.trim() })}
                    disabled={suspendMut.isPending || reason.trim().length < 3}
                    className="bg-red-600 hover:bg-red-700 text-white w-full"
                    data-testid="button-ops-user-suspend"
                  >
                    {suspendMut.isPending ? "Suspending…" : "Suspend user"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Badge({ text, cls }: { text: string; cls: string }) {
  return <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wide ${cls}`}>{text}</span>;
}

function kycCls(s: string) {
  if (s === "approved") return "bg-green-500/20 text-green-300";
  if (s === "rejected") return "bg-red-500/20 text-red-300";
  if (s === "pending") return "bg-amber-500/20 text-amber-300";
  return "bg-gray-500/20 text-gray-400";
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between bg-gray-800/60 rounded-lg px-3 py-2">
      <span className="text-xs text-gray-400">{label}</span>
      <span className="text-sm text-white capitalize">{value}</span>
    </div>
  );
}
