import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, FileText, Upload, ShieldAlert } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getCurrentUser } from "@/lib/auth";
import { KycFileField } from "@/components/kyc-file-field";
import { KONTRIB_GENERIC_TC, KONTRIB_INDEMNITY } from "@/lib/legal";
import type { GroupTermsView } from "@shared/schema";

interface GroupTermsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  groupName: string;
}

type Choice = "kontrib" | "custom" | null;

export function GroupTermsModal({ open, onOpenChange, groupId, groupName }: GroupTermsModalProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const actor = getCurrentUser();

  const [choice, setChoice] = useState<Choice>(null);
  const [customTcUrl, setCustomTcUrl] = useState<string | null>(null);
  const [indemnityAccepted, setIndemnityAccepted] = useState(false);

  const { data: existing } = useQuery<GroupTermsView>({
    queryKey: ["/api/groups", groupId, "terms"],
    queryFn: async () => {
      const r = await fetch(`/api/groups/${groupId}/terms`);
      if (!r.ok) throw new Error("Failed to fetch terms");
      return r.json();
    },
    enabled: open,
  });

  // Pre-fill the form from any existing terms config when the sheet opens.
  useEffect(() => {
    if (open && existing) {
      if (existing.tcMode === "kontrib") setChoice("kontrib");
      else if (existing.tcMode === "custom") {
        setChoice("custom");
        setCustomTcUrl(existing.customTcUrl || null);
        setIndemnityAccepted(true);
      } else {
        setChoice(null);
        setCustomTcUrl(null);
        setIndemnityAccepted(false);
      }
    }
  }, [open, existing]);

  const setTermsMutation = useMutation({
    mutationFn: async () => {
      const payload =
        choice === "kontrib"
          ? { actorId: actor?.id, tcMode: "kontrib" as const }
          : { actorId: actor?.id, tcMode: "custom" as const, customTcUrl: customTcUrl! };
      const res = await apiRequest("POST", `/api/groups/${groupId}/terms`, payload);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/groups", groupId, "terms"] });
      qc.invalidateQueries({ queryKey: ["/api/groups", groupId] });
      toast({
        title: "Terms saved",
        description: `Members joining ${groupName} will see the new terms.`,
      });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({
        title: "Could not save terms",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const canSubmit =
    !setTermsMutation.isPending &&
    (choice === "kontrib" || (choice === "custom" && !!customTcUrl && indemnityAccepted));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[92vh] rounded-t-3xl p-0">
        <div className="flex flex-col h-full">
          <SheetHeader className="px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (choice && !existing?.tcMode) {
                    setChoice(null);
                  } else {
                    onOpenChange(false);
                  }
                }}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                data-testid="button-terms-back"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back</span>
              </button>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-5 py-6 space-y-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <FileText className="h-6 w-6 text-emerald-600" />
                <h2 className="text-2xl font-bold text-gray-900">Group terms</h2>
              </div>
              <p className="text-sm text-gray-500">
                Members must accept these before they can join your Ajo group.
              </p>
            </div>

            {!choice && (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setChoice("kontrib")}
                  className="w-full text-left rounded-xl border-2 border-gray-200 bg-white p-4 hover:border-emerald-500 transition-all"
                  data-testid="btn-choice-kontrib"
                >
                  <h3 className="font-semibold text-gray-900">Use Kontrib's generic terms</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Standard, plain-language membership terms. Recommended for most groups.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setChoice("custom")}
                  className="w-full text-left rounded-xl border-2 border-gray-200 bg-white p-4 hover:border-emerald-500 transition-all"
                  data-testid="btn-choice-custom"
                >
                  <h3 className="font-semibold text-gray-900">Upload our own terms</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Use your group's existing constitution or rules document (PDF).
                  </p>
                </button>
              </div>
            )}

            {choice === "kontrib" && (
              <div className="space-y-3">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 max-h-[50vh] overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans leading-relaxed">
                    {KONTRIB_GENERIC_TC}
                  </pre>
                </div>
                <p className="text-xs text-gray-500">
                  Members will see and tap to accept this text before joining.
                </p>
              </div>
            )}

            {choice === "custom" && (
              <div className="space-y-5">
                <KycFileField
                  label="Your group's terms (PDF or image)"
                  helper="Members will be shown this file before joining."
                  value={customTcUrl}
                  onChange={setCustomTcUrl}
                  buttonLabel="Upload terms file"
                  testId="custom-tc-file"
                  acceptPdf
                  showImagePreview={false}
                />

                <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-amber-700" />
                    <h4 className="font-semibold text-amber-900">Indemnity</h4>
                  </div>
                  <pre className="whitespace-pre-wrap text-sm text-amber-900 font-sans leading-relaxed">
                    {KONTRIB_INDEMNITY}
                  </pre>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <Checkbox
                      checked={indemnityAccepted}
                      onCheckedChange={(v) => setIndemnityAccepted(v === true)}
                      className="mt-1"
                      data-testid="checkbox-indemnity"
                    />
                    <span className="text-sm text-amber-900">
                      I accept the indemnity statement above on behalf of the group.
                    </span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {choice && (
            <div className="border-t border-gray-100 px-5 py-4 bg-white">
              <Button
                onClick={() => setTermsMutation.mutate()}
                disabled={!canSubmit}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-base h-12 rounded-full"
                data-testid="button-save-terms"
              >
                {setTermsMutation.isPending
                  ? "Saving..."
                  : choice === "kontrib"
                    ? "Set as our group T&C"
                    : "Save group T&C"}
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
