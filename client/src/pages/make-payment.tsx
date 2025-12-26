import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { Navigation } from "@/components/navigation";
import { BigButton, CardKontrib, DashboardSkeleton } from "@/components/ui/kontrib-ui";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { PaymentAccountDetails } from "@/components/payment-account-details";
import { ArrowLeft, Upload, Users, CheckCircle, Camera, CreditCard } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { formatNaira } from "@/lib/currency";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PAYMENT_TYPES } from "@/lib/payment-types";
import { z } from "zod";
import type { GroupMember, Group, Project } from "@shared/schema";

const paymentSchema = z.object({
  groupId: z.string().min(1, "Please select a group"),
  purseId: z.string().optional(),
  amount: z.string().min(1, "Amount is required").refine((val) => !isNaN(Number(val)) && Number(val) > 0, "Enter a valid amount"),
  paymentType: z.string().min(1, "Please select payment method"),
  reference: z.string().optional(),
  notes: z.string().optional(),
  proofOfPayment: z.string().min(1, "Please upload proof of payment"),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

export default function MakePayment() {
  const user = getCurrentUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { groupId: "", purseId: "", amount: "", paymentType: "", reference: "", notes: "", proofOfPayment: "" },
  });

  type GroupMembership = GroupMember & { group: Group };
  
  const { data: userGroups = [], isLoading: groupsLoading } = useQuery<GroupMembership[]>({
    queryKey: ["/api/groups", "user", user?.id],
    enabled: !!user,
  });

  const { data: groupPurses = [] } = useQuery<Project[]>({
    queryKey: ["/api/groups", selectedGroupId, "projects"],
    enabled: !!selectedGroupId,
  });

  const selectedPurseId = form.watch("purseId");
  const selectedPurse = groupPurses.find(purse => purse.id === selectedPurseId);
  const allowedPaymentTypes: string[] = selectedPurse?.allowedPaymentTypes 
    ? ((): string[] => { try { return JSON.parse(selectedPurse.allowedPaymentTypes as string); } catch { return PAYMENT_TYPES.map(t => t.value); } })()
    : PAYMENT_TYPES.map(type => type.value);

  const paymentMutation = useMutation({
    mutationFn: async (data: PaymentFormData) => {
      const { purseId, ...rest } = data;
      const response = await apiRequest("POST", "/api/contributions", { 
        ...rest, 
        projectId: purseId || null,
        userId: user?.id 
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Payment Submitted!", description: "Admin will review and confirm shortly." });
      form.reset();
      setSelectedGroupId("");
      queryClient.invalidateQueries({ queryKey: ["/api/contributions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      navigate("/dashboard");
    },
    onError: (error: any) => {
      toast({ title: "Payment Failed", description: error.message || "Please try again later.", variant: "destructive" });
    },
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: "Invalid File", description: "Please upload an image", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File Too Large", description: "Max file size is 5MB", variant: "destructive" });
      return;
    }
    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      form.setValue("proofOfPayment", reader.result as string);
      setUploading(false);
      toast({ title: "Uploaded!", description: "Payment proof ready" });
    };
    reader.readAsDataURL(file);
  };

  if (groupsLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24 sm:pb-8">
      <Navigation />
      
      <main className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Back Button */}
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm"
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>

        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <CreditCard className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Submit Payment Proof</h1>
          <p className="text-gray-600 mt-1">Upload your payment proof for admin approval</p>
        </div>

        {userGroups.length === 0 ? (
          <CardKontrib className="text-center py-8">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h3 className="font-bold text-gray-900 mb-1">No Groups Yet</h3>
            <p className="text-gray-600 text-sm mb-4">Join a group first to make contributions</p>
            <BigButton onClick={() => navigate("/join-group")} data-testid="button-find-groups">
              Find Groups to Join
            </BigButton>
          </CardKontrib>
        ) : (
          <CardKontrib>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => paymentMutation.mutate(data))} className="space-y-5">
                {/* Group Selection */}
                <FormField
                  control={form.control}
                  name="groupId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 font-medium">Select Group</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          setSelectedGroupId(value);
                          form.setValue("purseId", "");
                        }} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="h-14 rounded-xl border-2" data-testid="select-group">
                            <SelectValue placeholder="Choose a group" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {userGroups.filter((m) => m.groupId).map((membership) => (
                            <SelectItem key={membership.id} value={membership.groupId}>
                              {membership.group.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Project Selection */}
                {groupPurses.length > 0 && (
                  <FormField
                    control={form.control}
                    name="purseId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 font-medium">Select Project</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-14 rounded-xl border-2">
                              <SelectValue placeholder="Choose a project (optional)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {groupPurses.map((project) => (
                              <SelectItem key={project.id} value={project.id}>
                                <div className="flex justify-between w-full">
                                  <span>{project.name}</span>
                                  {project.targetAmount && parseFloat(project.targetAmount) > 0 && (
                                    <span className="text-gray-500 ml-2">{formatNaira(project.targetAmount)}</span>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Payment Method */}
                <FormField
                  control={form.control}
                  name="paymentType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 font-medium">Payment Method</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-14 rounded-xl border-2">
                            <SelectValue placeholder="How did you pay?" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {allowedPaymentTypes.map((paymentTypeValue: string) => {
                            const paymentType = PAYMENT_TYPES.find(type => type.value === paymentTypeValue);
                            return paymentType ? (
                              <SelectItem key={paymentType.value} value={paymentType.value}>
                                <span className="mr-2">{paymentType.icon}</span>
                                {paymentType.label}
                              </SelectItem>
                            ) : null;
                          })}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Payment Account Details */}
                {selectedPurse && form.watch("paymentType") && (
                  <PaymentAccountDetails 
                    project={{
                      id: selectedPurse.id,
                      name: selectedPurse.name,
                      accountName: selectedPurse.accountName ?? undefined,
                      accountNumber: selectedPurse.accountNumber ?? undefined,
                      bankName: selectedPurse.bankName ?? undefined,
                      routingNumber: selectedPurse.routingNumber ?? undefined,
                      swiftCode: selectedPurse.swiftCode ?? undefined,
                      zelleEmail: selectedPurse.zelleEmail ?? undefined,
                      zellePhone: selectedPurse.zellePhone ?? undefined,
                      cashappHandle: selectedPurse.cashappHandle ?? undefined,
                      venmoHandle: selectedPurse.venmoHandle ?? undefined,
                      paypalEmail: selectedPurse.paypalEmail ?? undefined,
                      allowedPaymentTypes: selectedPurse.allowedPaymentTypes ?? undefined,
                    }}
                    selectedPaymentType={form.watch("paymentType")} 
                  />
                )}

                {/* Amount */}
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 font-medium">Amount (₦)</FormLabel>
                      <FormControl>
                        <Input 
                          type="text" 
                          placeholder="e.g. 5000" 
                          className="h-14 text-lg rounded-xl border-2"
                          {...field}
                          data-testid="input-amount"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Reference */}
                <FormField
                  control={form.control}
                  name="reference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 font-medium">Transaction Reference (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Bank reference or transaction ID"
                          className="h-14 rounded-xl border-2"
                          {...field}
                          data-testid="input-reference"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Proof Upload */}
                <FormField
                  control={form.control}
                  name="proofOfPayment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 font-medium">
                        Proof of Payment <span className="text-red-500">*</span>
                      </FormLabel>
                      <div className={`border-2 border-dashed rounded-2xl p-6 text-center transition-colors ${
                        field.value ? "border-green-400 bg-green-50" : form.formState.errors.proofOfPayment ? "border-red-300 bg-red-50" : "border-gray-300"
                      }`}>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                          id="proof-upload"
                          data-testid="file-upload"
                        />
                        {field.value ? (
                          <div className="space-y-3">
                            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                              <CheckCircle className="h-6 w-6 text-green-600" />
                            </div>
                            <p className="font-medium text-green-700">Receipt Uploaded!</p>
                            <label 
                              htmlFor="proof-upload" 
                              className="inline-flex items-center gap-2 cursor-pointer text-primary border-2 border-primary/30 hover:border-primary hover:bg-primary/5 font-semibold px-4 py-2 rounded-full transition-all text-sm"
                            >
                              Change Image
                            </label>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                              <Camera className="h-6 w-6 text-gray-400" />
                            </div>
                            <div>
                              <label 
                                htmlFor="proof-upload" 
                                className="inline-flex items-center gap-2 cursor-pointer text-primary border-2 border-primary/30 hover:border-primary hover:bg-primary/5 font-semibold px-6 py-3 rounded-full transition-all active:scale-[0.98]"
                              >
                                <Upload className="h-4 w-4" />
                                {uploading ? "Uploading..." : "Upload Receipt"}
                              </label>
                            </div>
                            <p className="text-xs text-gray-400 mt-2">
                              Screenshot or photo of your payment (Max 5MB)
                            </p>
                          </div>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Notes */}
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 font-medium">Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Any additional info for the admin..."
                          className="rounded-xl border-2 resize-none"
                          rows={3}
                          {...field}
                          data-testid="textarea-notes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Submit */}
                <BigButton
                  type="submit"
                  loading={paymentMutation.isPending}
                  icon={<Upload className="h-5 w-5" />}
                  data-testid="submit-payment-proof"
                >
                  Submit Payment Proof
                </BigButton>
              </form>
            </Form>
          </CardKontrib>
        )}

        {/* Instructions */}
        <CardKontrib className="bg-blue-50 border-blue-100">
          <h3 className="font-bold text-blue-900 mb-3">How it Works</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">1</div>
              <p className="text-sm text-blue-800">Transfer money to the group's bank account</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">2</div>
              <p className="text-sm text-blue-800">Take a screenshot of your bank receipt</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">3</div>
              <p className="text-sm text-blue-800">Upload it here and wait for admin approval</p>
            </div>
          </div>
        </CardKontrib>
      </main>
    </div>
  );
}
