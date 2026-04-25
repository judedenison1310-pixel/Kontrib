// Phase 4 — Admin KYC review inside the unified ops shell.
// Mirrors /kontrib/kyc-review functionality but uses the OPS_PASSWORD-gated
// /api/ops/admin-kyc/* endpoints so the same shell can serve any ops member.

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, Loader2, Check, X, ExternalLink } from "lucide-react";
import { opsFetch, formatDateTime } from "./ops-shared";

type Pending = {
  userId: string;
  status: string;
  govNameOnId: string | null;
  profilePhotoUrl: string | null;
  idDocUrl: string | null;
  kycSelfieUrl: string | null;
  submittedAt: string | null;
  user: { id: string; fullName: string | null; phoneNumber: string };
};

export function KycPanel({ actorId }: { actorId: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [notes, setNotes] = useState<Record<string, string>>({});

  const list = useQuery<{ pending: Pending[] }>({
    queryKey: ["/api/ops/admin-kyc/pending"],
    queryFn: () => opsFetch("GET", "/api/ops/admin-kyc/pending"),
  });

  const reviewMut = useMutation({
    mutationFn: async (vars: { userId: string; decision: "approved" | "rejected"; reviewerNotes?: string }) =>
      opsFetch("POST", `/api/ops/admin-kyc/${vars.userId}/review`, {
        actorId,
        decision: vars.decision,
        reviewerNotes: vars.reviewerNotes,
      }),
    onSuccess: (_d, v) => {
      toast({ title: v.decision === "approved" ? "KYC approved" : "KYC rejected" });
      qc.invalidateQueries({ queryKey: ["/api/ops/admin-kyc/pending"] });
      setNotes(prev => { const n = { ...prev }; delete n[v.userId]; return n; });
    },
    onError: (err: any) => toast({ title: "Review failed", description: err?.message, variant: "destructive" }),
  });

  if (list.isLoading) return <p className="text-gray-400 text-sm">Loading queue…</p>;

  const items = list.data?.pending || [];
  if (items.length === 0) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-10 text-center text-gray-400">
          <ShieldCheck className="h-10 w-10 mx-auto mb-3 text-gray-600" />
          <p className="font-semibold text-white">No pending KYC submissions</p>
          <p className="text-sm mt-1">When admins submit identity documents, they'll appear here for review.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">{items.length} pending submission{items.length === 1 ? "" : "s"}</p>
      {items.map(p => {
        const isBusy = reviewMut.isPending && reviewMut.variables?.userId === p.userId;
        return (
          <Card key={p.userId} className="bg-gray-900 border-gray-800" data-testid={`row-kyc-${p.userId}`}>
            <CardContent className="p-4 space-y-3">
              <div>
                <p className="font-medium text-white">{p.user.fullName || "(no name on profile)"}</p>
                <p className="text-gray-400 text-xs">{p.user.phoneNumber} · submitted {formatDateTime(p.submittedAt)}</p>
                {p.govNameOnId && (
                  <p className="text-gray-300 text-sm mt-1">Name on ID: <span className="font-medium text-white">{p.govNameOnId}</span></p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <DocThumb label="Profile photo" url={p.profilePhotoUrl} userId={p.userId} kind="profile" />
                <DocThumb label="ID document" url={p.idDocUrl} userId={p.userId} kind="iddoc" />
                <DocThumb label="Selfie w/ ID" url={p.kycSelfieUrl} userId={p.userId} kind="selfie" />
              </div>

              <Textarea
                value={notes[p.userId] || ""}
                onChange={e => setNotes(prev => ({ ...prev, [p.userId]: e.target.value }))}
                placeholder="Reviewer notes (required for rejection)"
                className="bg-gray-800 border-gray-700 text-white text-sm"
                rows={2}
                data-testid={`textarea-kyc-notes-${p.userId}`}
              />

              <div className="flex gap-2">
                <Button
                  onClick={() => reviewMut.mutate({ userId: p.userId, decision: "approved", reviewerNotes: notes[p.userId]?.trim() || undefined })}
                  disabled={reviewMut.isPending}
                  className="bg-green-600 hover:bg-green-700 text-white flex-1"
                  data-testid={`button-kyc-approve-${p.userId}`}
                >
                  {isBusy && reviewMut.variables?.decision === "approved" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                  Approve
                </Button>
                <Button
                  onClick={() => reviewMut.mutate({ userId: p.userId, decision: "rejected", reviewerNotes: notes[p.userId]?.trim() })}
                  disabled={reviewMut.isPending || !(notes[p.userId] || "").trim()}
                  className="bg-red-600 hover:bg-red-700 text-white flex-1"
                  data-testid={`button-kyc-reject-${p.userId}`}
                >
                  {isBusy && reviewMut.variables?.decision === "rejected" ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4 mr-1" />}
                  Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function DocThumb({ label, url, userId, kind }: { label: string; url: string | null; userId: string; kind: string }) {
  if (!url) return (
    <div className="bg-gray-800 rounded-lg p-3 text-center text-gray-600 text-xs h-full flex flex-col items-center justify-center">
      <p>—</p>
      <p className="text-[10px] mt-1">{label}</p>
    </div>
  );
  return (
    <a href={url} target="_blank" rel="noreferrer" className="block bg-gray-800 hover:bg-gray-700 rounded-lg p-2 text-center" data-testid={`link-kyc-${kind}-${userId}`}>
      <img src={url} alt={label} className="w-full h-24 object-cover rounded mb-1" />
      <p className="text-[10px] text-gray-300 flex items-center justify-center gap-1"><ExternalLink className="h-2.5 w-2.5" /> {label}</p>
    </a>
  );
}
