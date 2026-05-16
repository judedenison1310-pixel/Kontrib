import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Repeat, Calendar, Wallet, Building2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getCurrentUser } from "@/lib/auth";
import { KycFileField } from "@/components/kyc-file-field";
import { ASSOCIATION_FREQUENCIES, type AssociationFrequency, type Group } from "@shared/schema";

interface AssociationSetupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  groupName: string;
  memberCount: number;
}

const FREQUENCY_LABEL: Record<AssociationFrequency, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

const FREQUENCY_HELP: Record<AssociationFrequency, string> = {
  monthly: "Members pay every month.",
  quarterly: "Members pay every three months.",
  yearly: "Members pay once a year.",
};

export function AssociationSetupModal({ open, onOpenChange, groupId, groupName, memberCount }: AssociationSetupModalProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const actor = getCurrentUser();

  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<AssociationFrequency>("monthly");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [paymentInstructions, setPaymentInstructions] = useState("");

  // Preload existing logo (admin can upload during setup or replace later).
  const { data: group } = useQuery<Group>({
    queryKey: ["/api/groups", groupId],
    enabled: open && !!groupId,
  });

  useEffect(() => {
    if (open && group?.logoUrl) {
      setLogoUrl(group.logoUrl);
    }
  }, [open, group?.logoUrl]);

  const setupMutation = useMutation({
    mutationFn: async () => {
      // Save logo first (if changed) so the dues setup completes with the
      // updated branding visible everywhere. The /logo endpoint requires
      // actorId in the body to verify admin permission — without it the
      // request is rejected with "Only the group admin can set the logo".
      if (logoUrl && logoUrl !== (group?.logoUrl ?? null)) {
        await apiRequest("POST", `/api/groups/${groupId}/logo`, {
          actorId: actor?.id,
          logoUrl,
        });
      }
      const payload = {
        actorId: actor?.id,
        duesAmount: amount,
        duesFrequency: frequency,
        startDate: new Date(startDate).toISOString(),
        bankName: bankName.trim() || null,
        accountNumber: accountNumber.trim() || null,
        accountName: accountName.trim() || null,
        paymentInstructions: paymentInstructions.trim() || null,
      };
      const res = await apiRequest("POST", `/api/groups/${groupId}/association`, payload);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/groups", groupId, "association"] });
      qc.invalidateQueries({ queryKey: ["/api/groups", groupId, "projects"] });
      toast({
        title: "Dues set up",
        description: `${groupName} is collecting ${FREQUENCY_LABEL[frequency].toLowerCase()} dues.`,
      });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({
        title: "Could not set up dues",
        description: err?.message || "Please check the details and try again.",
        variant: "destructive",
      });
    },
  });

  const canSubmit =
    !!amount && Number(amount) > 0 && !!startDate && !setupMutation.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[88vh] rounded-t-3xl p-0">
        <div className="flex flex-col h-full">
          <SheetHeader className="px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenChange(false)}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                data-testid="button-association-setup-back"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back</span>
              </button>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-5 py-6 space-y-7">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Set up association dues</h2>
              <p className="text-sm text-gray-500 mt-1">
                Pick how much members owe and how often. Each period appears as
                its own collection so you can track who's paid up.
              </p>
            </div>

            {/* Group logo (optional) */}
            <KycFileField
              label="Group logo (optional)"
              helper="Adds a small picture next to your group name on members' screens. JPG or PNG works best."
              value={logoUrl}
              onChange={setLogoUrl}
              buttonLabel="Upload group logo"
              testId="association-logo"
            />

            {/* Amount */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-gray-700 font-medium">
                <Wallet className="h-4 w-4 text-emerald-600" />
                Dues per member
              </Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">₦</span>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="e.g. 5000"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="h-12 pl-9 text-lg rounded-xl border-2 border-gray-200 focus:border-emerald-500"
                  data-testid="input-association-amount"
                />
              </div>
              {!!amount && Number(amount) > 0 && memberCount > 0 && (
                <p className="text-xs text-gray-500">
                  Each period brings in ~₦{(Number(amount) * memberCount).toLocaleString()} from {memberCount} members.
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
                {ASSOCIATION_FREQUENCIES.map(f => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFrequency(f)}
                    className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                      frequency === f
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                    }`}
                    data-testid={`btn-association-frequency-${f}`}
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
                First period due date
              </Label>
              <Input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="h-12 rounded-xl border-2 border-gray-200 focus:border-emerald-500"
                data-testid="input-association-startdate"
              />
              <p className="text-xs text-gray-500">
                Period 1 is due on this date. Following periods roll forward by the chosen frequency.
              </p>
            </div>

            {/* Payment instructions — shown to members on every dues period and reusable for levies. */}
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-emerald-600" />
                <h3 className="font-medium text-gray-900">Payment instructions (optional)</h3>
              </div>
              <p className="text-xs text-gray-500 -mt-1">
                Members will see these account details when paying dues. Levies can reuse them.
              </p>

              <div className="space-y-2">
                <Label htmlFor="dues-bank" className="text-sm text-gray-700">Bank name</Label>
                <Input
                  id="dues-bank"
                  placeholder="e.g. GTBank"
                  value={bankName}
                  onChange={e => setBankName(e.target.value)}
                  className="h-11 rounded-xl border-2 border-gray-200 focus:border-emerald-500"
                  data-testid="input-association-bank-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dues-acct-no" className="text-sm text-gray-700">Account number</Label>
                <Input
                  id="dues-acct-no"
                  inputMode="numeric"
                  placeholder="e.g. 0123456789"
                  value={accountNumber}
                  onChange={e => setAccountNumber(e.target.value)}
                  className="h-11 rounded-xl border-2 border-gray-200 focus:border-emerald-500"
                  data-testid="input-association-account-number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dues-acct-name" className="text-sm text-gray-700">Account name</Label>
                <Input
                  id="dues-acct-name"
                  placeholder="e.g. Noble Association"
                  value={accountName}
                  onChange={e => setAccountName(e.target.value)}
                  className="h-11 rounded-xl border-2 border-gray-200 focus:border-emerald-500"
                  data-testid="input-association-account-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dues-instructions" className="text-sm text-gray-700">Other instructions</Label>
                <Textarea
                  id="dues-instructions"
                  placeholder="e.g. Use your full name as the transfer reference."
                  value={paymentInstructions}
                  onChange={e => setPaymentInstructions(e.target.value)}
                  rows={3}
                  className="rounded-xl border-2 border-gray-200 focus:border-emerald-500"
                  data-testid="input-association-payment-instructions"
                />
              </div>
            </div>

            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
              You can add one-off levies any time after setup — building funds, end-of-year contributions, etc.
            </div>
          </div>

          <div className="border-t border-gray-100 px-5 py-4 bg-white">
            <Button
              onClick={() => setupMutation.mutate()}
              disabled={!canSubmit}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-base h-12 rounded-full"
              data-testid="button-start-association"
            >
              {setupMutation.isPending ? "Setting up..." : "Start collecting dues"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
