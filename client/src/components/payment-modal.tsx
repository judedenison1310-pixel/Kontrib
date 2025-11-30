import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertContributionSchema, Project } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { getCurrentUser } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { formatNaira } from "@/lib/currency";
import { Upload, X, ArrowLeft, Building2, Copy, Check, CreditCard } from "lucide-react";
import { z } from "zod";

const paymentFormSchema = insertContributionSchema.extend({
  amount: z.string().min(1, "Amount is required"),
}).omit({
  groupId: true,
  projectId: true,
  userId: true,
  paymentType: true,
  status: true,
});

type PaymentFormData = z.infer<typeof paymentFormSchema>;

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
}

export function PaymentModal({ open, onOpenChange, project }: PaymentModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = getCurrentUser();
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string>("");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      amount: "",
      description: "",
      transactionRef: "",
      proofOfPayment: "",
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select a file smaller than 5MB",
          variant: "destructive",
        });
        return;
      }

      setProofFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setProofPreview(result);
        form.setValue("proofOfPayment", result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeProof = () => {
    setProofFile(null);
    setProofPreview("");
    form.setValue("proofOfPayment", "");
  };

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const createPaymentMutation = useMutation({
    mutationFn: async (data: PaymentFormData) => {
      if (!project || !user) throw new Error("Missing project or user");
      
      const response = await apiRequest("POST", "/api/contributions", {
        ...data,
        projectId: project.id,
        groupId: project.groupId,
        userId: user.id,
        paymentType: "bank_transfer",
        status: "pending",
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups", "user", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/contributions", "user", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats", "user", user?.id] });
      
      toast({
        title: "Payment Submitted",
        description: "Your contribution has been submitted and is pending admin approval.",
      });
      form.reset();
      removeProof();
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Payment submission error:", error);
      toast({
        title: "Payment Failed",
        description: error instanceof Error ? error.message : "Failed to process payment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PaymentFormData) => {
    createPaymentMutation.mutate(data);
  };

  if (!project) return null;

  const hasPaymentDetails = project.accountNumber || project.bankName || project.paymentInstructions;
  const hasTarget = project.targetAmount && parseFloat(project.targetAmount) > 0;
  const projectTypeLabel = project.projectType === "monthly" ? "Monthly Dues" 
    : project.projectType === "yearly" ? "Yearly Dues" 
    : project.projectType === "event" ? "Event Collection"
    : project.projectType === "emergency" ? "Emergency Fund"
    : "Target Goal";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[95vh] rounded-t-3xl p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <SheetHeader className="px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <button
                onClick={() => onOpenChange(false)}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                data-testid="button-close-payment"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back</span>
              </button>
            </div>
          </SheetHeader>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-5 py-6">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Submit Payment Proof</h2>
                <p className="text-gray-500 mt-1">
                  For <span className="font-medium text-gray-700">{project.name}</span>
                </p>
              </div>

              {/* Project Summary */}
              <div className="bg-gray-50 rounded-2xl p-4">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                  <CreditCard className="h-4 w-4" />
                  <span>{projectTypeLabel}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {hasTarget && (
                    <div>
                      <p className="text-gray-500">Target</p>
                      <p className="font-bold text-lg">{formatNaira(project.targetAmount!)}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-gray-500">Collected</p>
                    <p className="font-bold text-lg text-primary">{formatNaira(project.collectedAmount)}</p>
                  </div>
                </div>
              </div>

              {/* Payment Instructions */}
              {hasPaymentDetails && (
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-blue-700 font-medium">
                    <Building2 className="h-5 w-5" />
                    <span>Where to Send Payment</span>
                  </div>
                  
                  {project.bankName && (
                    <div className="flex items-center justify-between bg-white rounded-xl p-3">
                      <div>
                        <p className="text-xs text-gray-500">Bank</p>
                        <p className="font-medium text-gray-900">{project.bankName}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(project.bankName!, "bank")}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        data-testid="button-copy-bank"
                      >
                        {copiedField === "bank" ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  )}

                  {project.accountNumber && (
                    <div className="flex items-center justify-between bg-white rounded-xl p-3">
                      <div>
                        <p className="text-xs text-gray-500">Account Number</p>
                        <p className="font-bold text-gray-900 text-lg tracking-wider">{project.accountNumber}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(project.accountNumber!, "account")}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        data-testid="button-copy-account"
                      >
                        {copiedField === "account" ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  )}

                  {project.accountName && (
                    <div className="flex items-center justify-between bg-white rounded-xl p-3">
                      <div>
                        <p className="text-xs text-gray-500">Account Name</p>
                        <p className="font-medium text-gray-900">{project.accountName}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(project.accountName!, "name")}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        data-testid="button-copy-name"
                      >
                        {copiedField === "name" ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  )}

                  {project.paymentInstructions && (
                    <div className="bg-white rounded-xl p-3">
                      <p className="text-xs text-gray-500 mb-1">Additional Instructions</p>
                      <p className="text-gray-700 text-sm">{project.paymentInstructions}</p>
                    </div>
                  )}
                </div>
              )}

              {!hasPaymentDetails && (
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-center">
                  <p className="text-amber-700 text-sm">
                    No payment details set yet. Contact your group admin for bank details.
                  </p>
                </div>
              )}

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 font-medium">Amount Paid (₦)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="e.g. 5000" 
                            className="h-14 text-lg rounded-2xl border-2 border-gray-200 focus:border-primary"
                            {...field} 
                            data-testid="input-payment-amount"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="transactionRef"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 font-medium">Transaction Reference</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Bank reference or receipt number" 
                            className="h-14 rounded-2xl border-2 border-gray-200 focus:border-primary"
                            {...field}
                            value={field.value || ""}
                            data-testid="input-transaction-ref"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 font-medium">Note (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Any additional info about this payment..." 
                            rows={2}
                            className="rounded-2xl border-2 border-gray-200 focus:border-primary resize-none"
                            {...field}
                            value={field.value || ""}
                            data-testid="input-payment-note"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Proof of Payment Upload */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Proof of Payment</label>
                    <div className="border-2 border-dashed border-gray-300 rounded-2xl p-6 text-center">
                      {proofPreview ? (
                        <div className="space-y-3">
                          <div className="relative inline-block">
                            <img 
                              src={proofPreview} 
                              alt="Payment proof" 
                              className="max-w-full h-40 object-contain mx-auto rounded-xl"
                            />
                            <button
                              type="button"
                              onClick={removeProof}
                              className="absolute -top-2 -right-2 w-8 h-8 bg-red-100 hover:bg-red-200 rounded-full flex items-center justify-center transition-colors"
                              data-testid="button-remove-proof"
                            >
                              <X className="h-4 w-4 text-red-600" />
                            </button>
                          </div>
                          <p className="text-xs text-gray-500">{proofFile?.name}</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                            <Upload className="h-6 w-6 text-gray-400" />
                          </div>
                          <div>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleFileUpload}
                              className="hidden"
                              id="proof-upload"
                              data-testid="input-proof-upload"
                            />
                            <label
                              htmlFor="proof-upload"
                              className="cursor-pointer text-primary font-medium hover:underline"
                            >
                              Tap to upload receipt
                            </label>
                          </div>
                          <p className="text-xs text-gray-400">
                            Screenshot of bank transfer or payment receipt (Max 5MB)
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={createPaymentMutation.isPending}
                    className="w-full bg-primary hover:bg-primary/90 text-white font-semibold text-lg py-4 rounded-full disabled:opacity-50 transition-all active:scale-[0.98] mt-4"
                    data-testid="button-submit-payment"
                  >
                    {createPaymentMutation.isPending ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Submitting...
                      </div>
                    ) : (
                      "Submit Payment Proof"
                    )}
                  </button>
                </form>
              </Form>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
