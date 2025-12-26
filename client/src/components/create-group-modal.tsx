import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { insertGroupSchema, insertProjectSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { getCurrentUser } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { getDefaultPaymentTypes } from "@/lib/payment-types";
import { z } from "zod";
import { ArrowLeft, Calendar, Building2, ChevronDown, ChevronUp, CheckCircle, Lock, Users } from "lucide-react";
import { Switch } from "@/components/ui/switch";

const createGroupFormSchema = insertGroupSchema;
type CreateGroupFormData = z.infer<typeof createGroupFormSchema>;

const createProjectFormSchema = insertProjectSchema.extend({
  targetAmount: z.string().optional(),
  selectedPaymentTypes: z.array(z.string()).min(1, "Please select at least one payment method"),
  projectType: z.enum(["target", "monthly", "yearly", "event", "emergency"]).default("target"),
});
type CreateProjectFormData = z.infer<typeof createProjectFormSchema>;

interface CreateGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateGroupModal({ open, onOpenChange }: CreateGroupModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = getCurrentUser();
  const [step, setStep] = useState<"group" | "project">("group");
  const [createdGroup, setCreatedGroup] = useState<{ id: string; name: string } | null>(null);
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);

  const groupForm = useForm<CreateGroupFormData>({
    resolver: zodResolver(createGroupFormSchema),
    defaultValues: {
      name: "",
      description: "",
      privacyMode: "standard",
    },
  });

  const projectForm = useForm<CreateProjectFormData>({
    resolver: zodResolver(createProjectFormSchema),
    defaultValues: {
      name: "",
      description: "",
      targetAmount: "",
      deadline: undefined,
      groupId: "",
      projectType: "target",
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

  const projectType = projectForm.watch("projectType");
  const requiresTarget = projectType === "target" || projectType === "event" || projectType === "emergency";

  const createGroupMutation = useMutation({
    mutationFn: async (data: CreateGroupFormData) => {
      const response = await apiRequest("POST", "/api/groups", {
        ...data,
        adminId: user?.id,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setCreatedGroup({ id: data.id, name: data.name });
      projectForm.setValue("groupId", data.id);
      setStep("project");
      toast({
        title: "Group Created!",
        description: "Now add your first project to start collecting.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create group. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createProjectMutation = useMutation({
    mutationFn: async (data: CreateProjectFormData) => {
      const payload = {
        ...data,
        targetAmount: requiresTarget ? data.targetAmount : null,
        deadline: data.deadline && typeof data.deadline === 'string' && data.deadline.trim() ? data.deadline : undefined,
        allowedPaymentTypes: JSON.stringify(data.selectedPaymentTypes || []),
      };
      const response = await apiRequest("POST", `/api/groups/${createdGroup?.id}/projects`, payload);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups", "admin", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups", createdGroup?.id, "projects"] });
      toast({
        title: "All Set!",
        description: `"${createdGroup?.name}" is ready. Share it with your group!`,
      });
      handleClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create project. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    groupForm.reset();
    projectForm.reset();
    setStep("group");
    setCreatedGroup(null);
    setShowPaymentDetails(false);
    onOpenChange(false);
  };

  const handleBack = () => {
    if (step === "project") {
      setStep("group");
    } else {
      handleClose();
    }
  };

  const onGroupSubmit = (data: CreateGroupFormData) => {
    createGroupMutation.mutate(data);
  };

  const onProjectSubmit = (data: CreateProjectFormData) => {
    createProjectMutation.mutate(data);
  };

  const projectTypes = [
    { value: "monthly", label: "Monthly Contributions/Savings", description: "e.g. Ajo, Esusu" },
    { value: "target", label: "Target Goal", description: "e.g. Wedding Gift, House Project" },
    { value: "yearly", label: "Dues and Levies", description: "e.g. Annual Dues, Fees" },
    { value: "event", label: "One-time Event", description: "e.g. Birthday Party, Burial" },
    { value: "emergency", label: "Emergency Fund", description: "e.g. Medical, Urgent Needs" },
  ];

  const canClose = step === "group" || !createdGroup;

  return (
    <Sheet open={open} onOpenChange={(isOpen) => {
      if (!isOpen && canClose) {
        handleClose();
      }
    }}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl p-0" onInteractOutside={(e) => {
        if (!canClose) {
          e.preventDefault();
        }
      }}>
        <div className="flex flex-col h-full">
          <SheetHeader className="px-5 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              {canClose ? (
                <button
                  onClick={handleBack}
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                  data-testid="button-back"
                >
                  <ArrowLeft className="h-5 w-5" />
                  <span>Back</span>
                </button>
              ) : (
                <div className="text-sm text-amber-600 font-medium">
                  Complete the project to finish
                </div>
              )}
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${step === "group" ? "bg-primary" : "bg-primary"}`} />
                <div className={`w-2 h-2 rounded-full ${step === "project" ? "bg-primary" : "bg-gray-300"}`} />
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-5 py-6">
            {step === "group" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">Name your Group</h2>
                  <p className="text-gray-500 mt-2">
                    Eg. "Chioma's Wedding", "Office Ajo", "Church Youth"
                  </p>
                </div>

                <Form {...groupForm}>
                  <form onSubmit={groupForm.handleSubmit(onGroupSubmit)} className="space-y-6">
                    <FormField
                      control={groupForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input 
                              placeholder="Group Name" 
                              className="h-14 text-lg rounded-2xl border-2 border-primary focus:border-primary"
                              autoFocus
                              {...field}
                              data-testid="input-group-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={groupForm.control}
                      name="privacyMode"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-200">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${field.value === "private" ? "bg-amber-100" : "bg-gray-200"}`}>
                                {field.value === "private" ? (
                                  <Lock className="h-5 w-5 text-amber-600" />
                                ) : (
                                  <Users className="h-5 w-5 text-gray-500" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">Private Group (Ajo)</p>
                                <p className="text-sm text-gray-500">
                                  {field.value === "private" 
                                    ? "Only admin sees members & payments" 
                                    : "Everyone sees who contributed"}
                                </p>
                              </div>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value === "private"}
                                onCheckedChange={(checked) => field.onChange(checked ? "private" : "standard")}
                                data-testid="switch-privacy-mode"
                              />
                            </FormControl>
                          </div>
                        </FormItem>
                      )}
                    />

                    <button
                      type="submit"
                      disabled={createGroupMutation.isPending || !groupForm.watch("name")}
                      className="w-full bg-primary hover:bg-primary/90 text-white font-semibold text-lg py-4 rounded-full disabled:opacity-50 transition-all active:scale-[0.98]"
                      data-testid="button-create-group-submit"
                    >
                      {createGroupMutation.isPending ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Creating...
                        </div>
                      ) : (
                        "Next: Add a Project"
                      )}
                    </button>
                  </form>
                </Form>
              </div>
            )}

            {step === "project" && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 bg-green-50 rounded-xl p-3 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-green-800 font-medium">"{createdGroup?.name}" created</span>
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Add Your First Project</h2>
                  <p className="text-gray-500 mt-1">
                    What are you collecting money for?
                  </p>
                </div>

                <Form {...projectForm}>
                  <form onSubmit={projectForm.handleSubmit(onProjectSubmit)} className="space-y-5">
                    <FormField
                      control={projectForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700 font-medium">Project Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g. Wedding Gift, Monthly Ajo" 
                              className="h-14 text-lg rounded-2xl border-2 border-gray-200 focus:border-primary"
                              autoFocus
                              {...field}
                              data-testid="input-project-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={projectForm.control}
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

                    {requiresTarget && (
                      <FormField
                        control={projectForm.control}
                        name="targetAmount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-700 font-medium">Target Amount (₦)</FormLabel>
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
                      control={projectForm.control}
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
                        <div className="mt-4 space-y-4">
                          <FormField
                            control={projectForm.control}
                            name="bankName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-gray-700">Bank Name</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="e.g. GTBank, First Bank" 
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
                            control={projectForm.control}
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
                            control={projectForm.control}
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
                            control={projectForm.control}
                            name="paymentInstructions"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-gray-700">Additional Instructions</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder="e.g. Use your name as reference" 
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
                      disabled={createProjectMutation.isPending || !projectForm.watch("name")}
                      className="w-full bg-primary hover:bg-primary/90 text-white font-semibold text-lg py-4 rounded-full disabled:opacity-50 transition-all active:scale-[0.98] mt-6"
                      data-testid="button-create-project-submit"
                    >
                      {createProjectMutation.isPending ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Creating...
                        </div>
                      ) : (
                        "Complete Setup"
                      )}
                    </button>
                  </form>
                </Form>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
