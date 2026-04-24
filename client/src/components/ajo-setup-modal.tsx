import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronUp, ChevronDown, Repeat, Calendar, Users as UsersIcon, Wallet, ShieldCheck, FileText, ChevronRight, CheckCircle2, Clock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getCurrentUser } from "@/lib/auth";
import { AJO_FREQUENCIES, type AjoFrequency, type User, type AdminKycView, type GroupTermsView } from "@shared/schema";
import { AdminKycModal } from "@/components/admin-kyc-modal";
import { GroupTermsModal } from "@/components/group-terms-modal";

interface MemberRow {
  userId: string;
  user: User;
}

interface AjoSetupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  groupName: string;
  members: MemberRow[];
}

const FREQUENCY_LABEL: Record<AjoFrequency, string> = {
  weekly: "Every week",
  biweekly: "Every two weeks",
  monthly: "Every month",
};

const FREQUENCY_HELP: Record<AjoFrequency, string> = {
  weekly: "A new recipient every 7 days",
  biweekly: "A new recipient every 14 days",
  monthly: "A new recipient every month",
};

function memberLabel(u: User): string {
  return (u.fullName?.trim() || u.phoneNumber || "Member");
}

export function AjoSetupModal({ open, onOpenChange, groupId, groupName, members }: AjoSetupModalProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const actor = getCurrentUser();

  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<AjoFrequency>("monthly");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [order, setOrder] = useState<MemberRow[]>([]);
  const [kycModalOpen, setKycModalOpen] = useState(false);
  const [termsModalOpen, setTermsModalOpen] = useState(false);

  // Seed the payout order from the member list whenever the sheet opens.
  useEffect(() => {
    if (open) setOrder(members);
  }, [open, members]);

  // Phase 3B preconditions: admin KYC must be approved and group terms set.
  const { data: kyc } = useQuery<AdminKycView>({
    queryKey: ["/api/users", actor?.id, "admin-kyc"],
    queryFn: async () => {
      const r = await fetch(`/api/users/${actor?.id}/admin-kyc`);
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    enabled: !!actor?.id && open,
  });

  const { data: terms } = useQuery<GroupTermsView>({
    queryKey: ["/api/groups", groupId, "terms"],
    queryFn: async () => {
      const r = await fetch(`/api/groups/${groupId}/terms`);
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    enabled: open,
  });

  const kycApproved = kyc?.status === "approved";
  const termsSet = !!terms?.tcMode;
  const preconditionsMet = kycApproved && termsSet;

  const move = (idx: number, delta: number) => {
    setOrder(prev => {
      const next = [...prev];
      const target = idx + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const setupMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        actorId: actor?.id,
        contributionAmount: amount,
        frequency,
        startDate: new Date(startDate).toISOString(),
        payoutOrder: order.map(m => m.userId),
      };
      const res = await apiRequest("POST", `/api/groups/${groupId}/ajo`, payload);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/groups", groupId, "ajo"] });
      qc.invalidateQueries({ queryKey: ["/api/groups", groupId, "projects"] });
      toast({ title: "Cycle started", description: `${groupName} is rolling — Cycle 1 is open.` });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({
        title: "Could not start cycle",
        description: err?.message || "Please check the details and try again.",
        variant: "destructive",
      });
    },
  });

  const canSubmit =
    !!amount && Number(amount) > 0 &&
    !!startDate &&
    order.length >= 1 &&
    !setupMutation.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[92vh] rounded-t-3xl p-0">
        <div className="flex flex-col h-full">
          <SheetHeader className="px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenChange(false)}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                data-testid="button-ajo-setup-back"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back</span>
              </button>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-5 py-6 space-y-7">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Set up your Ajo cycle</h2>
              <p className="text-sm text-gray-500 mt-1">
                Each round, every member contributes the same amount and one
                member receives the pot. Once you start, this is locked in.
              </p>
            </div>

            {!preconditionsMet && (
              <div className="space-y-3">
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  Two quick steps before your first cycle can run:
                </div>

                <button
                  type="button"
                  onClick={() => setKycModalOpen(true)}
                  className="w-full flex items-center gap-3 rounded-xl border-2 border-gray-200 bg-white p-4 hover:border-emerald-500 transition-all text-left"
                  data-testid="btn-open-kyc"
                >
                  <div className={`p-2 rounded-full ${kycApproved ? "bg-emerald-100" : kyc?.status === "pending" ? "bg-amber-100" : "bg-gray-100"}`}>
                    {kycApproved ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                    ) : kyc?.status === "pending" ? (
                      <Clock className="h-5 w-5 text-amber-700" />
                    ) : (
                      <ShieldCheck className="h-5 w-5 text-gray-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">Verify your identity</h3>
                    <p className="text-xs text-gray-500">
                      {kycApproved
                        ? "Approved by Kontrib"
                        : kyc?.status === "pending"
                          ? "Awaiting Kontrib review"
                          : kyc?.status === "rejected"
                            ? "Rejected — tap to update"
                            : "Submit ID + photo for review"}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </button>

                <button
                  type="button"
                  onClick={() => setTermsModalOpen(true)}
                  className="w-full flex items-center gap-3 rounded-xl border-2 border-gray-200 bg-white p-4 hover:border-emerald-500 transition-all text-left"
                  data-testid="btn-open-terms"
                >
                  <div className={`p-2 rounded-full ${termsSet ? "bg-emerald-100" : "bg-gray-100"}`}>
                    {termsSet ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                    ) : (
                      <FileText className="h-5 w-5 text-gray-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">Set group terms</h3>
                    <p className="text-xs text-gray-500">
                      {termsSet
                        ? terms?.tcMode === "kontrib"
                          ? "Using Kontrib generic T&C"
                          : "Using your custom T&C"
                        : "Pick generic or upload your own"}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </button>
              </div>
            )}

            <fieldset disabled={!preconditionsMet} className={!preconditionsMet ? "opacity-40 pointer-events-none space-y-7" : "contents"}>

            {/* Amount */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-gray-700 font-medium">
                <Wallet className="h-4 w-4 text-emerald-600" />
                Contribution amount per member
              </Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">₦</span>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="e.g. 20000"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="h-12 pl-9 text-lg rounded-xl border-2 border-gray-200 focus:border-emerald-500"
                  data-testid="input-ajo-amount"
                />
              </div>
              {!!amount && Number(amount) > 0 && order.length >= 1 && (
                <p className="text-xs text-gray-500">
                  Each cycle, the recipient takes home ~₦{(Number(amount) * order.length).toLocaleString()}.
                </p>
              )}
            </div>

            {/* Frequency */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-gray-700 font-medium">
                <Repeat className="h-4 w-4 text-emerald-600" />
                How often
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {AJO_FREQUENCIES.map(f => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFrequency(f)}
                    className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                      frequency === f
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                    }`}
                    data-testid={`btn-ajo-frequency-${f}`}
                  >
                    {FREQUENCY_LABEL[f]}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500">{FREQUENCY_HELP[frequency]}</p>
            </div>

            {/* Start date */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-gray-700 font-medium">
                <Calendar className="h-4 w-4 text-emerald-600" />
                First cycle due date
              </Label>
              <Input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="h-12 rounded-xl border-2 border-gray-200 focus:border-emerald-500"
                data-testid="input-ajo-startdate"
              />
              <p className="text-xs text-gray-500">
                Cycle 1's recipient gets paid on this date. Following cycles roll forward by your chosen frequency.
              </p>
            </div>

            {/* Payout order */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-gray-700 font-medium">
                <UsersIcon className="h-4 w-4 text-emerald-600" />
                Payout order ({order.length} members)
              </Label>
              {order.length < 1 ? (
                <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                  No members yet. Add yourself or invite people, then come back to set the payout order.
                </div>
              ) : (
                <>
                  <p className="text-xs text-gray-500">
                    Tap up/down to reorder. The person on top receives the first cycle.
                  </p>
                  <ol className="space-y-2">
                    {order.map((m, idx) => (
                      <li
                        key={m.userId}
                        className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3"
                        data-testid={`row-ajo-order-${idx}`}
                      >
                        <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="flex-1 truncate text-gray-900">{memberLabel(m.user)}</span>
                        <button
                          type="button"
                          onClick={() => move(idx, -1)}
                          disabled={idx === 0}
                          className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent"
                          data-testid={`btn-order-up-${idx}`}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => move(idx, 1)}
                          disabled={idx === order.length - 1}
                          className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent"
                          data-testid={`btn-order-down-${idx}`}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ol>
                </>
              )}
            </div>
            </fieldset>
          </div>

          <div className="border-t border-gray-100 px-5 py-4 bg-white">
            <Button
              onClick={() => setupMutation.mutate()}
              disabled={!canSubmit || !preconditionsMet}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-base h-12 rounded-full"
              data-testid="button-start-cycle"
            >
              {setupMutation.isPending ? "Starting cycle..." : "Start cycle"}
            </Button>
          </div>
        </div>
      </SheetContent>
      <AdminKycModal open={kycModalOpen} onOpenChange={setKycModalOpen} />
      <GroupTermsModal
        open={termsModalOpen}
        onOpenChange={setTermsModalOpen}
        groupId={groupId}
        groupName={groupName}
      />
    </Sheet>
  );
}
