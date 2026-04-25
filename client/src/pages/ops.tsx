// Phase 4 — Unified Kontrib Ops shell.
// Single password-gated dashboard that surfaces every internal operations
// function: stats overview, admin KYC review, custom T&C moderation, Verified
// Ajo decisions, user / group lookup + suspend, payments view, referral
// payouts, and a push notification debugger.

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { getCurrentUser } from "@/lib/auth";
import {
  Users as UsersIcon,
  Gift,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  Banknote,
  Lock,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  MapPin,
  X,
  HelpCircle,
  BarChart3,
  FileText,
  Folder,
  Bell,
  Wallet,
} from "lucide-react";
import kontribLogo from "@assets/8_1764455185903.png";
import { OPS_PASS_KEY, opsFetch, formatDateTime, formatNgn, StatusPill } from "@/components/ops/ops-shared";
import { UsersPanel } from "@/components/ops/users-panel";
import { GroupsPanel } from "@/components/ops/groups-panel";
import { CustomTermsPanel } from "@/components/ops/custom-terms-panel";
import { KycPanel } from "@/components/ops/kyc-panel";
import { PushTestPanel } from "@/components/ops/push-test-panel";

function formatCurrency(n: number) {
  return formatNgn(n);
}
const fmtDate = formatDateTime;

type OpsVerificationData = {
  applications: Array<{
    id: string; status: string; state: string; lga: string;
    notes: string | null; submittedAt: string; decidedAt: string | null;
    group: { id: string; name: string; createdAt: string; memberCount: number; completedCycleCount: number };
    admin: { id: string; fullName: string | null; phoneNumber: string };
    officers: Array<{
      userId: string; fullName: string | null; phoneNumber: string;
      role: "admin" | "officer"; status: string;
      legalName: string | null; selfieUrl: string | null; respondedAt: string | null;
    }>;
    attestations: Array<{
      userId: string; fullName: string | null; phoneNumber: string;
      status: string; respondedAt: string | null;
    }>;
  }>;
};

type OpsData = {
  stats: {
    totalUsers: number;
    totalReferrals: number;
    completedReferrals: number;
    pendingReferrals: number;
    totalRewardsOwed: number;
    totalPaymentProofs: number;
    pendingProofs: number;
  };
  referrals: Array<{
    id: string;
    status: string;
    rewardAmount: string;
    createdAt: string;
    completedAt: string | null;
    paidAt?: string | null;
    paidBy?: string | null;
    referrer: { fullName: string | null; phoneNumber: string };
    referee: { fullName: string | null; phoneNumber: string };
  }>;
  contributions: Array<{
    id: string;
    userName: string;
    groupName: string;
    amount: string;
    status: string;
    paymentType: string;
    createdAt: string;
  }>;
};

function statusBadge(status: string) {
  const map: Record<string, { cls: string; label: string }> = {
    submitted: { cls: "bg-amber-500/20 text-amber-300", label: "Awaiting officers" },
    under_review: { cls: "bg-blue-500/20 text-blue-300", label: "Under review" },
    info_requested: { cls: "bg-purple-500/20 text-purple-300", label: "Info requested" },
    approved: { cls: "bg-green-500/20 text-green-300", label: "Approved" },
    rejected: { cls: "bg-red-500/20 text-red-300", label: "Rejected" },
  };
  const m = map[status] || { cls: "bg-gray-500/20 text-gray-300", label: status };
  return <Badge className={`${m.cls} border-0 text-xs`}>{m.label}</Badge>;
}

function daysSince(d: string) {
  const now = Date.now(); const then = new Date(d).getTime();
  return Math.max(0, Math.floor((now - then) / (1000 * 60 * 60 * 24)));
}

