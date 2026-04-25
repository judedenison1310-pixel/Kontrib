// Phase 4 — Custom T&C PDF moderation queue.
// Lists groups whose admins uploaded their own terms PDF; ops can preview the
// PDF and approve or reject (rejection requires a note).

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { FileText, Check, X, ExternalLink, Loader2 } from "lucide-react";
import { opsFetch, formatDateTime } from "./ops-shared";

type Entry = {
  groupId: string; groupName: string; groupType: string;
  customTcUrl: string; customTcStatus: string;
  customTcReviewNote: string | null; customTcReviewedAt: string | null;
  uploadedAt: string;
  admin: { id: string; fullName: string | null; phoneNumber: string };
};
type ListResp = { terms: Entry[] };

export function CustomTermsPanel({ actorId }: { actorId: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [notes, setNotes] = useState<Record<string, string>>({});

  const list = useQuery<ListResp>({
    queryKey: ["/api/ops/custom-terms/pending"],
    queryFn: () => opsFetch("GET", "/api/ops/custom-terms/pending"),
  });

  const reviewMut = useMutation({
    mutationFn: async (vars: { groupId: string; decision: "approve" | "reject"; note?: string }) =>
      opsFetch("POST", `/api/ops/custom-terms/${vars.groupId}/review`, {
        decision: vars.decision,
        note: vars.note,
        actorId,
      }),
    onSuccess: (_d, vars) => {
      toast({ title: vars.decision === "approve" ? "T&C approved" : "T&C rejected" });
      qc.invalidateQueries({ queryKey: ["/api/ops/custom-terms/pending"] });
      setNotes(prev => { const n = { ...prev }; delete n[vars.groupId]; return n; });
    },
    onError: (err: any) => toast({ title: "Review failed", description: err?.message, variant: "destructive" }),
  });

  if (list.isLoading) return <p className="text-gray-400 text-sm">Loading queue…</p>;

  const items = list.data?.terms || [];
  if (items.length === 0) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-10 text-center text-gray-400">
          <FileText className="h-10 w-10 mx-auto mb-3 text-gray-600" />
          <p className="font-semibold text-white">No pending custom T&C</p>
          <p className="text-sm mt-1">When admins upload their own group terms, they'll appear here for review.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">{items.length} pending submission{items.length === 1 ? "" : "s"}</p>
      {items.map(t => (
        <Card key={t.groupId} className="bg-gray-900 border-gray-800" data-testid={`row-tc-${t.groupId}`}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-amber-400 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white">{t.groupName}</p>
                <p className="text-gray-400 text-xs capitalize">{t.groupType} · admin {t.admin.fullName || t.admin.phoneNumber}</p>
                <p className="text-gray-500 text-xs mt-0.5">Uploaded {formatDateTime(t.uploadedAt)}</p>
              </div>
            </div>

            <a
              href={t.customTcUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-blue-400 hover:underline"
              data-testid={`link-tc-pdf-${t.groupId}`}
            >
              <ExternalLink className="h-3.5 w-3.5" /> Open uploaded PDF
            </a>

            <Textarea
              value={notes[t.groupId] || ""}
              onChange={e => setNotes(prev => ({ ...prev, [t.groupId]: e.target.value }))}
              placeholder="Optional approval note · required for rejection (e.g. PDF is unreadable, contains predatory clauses)"
              className="bg-gray-800 border-gray-700 text-white text-sm"
              rows={3}
              data-testid={`textarea-tc-note-${t.groupId}`}
            />

            <div className="flex gap-2">
              <Button
                onClick={() => reviewMut.mutate({ groupId: t.groupId, decision: "approve", note: notes[t.groupId]?.trim() || undefined })}
                disabled={reviewMut.isPending}
                className="bg-green-600 hover:bg-green-700 text-white flex-1"
                data-testid={`button-tc-approve-${t.groupId}`}
              >
                {reviewMut.isPending && reviewMut.variables?.groupId === t.groupId && reviewMut.variables?.decision === "approve" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                Approve
              </Button>
              <Button
                onClick={() => reviewMut.mutate({ groupId: t.groupId, decision: "reject", note: notes[t.groupId]?.trim() })}
                disabled={reviewMut.isPending || !(notes[t.groupId] || "").trim()}
                className="bg-red-600 hover:bg-red-700 text-white flex-1"
                data-testid={`button-tc-reject-${t.groupId}`}
              >
                {reviewMut.isPending && reviewMut.variables?.groupId === t.groupId && reviewMut.variables?.decision === "reject" ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4 mr-1" />}
                Reject
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
