// Phase 4 — Ops Groups panel.
// Mirrors the Users panel: search, click to open detail, suspend toggle.

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { Search, ShieldAlert, Folder, Loader2, Hash, ExternalLink } from "lucide-react";
import { opsFetch, formatDateTime, formatNgn, StatusPill } from "./ops-shared";

type GroupHit = {
  id: string; name: string; groupType: string; status: string;
  memberCount: number; adminName: string | null; adminPhone: string;
  suspendedAt: string | null; createdAt: string;
};
type SearchResp = { groups: GroupHit[] };
type DetailResp = {
  group: any;
  admin: { id: string; fullName: string | null; phoneNumber: string };
  memberCount: number; projectCount: number;
  contributionsTotal: string; contributionsCount: number;
  recentMembers: Array<{ userId: string; fullName: string | null; phoneNumber: string; joinedAt: string | null }>;
};

export function GroupsPanel({ actorId }: { actorId: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const search = useQuery<SearchResp>({
    queryKey: ["/api/ops/groups/search", submitted],
    queryFn: () => opsFetch("GET", `/api/ops/groups/search?q=${encodeURIComponent(submitted)}`),
  });

  const detail = useQuery<DetailResp>({
    queryKey: ["/api/ops/groups", openId],
    queryFn: () => opsFetch("GET", `/api/ops/groups/${openId}`),
    enabled: !!openId,
  });

  const suspendMut = useMutation({
    mutationFn: async (vars: { groupId: string; reason: string }) =>
      opsFetch("POST", `/api/ops/groups/${vars.groupId}/suspend`, { reason: vars.reason, actorId }),
    onSuccess: () => {
      toast({ title: "Group suspended" });
      qc.invalidateQueries({ queryKey: ["/api/ops/groups"] });
      qc.invalidateQueries({ queryKey: ["/api/ops/groups/search"] });
      setReason("");
    },
    onError: (err: any) => toast({ title: "Failed to suspend", description: err?.message, variant: "destructive" }),
  });

  const unsuspendMut = useMutation({
    mutationFn: async (groupId: string) =>
      opsFetch("POST", `/api/ops/groups/${groupId}/unsuspend`, { actorId }),
    onSuccess: () => {
      toast({ title: "Suspension lifted" });
      qc.invalidateQueries({ queryKey: ["/api/ops/groups"] });
      qc.invalidateQueries({ queryKey: ["/api/ops/groups/search"] });
    },
    onError: (err: any) => toast({ title: "Failed", description: err?.message, variant: "destructive" }),
  });

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(query.trim());
  };

  const hits = search.data?.groups || [];

  return (
    <div className="space-y-4">
      <form onSubmit={onSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Group name, ID, slug, or registration link"
            className="pl-9 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
            data-testid="input-ops-groups-search"
          />
        </div>
        <Button type="submit" className="bg-primary" data-testid="button-ops-groups-search">Search</Button>
      </form>

      {search.isLoading && <p className="text-gray-400 text-sm">Searching…</p>}
      {!search.isLoading && submitted === "" && hits.length > 0 && (
        <p className="text-xs text-gray-500">Showing {hits.length} most-recent groups. Type to filter.</p>
      )}
      {!search.isLoading && submitted !== "" && hits.length === 0 && (
        <div className="text-center py-10 text-gray-500">No groups match "{submitted}"</div>
      )}

      <div className="space-y-2">
        {hits.map(g => (
          <Card key={g.id} className="bg-gray-900 border-gray-800 hover:border-gray-700 cursor-pointer" onClick={() => setOpenId(g.id)} data-testid={`row-group-${g.id}`}>
            <CardContent className="p-4 flex items-center gap-4">
              <Folder className="h-5 w-5 text-gray-400" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm text-white truncate">{g.name}</p>
                  <span className="text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wide bg-gray-800 text-gray-400">{g.groupType}</span>
                  {g.suspendedAt && <span className="text-[10px] px-1.5 py-0.5 rounded uppercase bg-red-500/20 text-red-300">suspended</span>}
                </div>
                <p className="text-gray-500 text-xs mt-0.5">
                  {g.memberCount} member{g.memberCount === 1 ? "" : "s"} · admin {g.adminName || g.adminPhone} · created {formatDateTime(g.createdAt)}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Sheet open={!!openId} onOpenChange={o => { if (!o) setOpenId(null); setReason(""); }}>
        <SheetContent className="bg-gray-900 border-gray-800 text-white sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-white">Group detail</SheetTitle>
          </SheetHeader>
          {detail.isLoading || !detail.data ? (
            <div className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin text-gray-400 mx-auto" /></div>
          ) : (
            <div className="space-y-5 mt-4">
              <div>
                <p className="text-lg font-bold">{detail.data.group.name}</p>
                <p className="text-gray-400 text-sm capitalize">{detail.data.group.groupType} · {detail.data.group.status}</p>
                <p className="text-gray-500 text-xs flex items-center gap-1.5 mt-0.5"><Hash className="h-3 w-3" /> {detail.data.group.id}</p>
                <p className="text-gray-500 text-xs mt-0.5">Admin: {detail.data.admin.fullName || detail.data.admin.phoneNumber}</p>
                {detail.data.group.registrationLink && (
                  <a href={`/${detail.data.group.customSlug || detail.data.group.registrationLink}`} target="_blank" rel="noreferrer"
                     className="text-xs text-blue-400 hover:underline flex items-center gap-1 mt-1">
                    <ExternalLink className="h-3 w-3" /> Open public page
                  </a>
                )}
              </div>

              {detail.data.group.suspendedAt && (
                <div className="bg-red-950/40 border border-red-900 rounded-lg p-3">
                  <p className="font-semibold text-red-300 text-sm flex items-center gap-1.5"><ShieldAlert className="h-4 w-4" /> Suspended {formatDateTime(detail.data.group.suspendedAt)}</p>
                  {detail.data.group.suspendedReason && <p className="text-red-200 text-sm mt-1">Reason: {detail.data.group.suspendedReason}</p>}
                  <Button
                    onClick={() => openId && unsuspendMut.mutate(openId)}
                    disabled={unsuspendMut.isPending}
                    className="bg-green-600 hover:bg-green-700 text-white text-xs mt-3"
                    data-testid="button-ops-group-unsuspend"
                  >
                    {unsuspendMut.isPending ? "…" : "Lift suspension"}
                  </Button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <Stat label="Members" value={String(detail.data.memberCount)} />
                <Stat label="Projects" value={String(detail.data.projectCount)} />
                <Stat label="Contributions" value={String(detail.data.contributionsCount)} />
                <Stat label="Total raised" value={formatNgn(detail.data.contributionsTotal)} />
              </div>

              {(detail.data.group.tcMode || detail.data.group.logoUrl) && (
                <div className="bg-gray-800/50 rounded-lg p-3 space-y-1.5 text-sm">
                  <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Configuration</p>
                  {detail.data.group.tcMode && <p>T&C mode: <span className="capitalize">{detail.data.group.tcMode}</span> {detail.data.group.customTcStatus && <StatusPill status={detail.data.group.customTcStatus} />}</p>}
                  {detail.data.group.logoUrl && <p>Logo: <a href={detail.data.group.logoUrl} className="text-blue-400 hover:underline" target="_blank" rel="noreferrer">view</a></p>}
                  {detail.data.group.verifiedAt && <p>Verified Ajo since {formatDateTime(detail.data.group.verifiedAt)}</p>}
                </div>
              )}

              {detail.data.recentMembers.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Recent members</p>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {detail.data.recentMembers.map(m => (
                      <div key={m.userId} className="bg-gray-800 rounded-lg px-3 py-2 text-xs flex items-center justify-between">
                        <span className="text-white">{m.fullName || m.phoneNumber}</span>
                        <span className="text-gray-500">{m.joinedAt ? formatDateTime(m.joinedAt) : "—"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!detail.data.group.suspendedAt && (
                <div className="border-t border-gray-800 pt-4 space-y-2">
                  <p className="text-sm font-semibold text-red-300 flex items-center gap-1.5"><ShieldAlert className="h-4 w-4" /> Suspend group</p>
                  <p className="text-xs text-gray-400">Group will stop accepting new joins and a banner will surface to members. Existing data is preserved.</p>
                  <Textarea
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder="e.g. Multiple members reported fraudulent collection"
                    className="bg-gray-800 border-gray-700 text-white text-sm"
                    rows={3}
                    data-testid="textarea-ops-group-suspend-reason"
                  />
                  <Button
                    onClick={() => openId && suspendMut.mutate({ groupId: openId, reason: reason.trim() })}
                    disabled={suspendMut.isPending || reason.trim().length < 3}
                    className="bg-red-600 hover:bg-red-700 text-white w-full"
                    data-testid="button-ops-group-suspend"
                  >
                    {suspendMut.isPending ? "Suspending…" : "Suspend group"}
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-800/60 rounded-lg px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-sm text-white font-semibold mt-0.5">{value}</p>
    </div>
  );
}