// ----- Verifications panel (Verified Ajo) — unchanged from earlier rounds.
function VerificationsPanel({
  password, data, isLoading, onChanged,
}: {
  password: string;
  data: OpsVerificationData | undefined;
  isLoading: boolean;
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const [filter, setFilter] = useState<"pending" | "all" | "approved" | "rejected">("pending");
  const [openId, setOpenId] = useState<string | null>(null);
  const [notesByApp, setNotesByApp] = useState<Record<string, string>>({});

  const decideMutation = useMutation({
    mutationFn: async ({ appId, decision, notes }: { appId: string; decision: "approve" | "reject" | "request_info"; notes?: string }) => {
      const res = await fetch(`/api/ops/verifications/${appId}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-ops-password": password },
        body: JSON.stringify({ decision, notes }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Failed" }));
        throw new Error(err.message || "Failed");
      }
      return res.json();
    },
    onSuccess: (_d, vars) => {
      toast({
        title:
          vars.decision === "approve" ? "Application approved" :
          vars.decision === "reject" ? "Application rejected" :
          "Info requested from admin",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/ops/verifications"] });
      onChanged();
    },
    onError: (err: any) => {
      toast({ title: "Failed", description: err?.message || "Could not save decision", variant: "destructive" });
    },
  });

  if (isLoading) return <div className="grid grid-cols-1 gap-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-gray-800 rounded-xl animate-pulse" />)}</div>;
  const apps = data?.applications || [];
  const filtered = apps.filter(a => {
    if (filter === "all") return true;
    if (filter === "pending") return a.status === "submitted" || a.status === "under_review" || a.status === "info_requested";
    return a.status === filter;
  });
  const counts = {
    pending: apps.filter(a => a.status === "submitted" || a.status === "under_review" || a.status === "info_requested").length,
    all: apps.length,
    approved: apps.filter(a => a.status === "approved").length,
    rejected: apps.filter(a => a.status === "rejected").length,
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto">
        {(["pending", "all", "approved", "rejected"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1 rounded-full capitalize whitespace-nowrap transition-colors ${filter === f ? "bg-primary text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}
            data-testid={`filter-verif-${f}`}>
            {f} ({counts[f]})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-10 text-gray-500">No applications</div>
      ) : filtered.map(app => {
        const isOpen = openId === app.id;
        const ageDays = daysSince(app.group.createdAt);
        const officersAccepted = app.officers.filter(o => o.status === "accepted").length;
        const officersTotal = app.officers.length;
        const vouches = app.attestations.filter(a => a.status === "vouched").length;
        const declines = app.attestations.filter(a => a.status === "declined").length;
        const meetsFloor = ageDays >= 30 && app.group.memberCount >= 10 && app.group.completedCycleCount >= 1;
        const decided = app.status === "approved" || app.status === "rejected";

        return (
          <Card key={app.id} className="bg-gray-900 border-gray-800" data-testid={`verification-card-${app.id}`}>
            <CardContent className="p-4 space-y-3">
              <button onClick={() => setOpenId(isOpen ? null : app.id)} className="w-full text-left">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm truncate">{app.group.name}</p>
                      {statusBadge(app.status)}
                    </div>
                    <p className="text-gray-400 text-xs mt-1 flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {app.lga}, {app.state}
                      <span className="text-gray-600 mx-1">·</span>
                      Submitted {fmtDate(app.submittedAt)} by {app.admin.fullName || app.admin.phoneNumber}
                    </p>
                  </div>
                  {isOpen ? <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />}
                </div>

                <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                  <div className={`rounded-md px-2 py-1.5 ${ageDays >= 30 ? "bg-green-500/10 text-green-300" : "bg-red-500/10 text-red-300"}`}>
                    Age: {ageDays}d {ageDays >= 30 ? "✓" : "✗"}
                  </div>
                  <div className={`rounded-md px-2 py-1.5 ${app.group.memberCount >= 10 ? "bg-green-500/10 text-green-300" : "bg-red-500/10 text-red-300"}`}>
                    Members: {app.group.memberCount} {app.group.memberCount >= 10 ? "✓" : "✗"}
                  </div>
                  <div className={`rounded-md px-2 py-1.5 ${app.group.completedCycleCount >= 1 ? "bg-green-500/10 text-green-300" : "bg-red-500/10 text-red-300"}`}>
                    Cycles: {app.group.completedCycleCount} {app.group.completedCycleCount >= 1 ? "✓" : "✗"}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                  <div className={`rounded-md px-2 py-1.5 ${officersAccepted === officersTotal && officersTotal > 0 ? "bg-green-500/10 text-green-300" : "bg-amber-500/10 text-amber-300"}`}>
                    Officers: {officersAccepted}/{officersTotal} accepted
                  </div>
                  <div className={`rounded-md px-2 py-1.5 ${vouches >= 5 ? "bg-green-500/10 text-green-300" : "bg-amber-500/10 text-amber-300"}`}>
                    Vouches: {vouches}{declines > 0 ? ` · ${declines} declined` : ""}
                  </div>
                </div>
                {!meetsFloor && (
                  <p className="text-amber-400 text-xs mt-2 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> Group does not yet meet baseline floor
                  </p>
                )}
              </button>

              {isOpen && (
                <div className="border-t border-gray-800 pt-3 space-y-4">
                  <div>
                    <p className="text-xs uppercase text-gray-500 font-medium mb-2">Officers ({officersTotal})</p>
                    <div className="space-y-2">
                      {app.officers.map(o => (
                        <div key={o.userId} className="flex items-center gap-3 bg-gray-950 rounded-md p-2">
                          {o.selfieUrl ? (
                            <a href={o.selfieUrl} target="_blank" rel="noreferrer">
                              <img src={o.selfieUrl} alt="Selfie" className="h-12 w-12 rounded-md object-cover border border-gray-800" />
                            </a>
                          ) : (
                            <div className="h-12 w-12 rounded-md bg-gray-800 flex items-center justify-center text-gray-600 text-xs">No selfie</div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium truncate">{o.legalName || o.fullName || "—"}</p>
                              <Badge className="bg-gray-800 text-gray-300 border-0 text-[10px] uppercase">{o.role}</Badge>
                            </div>
                            <p className="text-gray-500 text-xs">{o.phoneNumber} · {o.fullName ? `Profile: ${o.fullName}` : "no profile name"}</p>
                          </div>
                          <Badge className={`text-xs border-0 ${o.status === "accepted" ? "bg-green-500/20 text-green-300" : o.status === "declined" ? "bg-red-500/20 text-red-300" : "bg-amber-500/20 text-amber-300"}`}>
                            {o.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs uppercase text-gray-500 font-medium mb-2">Attesters ({app.attestations.length})</p>
                    <div className="space-y-1">
                      {app.attestations.map(a => (
                        <div key={a.userId} className="flex items-center justify-between text-sm bg-gray-950 rounded-md px-3 py-1.5">
                          <span className="truncate">{a.fullName || a.phoneNumber}</span>
                          <Badge className={`text-xs border-0 ${a.status === "vouched" ? "bg-green-500/20 text-green-300" : a.status === "declined" ? "bg-red-500/20 text-red-300" : "bg-amber-500/20 text-amber-300"}`}>
                            {a.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  {app.notes && (
                    <div className="bg-gray-950 rounded-md p-2 text-xs text-gray-400 whitespace-pre-wrap">
                      <span className="text-gray-500 font-medium">Last notes: </span>{app.notes}
                    </div>
                  )}

                  {!decided && (
                    <div className="space-y-2">
                      <Textarea
                        placeholder="Notes for the admin (sent with rejection / info request, optional on approval)"
                        value={notesByApp[app.id] || ""}
                        onChange={e => setNotesByApp(s => ({ ...s, [app.id]: e.target.value }))}
                        className="bg-gray-950 border-gray-800 text-white text-xs min-h-[60px]"
                        data-testid={`textarea-notes-${app.id}`}
                      />
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => decideMutation.mutate({ appId: app.id, decision: "approve", notes: notesByApp[app.id] })}
                          disabled={decideMutation.isPending}
                          className="bg-green-600 hover:bg-green-500 text-white text-xs font-medium px-3 py-1.5 rounded-md flex items-center gap-1 disabled:opacity-50"
                          data-testid={`button-approve-${app.id}`}>
                          <ShieldCheck className="h-3.5 w-3.5" /> Approve
                        </button>
                        <button
                          onClick={() => decideMutation.mutate({ appId: app.id, decision: "request_info", notes: notesByApp[app.id] })}
                          disabled={decideMutation.isPending}
                          className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium px-3 py-1.5 rounded-md flex items-center gap-1 disabled:opacity-50"
                          data-testid={`button-request-info-${app.id}`}>
                          <HelpCircle className="h-3.5 w-3.5" /> Request info
                        </button>
                        <button
                          onClick={() => decideMutation.mutate({ appId: app.id, decision: "reject", notes: notesByApp[app.id] })}
                          disabled={decideMutation.isPending}
                          className="bg-red-600 hover:bg-red-500 text-white text-xs font-medium px-3 py-1.5 rounded-md flex items-center gap-1 disabled:opacity-50"
                          data-testid={`button-reject-${app.id}`}>
                          <X className="h-3.5 w-3.5" /> Reject
                        </button>
                      </div>
                    </div>
                  )}
                  {decided && app.decidedAt && (
                    <p className="text-xs text-gray-500">Decided {fmtDate(app.decidedAt)}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ----- Referrals panel: extends existing list with mark-as-paid action -----
function ReferralsPanel({ data, actorId }: { data: OpsData; actorId: string }) {
  const { toast } = useToast();
  const [filter, setFilter] = useState<"all" | "complete" | "pending" | "unpaid">("unpaid");

  const markPaid = useMutation({
    mutationFn: async (id: string) => opsFetch("POST", `/api/ops/referrals/${id}/mark-paid`, { actorId }),
    onSuccess: () => {
      toast({ title: "Marked as paid" });
      queryClient.invalidateQueries({ queryKey: ["/api/ops/overview"] });
    },
    onError: (err: any) => toast({ title: "Failed", description: err?.message, variant: "destructive" }),
  });
  const unmarkPaid = useMutation({
    mutationFn: async (id: string) => opsFetch("POST", `/api/ops/referrals/${id}/unmark-paid`),
    onSuccess: () => {
      toast({ title: "Payment record removed" });
      queryClient.invalidateQueries({ queryKey: ["/api/ops/overview"] });
    },
    onError: (err: any) => toast({ title: "Failed", description: err?.message, variant: "destructive" }),
  });

  const referrals = data.referrals || [];
  const filtered = referrals.filter(r => {
    if (filter === "all") return true;
    if (filter === "unpaid") return r.status === "complete" && !r.paidAt;
    if (filter === "complete") return r.status === "complete";
    return r.status === filter;
  });
  const counts = {
    all: referrals.length,
    complete: referrals.filter(r => r.status === "complete").length,
    pending: referrals.filter(r => r.status === "pending").length,
    unpaid: referrals.filter(r => r.status === "complete" && !r.paidAt).length,
  };
  const owed = counts.unpaid * 20000;

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        {(["unpaid", "complete", "pending", "all"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1 rounded-full capitalize transition-colors ${filter === f ? "bg-primary text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}
            data-testid={`filter-ref-${f}`}
          >
            {f === "unpaid" ? "Owed" : f} ({counts[f]})
          </button>
        ))}
      </div>

      {counts.unpaid > 0 && (
        <div className="bg-amber-500/10 border border-amber-700/40 rounded-lg px-3 py-2 text-sm text-amber-200">
          {counts.unpaid} reward{counts.unpaid === 1 ? "" : "s"} to pay out · {formatCurrency(owed)}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-10 text-gray-500">No referrals match this filter</div>
      ) : filtered.map(r => (
        <Card key={r.id} className="bg-gray-900 border-gray-800">
          <CardContent className="p-4 flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 text-sm">
                <span className="font-medium text-white">{r.referrer.fullName || r.referrer.phoneNumber}</span>
                <span className="text-gray-500 text-xs">referred</span>
                <span className="font-medium text-white">{r.referee.fullName || r.referee.phoneNumber}</span>
              </div>
              <p className="text-gray-500 text-xs mt-0.5">
                {fmtDate(r.createdAt)}
                {r.completedAt && ` · Completed ${fmtDate(r.completedAt)}`}
                {r.paidAt && ` · Paid ${fmtDate(r.paidAt)}`}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {r.status === "complete" ? (
                r.paidAt ? (
                  <>
                    <Badge className="bg-blue-500/20 text-blue-300 border-0 text-xs"><CheckCircle2 className="h-3 w-3 mr-1" />Paid</Badge>
                    <button
                      onClick={() => unmarkPaid.mutate(r.id)}
                      disabled={unmarkPaid.isPending}
                      className="text-[10px] text-gray-500 hover:text-gray-300 underline"
                      data-testid={`button-ref-unpay-${r.id}`}
                    >undo</button>
                  </>
                ) : (
                  <>
                    <span className="text-green-400 text-xs font-bold">{formatCurrency(parseFloat(r.rewardAmount))}</span>
                    <button
                      onClick={() => markPaid.mutate(r.id)}
                      disabled={markPaid.isPending}
                      className="bg-primary hover:bg-primary/90 text-white text-xs font-medium px-3 py-1.5 rounded-md flex items-center gap-1"
                      data-testid={`button-ref-pay-${r.id}`}
                    >
                      <Wallet className="h-3 w-3" /> Mark as paid
                    </button>
                  </>
                )
              ) : (
                <Badge className="bg-amber-500/20 text-amber-300 border-0 text-xs"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ----- Section nav config -----------------------------------------------
type SectionKey = "overview" | "kyc" | "tc" | "verifications" | "users" | "groups" | "payments" | "referrals" | "push";

const SECTIONS: Array<{ key: SectionKey; label: string; icon: any }> = [
  { key: "overview", label: "Overview", icon: BarChart3 },
  { key: "kyc", label: "Admin KYC", icon: ShieldCheck },
  { key: "tc", label: "Custom T&C", icon: FileText },
  { key: "verifications", label: "Verified Ajo", icon: CheckCircle2 },
  { key: "users", label: "Users", icon: UsersIcon },
  { key: "groups", label: "Groups", icon: Folder },
  { key: "payments", label: "Payments", icon: CreditCard },
  { key: "referrals", label: "Referrals", icon: Gift },
  { key: "push", label: "Push test", icon: Bell },
];

export default function Ops() {
  const currentUser = getCurrentUser();
  const actorId = currentUser?.id || "ops";

  const [password, setPassword] = useState(() => sessionStorage.getItem(OPS_PASS_KEY) || "");
  const [inputPassword, setInputPassword] = useState("");
  const [nonce, setNonce] = useState(0);
  const [authError, setAuthError] = useState(false);
  const [section, setSection] = useState<SectionKey>("overview");

  const { data, isLoading, isError, refetch } = useQuery<OpsData>({
    queryKey: ["/api/ops/overview", password, nonce],
    queryFn: async () => {
      const res = await fetch(`/api/ops/overview`, { headers: { "x-ops-password": password } });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Failed" }));
        throw new Error(err.message || "Failed");
      }
      return res.json();
    },
    enabled: !!password,
    retry: false,
  });

  const verifications = useQuery<OpsVerificationData>({
    queryKey: ["/api/ops/verifications", password, nonce],
    queryFn: async () => {
      const res = await fetch(`/api/ops/verifications`, { headers: { "x-ops-password": password } });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!password,
    retry: false,
  });

  // Lightweight queue size queries (cheap; refresh whenever the shell mounts).
  const kycQueue = useQuery<{ pending: any[] }>({
    queryKey: ["/api/ops/admin-kyc/pending", "shellbadge"],
    queryFn: () => opsFetch("GET", "/api/ops/admin-kyc/pending"),
    enabled: !!password,
  });
  const tcQueue = useQuery<{ terms: any[] }>({
    queryKey: ["/api/ops/custom-terms/pending", "shellbadge"],
    queryFn: () => opsFetch("GET", "/api/ops/custom-terms/pending"),
    enabled: !!password,
  });

  // Auth failures bounce back to the lock screen.
  useEffect(() => {
    if (isError) {
      sessionStorage.removeItem(OPS_PASS_KEY);
      setAuthError(true);
      setPassword("");
    }
  }, [isError]);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPassword.trim()) return;
    setAuthError(false);
    sessionStorage.setItem(OPS_PASS_KEY, inputPassword);
    setPassword(inputPassword);
    setNonce(n => n + 1);
    setInputPassword("");
  };

  const handleLock = () => {
    sessionStorage.removeItem(OPS_PASS_KEY);
    setPassword("");
    setAuthError(false);
  };

  // ---- Lock screen ------------------------------------------------------
  if (!password) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="flex items-center justify-center gap-3 mb-8">
            <img src={kontribLogo} alt="Kontrib" className="w-10 h-10" />
            <div>
              <p className="font-bold text-white text-lg">Kontrib Ops</p>
              <p className="text-gray-400 text-xs">Internal Dashboard</p>
            </div>
          </div>
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-center w-12 h-12 bg-primary/20 rounded-full mx-auto mb-4">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              <p className="text-white text-center font-semibold mb-1">Team access only</p>
              <p className="text-gray-400 text-sm text-center mb-5">Enter your ops password to continue</p>
              <form onSubmit={handleUnlock} className="space-y-3">
                <Input
                  type="password"
                  placeholder="Ops password"
                  value={inputPassword}
                  onChange={e => setInputPassword(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                  autoFocus
                  data-testid="input-ops-password"
                />
                <button
                  type="submit"
                  className="w-full bg-primary text-white font-semibold py-2.5 rounded-lg hover:bg-primary/90 transition-colors"
                  data-testid="button-ops-unlock"
                >
                  Unlock
                </button>
                {authError && <p className="text-red-400 text-xs text-center">Incorrect password. Please try again.</p>}
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ---- Shell layout -----------------------------------------------------
  const queueBadges: Partial<Record<SectionKey, number>> = {
    kyc: kycQueue.data?.pending?.length ?? 0,
    tc: tcQueue.data?.terms?.length ?? 0,
    verifications: (verifications.data?.applications || []).filter(
      a => a.status === "submitted" || a.status === "under_review" || a.status === "info_requested"
    ).length,
    payments: data?.stats?.pendingProofs ?? 0,
    referrals: (data?.referrals || []).filter(r => r.status === "complete" && !(r as any).paidAt).length,
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <img src={kontribLogo} alt="Kontrib" className="w-8 h-8" />
          <div>
            <p className="font-bold text-sm">Kontrib Ops</p>
            <p className="text-gray-400 text-xs">{currentUser?.fullName ? `Acting as ${currentUser.fullName}` : "Live dashboard"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { refetch(); verifications.refetch(); kycQueue.refetch(); tcQueue.refetch(); }}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400"
            title="Refresh"
            data-testid="button-ops-refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={handleLock}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white border border-gray-700 rounded-lg px-3 py-1.5"
            data-testid="button-ops-lock"
          >
            <Lock className="h-3.5 w-3.5" />
            Lock
          </button>
        </div>
      </div>

      {/* Section nav (horizontal pill bar that scrolls on small screens) */}
      <div className="bg-gray-900/60 border-b border-gray-800 px-4 py-2 sticky top-[57px] z-10 overflow-x-auto">
        <div className="flex gap-1.5 min-w-max">
          {SECTIONS.map(s => {
            const Icon = s.icon;
            const badge = queueBadges[s.key];
            const active = section === s.key;
            return (
              <button
                key={s.key}
                onClick={() => setSection(s.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  active ? "bg-primary text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
                data-testid={`nav-ops-${s.key}`}
              >
                <Icon className="h-3.5 w-3.5" />
                {s.label}
                {badge !== undefined && badge > 0 && (
                  <span className={`ml-0.5 text-[10px] font-bold rounded-full px-1.5 ${active ? "bg-white/20" : "bg-amber-500/20 text-amber-300"}`}>
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {section === "overview" && (
          <>
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[1,2,3,4].map(i => <div key={i} className="h-20 bg-gray-800 rounded-xl animate-pulse" />)}
              </div>
            ) : data && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Total Users", value: data.stats.totalUsers, icon: UsersIcon, color: "text-blue-400" },
                    { label: "Rewards Owed", value: formatCurrency(data.stats.totalRewardsOwed), icon: Banknote, color: "text-green-400" },
                    { label: "Pending Proofs", value: data.stats.pendingProofs, icon: CreditCard, color: "text-amber-400" },
                    { label: "Completed Referrals", value: data.stats.completedReferrals, icon: Gift, color: "text-purple-400" },
                  ].map(({ label, value, icon: Icon, color }) => (
                    <Card key={label} className="bg-gray-900 border-gray-800">
                      <CardContent className="p-4">
                        <Icon className={`h-5 w-5 ${color} mb-2`} />
                        <p className="text-xl font-bold">{value}</p>
                        <p className="text-gray-400 text-xs mt-0.5">{label}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Card className="bg-gray-900 border-gray-800">
                  <CardContent className="p-4 space-y-3">
                    <p className="text-sm font-semibold text-white">Operations queues</p>
                    <ul className="space-y-1.5 text-sm">
                      <QueueLink label="Admin KYC waiting" count={queueBadges.kyc ?? 0} onClick={() => setSection("kyc")} />
                      <QueueLink label="Custom T&C PDFs to moderate" count={queueBadges.tc ?? 0} onClick={() => setSection("tc")} />
                      <QueueLink label="Verified-Ajo applications" count={queueBadges.verifications ?? 0} onClick={() => setSection("verifications")} />
                      <QueueLink label="Pending payment proofs" count={queueBadges.payments ?? 0} onClick={() => setSection("payments")} />
                      <QueueLink label="Referral rewards owed" count={queueBadges.referrals ?? 0} onClick={() => setSection("referrals")} />
                    </ul>
                  </CardContent>
                </Card>
              </>
            )}
          </>
        )}

        {section === "kyc" && <KycPanel actorId={actorId} />}
        {section === "tc" && <CustomTermsPanel actorId={actorId} />}
        {section === "verifications" && (
          <VerificationsPanel
            password={password}
            data={verifications.data}
            isLoading={verifications.isLoading}
            onChanged={() => verifications.refetch()}
          />
        )}
        {section === "users" && <UsersPanel actorId={actorId} />}
        {section === "groups" && <GroupsPanel actorId={actorId} />}

        {section === "payments" && data && (
          <div className="space-y-2">
            {data.contributions.length === 0 ? (
              <div className="text-center py-10 text-gray-500">No payment proofs yet</div>
            ) : data.contributions.map(c => (
              <Card key={c.id} className="bg-gray-900 border-gray-800">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{c.userName}</p>
                      <span className="text-gray-500 text-xs">·</span>
                      <p className="text-gray-400 text-xs truncate">{c.groupName}</p>
                    </div>
                    <p className="text-gray-500 text-xs mt-0.5">{fmtDate(c.createdAt)} · {c.paymentType.replace(/_/g, " ")}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-sm">₦{parseFloat(c.amount).toLocaleString()}</p>
                    {c.status === "pending" ? (
                      <Badge className="bg-amber-500/20 text-amber-300 border-0 text-xs mt-1">
                        <Clock className="h-3 w-3 mr-1" />Pending
                      </Badge>
                    ) : c.status === "confirmed" ? (
                      <Badge className="bg-green-500/20 text-green-300 border-0 text-xs mt-1">
                        <CheckCircle2 className="h-3 w-3 mr-1" />Confirmed
                      </Badge>
                    ) : (
                      <Badge className="bg-red-500/20 text-red-300 border-0 text-xs mt-1">
                        <AlertCircle className="h-3 w-3 mr-1" />{c.status}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {section === "referrals" && data && <ReferralsPanel data={data} actorId={actorId} />}
        {section === "push" && <PushTestPanel />}
      </div>
    </div>
  );
}

function QueueLink({ label, count, onClick }: { label: string; count: number; onClick: () => void }) {
  return (
    <li>
      <button
        onClick={onClick}
        className="w-full flex items-center justify-between bg-gray-950 hover:bg-gray-800 rounded-md px-3 py-2 transition-colors"
      >
        <span className="text-gray-300">{label}</span>
        <span className={`text-xs font-bold rounded-full px-2 py-0.5 ${count > 0 ? "bg-amber-500/20 text-amber-300" : "bg-gray-800 text-gray-500"}`}>
          {count}
        </span>
      </button>
    </li>
  );
}
