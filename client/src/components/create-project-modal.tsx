import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { insertProjectSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getDefaultPaymentTypes } from "@/lib/payment-types";
import { CURRENCIES, getCurrencySymbol, CurrencyCode } from "@/lib/currency";
import { z } from "zod";
import { ArrowLeft, Calendar, Building2, ChevronDown, ChevronUp } from "lucide-react";

const createProjectFormSchema = insertProjectSchema.extend({
  targetAmount: z.string().optional(),
  selectedPaymentTypes: z.array(z.string()).min(1, "Please select at least one payment method"),
  projectType: z.enum(["target", "monthly", "yearly", "event", "emergency"]).default("target"),
});

type CreateProjectFormData = z.infer<typeof createProjectFormSchema>;

interface CreateProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  groupName: string;
}

export function CreateProjectModal({ open, onOpenChange, groupId, groupName }: CreateProjectModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);

  const form = useForm<CreateProjectFormData>({
    resolver: zodResolver(createProjectFormSchema),
    defaultValues: {
      name: "",
      description: "",
      targetAmount: "",
      deadline: undefined,
      groupId,
      projectType: "target",
      currency: "NGN",
      accountName: "",
      accountNumber: "",
      bankName: "",
      routingNumber: "",
      swiftCode: "",
      zelleEmail: "",
      zellePhone: "",
      cashappHandle: "",
      venmoHandle: "",
      paypalEmail: "",
      paymentInstructions: "",
      selectedPaymentTypes: getDefaultPaymentTypes(),
    },
  });

  const projectType = form.watch("projectType");
  const selectedCurrency = form.watch("currency") as CurrencyCode || "NGN";
  const requiresTarget = projectType === "target" || projectType === "event" || projectType === "emergency";

  const createProjectMutation = useMutation({
    mutationFn: async (data: CreateProjectFormData) => {
      const payload = {
        ...data,
        targetAmount: requiresTarget ? data.targetAmount : null,
        deadline: data.deadline && typeof data.deadline === 'string' && data.deadline.trim() ? data.deadline : undefined,
        allowedPaymentTypes: JSON.stringify(data.selectedPaymentTypes || []),
      };
      const response = await apiRequest("POST", `/api/groups/${groupId}/projects`, payload);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups", groupId, "projects"] });
      toast({
        title: "Project Created!",
        description: `"${data.name}" has been created successfully!`,
      });
      form.reset();
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create project. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateProjectFormData) => {
    createProjectMutation.mutate(data);
  };

  const projectTypes = [
    { value: "monthly", label: "Monthly Contributions/Savings", description: "e.g. Ajo, Esusu" },
    { value: "target", label: "Target Goal", description: "e.g. Wedding Gift, House Project" },
    { value: "yearly", label: "Dues and Levies", description: "e.g. Annual Dues, Fees" },
    { value: "event", label: "One-time Event", description: "e.g. Birthday Party, Burial" },
    { value: "emergency", label: "Emergency Fund", description: "e.g. Medical, Urgent Needs" },
  ];

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
                <h2 className="text-2xl font-bold text-gray-900">Add a Project</h2>
                <p className="text-gray-500 mt-1">
                  What are you collecting money for?
                </p>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 font-medium">Project Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g. Wedding Gift, Monthly Ajo" 
                            className="h-14 text-lg rounded-2xl border-2 border-gray-200 focus:border-primary"
                            {...field}
                            data-testid="input-project-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="projectType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 font-medium">Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-14 text-lg rounded-2xl border-2 border-gray-200" data-testid="select-project-type">
                              <SelectValue placeholder="Choose Contribution Type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {projectTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                <div>
                                  <div className="font-medium">{type.label}</div>
                                  <div className="text-xs text-gray-500">{type.description}</div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 font-medium">Currency</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-14 text-lg rounded-2xl border-2 border-gray-200" data-testid="select-currency">
                              <SelectValue placeholder="Select currency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CURRENCIES.map((curr) => (
                              <SelectItem key={curr.code} value={curr.code}>
                                {curr.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {requiresTarget && (
                    <FormField
                      control={form.control}
                      name="targetAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700 font-medium">Target Amount ({getCurrencySymbol(selectedCurrency)})</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="e.g. 50000" 
                              className="h-14 text-lg rounded-2xl border-2 border-gray-200 focus:border-primary"
                              {...field}
                              data-testid="input-target-amount"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {!requiresTarget && (
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-sm text-blue-700">
                      No target needed for {projectType === "monthly" ? "monthly" : "yearly"} dues. 
                      Contributions will be tracked as they come in.
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name="deadline"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 font-medium">Due Date (Optional)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              type="date"
                              placeholder="Pick a date"
                              className="h-14 text-lg rounded-2xl border-2 border-gray-200 focus:border-primary pl-12"
                              {...field} 
                              value={typeof field.value === 'string' ? field.value : ""}
                              onChange={(e) => field.onChange(e.target.value || undefined)}
                              data-testid="input-deadline"
                            />
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Payment Details Section */}
                  <div className="border-t border-gray-100 pt-5">
                    <button
                      type="button"
                      onClick={() => setShowPaymentDetails(!showPaymentDetails)}
                      className="w-full flex items-center justify-between text-left"
                      data-testid="button-toggle-payment-details"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Payment Account Details</p>
                          <p className="text-sm text-gray-500">Bank info shown to members when paying</p>
                        </div>
                      </div>
                      {showPaymentDetails ? (
                        <ChevronUp className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      )}
                    </button>

                    {showPaymentDetails && (
                      <div className="mt-4 space-y-4 pl-13">
                        <FormField
                          control={form.control}
                          name="bankName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-700">Bank Name</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="e.g. GTBank, First Bank, Access Bank" 
                                  className="h-12 rounded-xl border-2 border-gray-200 focus:border-primary"
                                  {...field}
                                  value={field.value || ""}
                                  data-testid="input-bank-name"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="accountNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-700">Account Number</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="e.g. 0123456789" 
                                  className="h-12 rounded-xl border-2 border-gray-200 focus:border-primary"
                                  {...field}
                                  value={field.value || ""}
                                  data-testid="input-account-number"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="accountName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-700">Account Name</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="e.g. Chioma Okonkwo" 
                                  className="h-12 rounded-xl border-2 border-gray-200 focus:border-primary"
                                  {...field}
                                  value={field.value || ""}
                                  data-testid="input-account-name"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="paymentInstructions"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-700">Additional Instructions</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="e.g. Please use your name as payment reference" 
                                  rows={2}
                                  className="rounded-xl border-2 border-gray-200 focus:border-primary resize-none"
                                  {...field}
                                  value={field.value || ""}
                                  data-testid="input-payment-instructions"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={createProjectMutation.isPending}
                    className="w-full bg-primary hover:bg-primary/90 text-white font-semibold text-lg py-4 rounded-full disabled:opacity-50 transition-all active:scale-[0.98] mt-6"
                    data-testid="button-create-project-submit"
                  >
                    {createProjectMutation.isPending ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Creating...
                      </div>
                    ) : (
                      "Create Project"
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
