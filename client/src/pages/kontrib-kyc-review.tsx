import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ShieldCheck, AlertCircle, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getCurrentUser } from "@/lib/auth";
import type { AdminKycPendingEntry } from "@shared/schema";

const SUPERADMIN_ID = (import.meta.env.VITE_KONTRIB_SUPERADMIN_USER_ID as string) || "";

export default function KontribKycReviewPage() {
  const user = getCurrentUser();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [notesByUser, setNotesByUser] = useState<Record<string, string>>({});

  const isSuperadmin = !!SUPERADMIN_ID && !!user && user.id === SUPERADMIN_ID;

  const { data: pending, isLoading } = useQuery<AdminKycPendingEntry[]>({
    queryKey: ["/api/admin-kyc/pending", user?.id],
    queryFn: async () => {
      const r = await fetch(`/api/admin-kyc/pending?actorId=${user?.id}`);
      if (!r.ok) throw new Error("Failed to fetch pending KYC");
      return r.json();
    },
    enabled: isSuperadmin,
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ userId, decision }: { userId: string; decision: "approved" | "rejected" }) => {
      const res = await apiRequest("POST", `/api/admin-kyc/${userId}/review`, {
        actorId: user?.id,
        decision,
        reviewerNotes: notesByUser[userId] || undefined,
      });
      return res.json();
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["/api/admin-kyc/pending", user?.id] });
      toast({
        title: vars.decision === "approved" ? "KYC approved" : "KYC rejected",
      });
    },
    onError: (err: any) => {
      toast({ title: "Review failed", description: err?.message, variant: "destructive" });
    },
  });

  if (!isSuperadmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="max-w-md mx-auto px-4 py-12 text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-gray-900">403 — Kontrib team only</h1>
          <p className="text-sm text-gray-500 mt-2">
            This page is reserved for the Kontrib review team.
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <Navigation />
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-emerald-600" />
          <h1 className="text-2xl font-bold text-gray-900">Admin KYC Review</h1>
        </div>
        <p className="text-sm text-gray-500">
          Pending submissions from Ajo group admins. Approve or reject after
          checking the photos and ID.
        </p>

        {isLoading && (
          <div className="flex items-center gap-2 text-gray-500 py-8 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        )}

        {!isLoading && (!pending || pending.length === 0) && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500">
            No pending submissions.
          </div>
        )}

        {pending?.map((entry) => (
          <div
            key={entry.userId}
            className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4"
            data-testid={`kyc-entry-${entry.userId}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-gray-900">{entry.user.fullName || "(no display name)"}</h2>
                <p className="text-xs text-gray-500">{entry.user.phoneNumber}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Name on ID: <span className="font-medium text-gray-800">{entry.govNameOnId || "—"}</span>
                </p>
                <p className="text-xs text-gray-400">
                  Submitted: {entry.submittedAt ? new Date(entry.submittedAt).toLocaleString() : "—"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {entry.profilePhotoUrl && (
                <a href={entry.profilePhotoUrl} target="_blank" rel="noreferrer" className="block">
                  <p className="text-xs text-gray-500 mb-1">Profile</p>
                  <img src={entry.profilePhotoUrl} alt="profile" className="w-full h-32 object-cover rounded-lg border" />
                </a>
              )}
              {entry.idDocUrl && (
                <a href={entry.idDocUrl} target="_blank" rel="noreferrer" className="block">
                  <p className="text-xs text-gray-500 mb-1">ID document</p>
                  <img src={entry.idDocUrl} alt="id" className="w-full h-32 object-cover rounded-lg border" />
                </a>
              )}
              {entry.kycSelfieUrl && (
                <a href={entry.kycSelfieUrl} target="_blank" rel="noreferrer" className="block">
                  <p className="text-xs text-gray-500 mb-1">Selfie with ID</p>
                  <img src={entry.kycSelfieUrl} alt="selfie" className="w-full h-32 object-cover rounded-lg border" />
                </a>
              )}
            </div>

            <Textarea
              placeholder="Reviewer notes (shown to admin if rejected)"
              value={notesByUser[entry.userId] || ""}
              onChange={(e) => setNotesByUser((p) => ({ ...p, [entry.userId]: e.target.value }))}
              className="rounded-lg border-2 border-gray-200"
              rows={2}
              data-testid={`textarea-notes-${entry.userId}`}
            />

            <div className="flex gap-2">
              <Button
                onClick={() => reviewMutation.mutate({ userId: entry.userId, decision: "approved" })}
                disabled={reviewMutation.isPending}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                data-testid={`btn-approve-${entry.userId}`}
              >
                Approve
              </Button>
              <Button
                onClick={() => reviewMutation.mutate({ userId: entry.userId, decision: "rejected" })}
                disabled={reviewMutation.isPending}
                variant="outline"
                className="flex-1 border-red-300 text-red-700 hover:bg-red-50 rounded-lg"
                data-testid={`btn-reject-${entry.userId}`}
              >
                Reject
              </Button>
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
