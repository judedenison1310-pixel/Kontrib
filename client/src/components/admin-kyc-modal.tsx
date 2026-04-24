import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShieldCheck, Clock, CheckCircle2, XCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getCurrentUser } from "@/lib/auth";
import { KycFileField } from "@/components/kyc-file-field";
import type { AdminKycView } from "@shared/schema";

interface AdminKycModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdminKycModal({ open, onOpenChange }: AdminKycModalProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const actor = getCurrentUser();

  const [govNameOnId, setGovNameOnId] = useState("");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [idDocUrl, setIdDocUrl] = useState<string | null>(null);
  const [kycSelfieUrl, setKycSelfieUrl] = useState<string | null>(null);

  const { data: kyc, isLoading } = useQuery<AdminKycView>({
    queryKey: ["/api/users", actor?.id, "admin-kyc"],
    queryFn: async () => {
      const r = await fetch(`/api/users/${actor?.id}/admin-kyc`);
      if (!r.ok) throw new Error("Failed to fetch KYC");
      return r.json();
    },
    enabled: !!actor?.id && open,
  });

  // Pre-fill the form from existing KYC values whenever the sheet opens.
  useEffect(() => {
    if (open && kyc) {
      setGovNameOnId(kyc.govNameOnId || "");
      setProfilePhotoUrl(kyc.profilePhotoUrl || null);
      setIdDocUrl(kyc.idDocUrl || null);
      setKycSelfieUrl(kyc.kycSelfieUrl || null);
    }
  }, [open, kyc]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/users/${actor?.id}/admin-kyc`, {
        actorId: actor?.id,
        govNameOnId: govNameOnId.trim(),
        profilePhotoUrl,
        idDocUrl,
        kycSelfieUrl,
      });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/users", actor?.id, "admin-kyc"] });
      toast({
        title: "KYC submitted",
        description: "Our team will review and let you know shortly.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Could not submit",
        description: err?.message || "Please check your details.",
        variant: "destructive",
      });
    },
  });

  const status = kyc?.status || "none";
  const canSubmit =
    govNameOnId.trim().length >= 3 &&
    !!profilePhotoUrl &&
    !!idDocUrl &&
    !!kycSelfieUrl &&
    !submitMutation.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[92vh] rounded-t-3xl p-0">
        <div className="flex flex-col h-full">
          <SheetHeader className="px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenChange(false)}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                data-testid="button-kyc-back"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back</span>
              </button>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="h-6 w-6 text-emerald-600" />
                <h2 className="text-2xl font-bold text-gray-900">Verify your identity</h2>
              </div>
              <p className="text-sm text-gray-500">
                Ajo handles real money on your members' behalf. Before you can
                start collecting, our team needs to confirm who you are.
              </p>
            </div>

            {isLoading ? (
              <p className="text-sm text-gray-500">Loading…</p>
            ) : status === "pending" ? (
              <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-5 w-5 text-amber-700" />
                  <h3 className="font-semibold text-amber-900">Awaiting review</h3>
                </div>
                <p className="text-sm text-amber-800">
                  Submitted on{" "}
                  {kyc?.submittedAt ? new Date(kyc.submittedAt).toLocaleString() : "—"}.
                  We usually reply within 1 business day.
                </p>
              </div>
            ) : status === "approved" ? (
              <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                  <h3 className="font-semibold text-emerald-900">Verified</h3>
                </div>
                <p className="text-sm text-emerald-800">
                  You're cleared to start Ajo cycles.
                </p>
              </div>
            ) : status === "rejected" ? (
              <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-700" />
                  <h3 className="font-semibold text-red-900">Not approved</h3>
                </div>
                {kyc?.reviewerNotes && (
                  <p className="text-sm text-red-800">Reason: {kyc.reviewerNotes}</p>
                )}
                <p className="text-sm text-red-800">
                  Update the details below and submit again.
                </p>
              </div>
            ) : null}

            {/* Show form unless awaiting review or approved */}
            {status !== "pending" && status !== "approved" && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">
                    Full name as it appears on your ID
                  </Label>
                  <Input
                    placeholder="e.g. Jideofor Chinedu Okoro"
                    value={govNameOnId}
                    onChange={(e) => setGovNameOnId(e.target.value)}
                    className="h-12 rounded-xl border-2 border-gray-200 focus:border-emerald-500"
                    data-testid="input-kyc-gov-name"
                  />
                </div>

                <KycFileField
                  label="Profile photo"
                  helper="A clear head-and-shoulders photo of you."
                  value={profilePhotoUrl}
                  onChange={setProfilePhotoUrl}
                  buttonLabel="Upload profile photo"
                  testId="kyc-profile-photo"
                />

                <KycFileField
                  label="Government ID document"
                  helper="NIN slip, driver's license, or international passport."
                  value={idDocUrl}
                  onChange={setIdDocUrl}
                  buttonLabel="Upload ID document"
                  testId="kyc-id-doc"
                />

                <KycFileField
                  label="Selfie holding your ID"
                  helper="So we can match the photo on your ID to you."
                  value={kycSelfieUrl}
                  onChange={setKycSelfieUrl}
                  buttonLabel="Upload selfie with ID"
                  testId="kyc-selfie"
                />
              </div>
            )}
          </div>

          {status !== "pending" && status !== "approved" && (
            <div className="border-t border-gray-100 px-5 py-4 bg-white">
              <Button
                onClick={() => submitMutation.mutate()}
                disabled={!canSubmit}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-base h-12 rounded-full"
                data-testid="button-submit-kyc"
              >
                {submitMutation.isPending ? "Submitting..." : "Submit for review"}
              </Button>
            </div>
          )}

          {status === "approved" && (
            <div className="border-t border-gray-100 px-5 py-4 bg-white">
              <Button
                onClick={() => onOpenChange(false)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-base h-12 rounded-full"
                data-testid="button-kyc-done"
              >
                Done
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
