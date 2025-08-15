import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertContributionSchema, Project } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { getCurrentUser } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { formatNaira } from "@/lib/currency";
import { Upload, X } from "lucide-react";
import { z } from "zod";

const paymentFormSchema = insertContributionSchema.extend({
  amount: z.string().min(1, "Amount is required"),
}).omit({
  groupId: true,
  projectId: true,
  userId: true,
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
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
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

  const createPaymentMutation = useMutation({
    mutationFn: async (data: PaymentFormData) => {
      if (!project || !user) throw new Error("Missing project or user");
      
      console.log("Submitting payment data:", { ...data, projectId: project.id, groupId: project.groupId, userId: user.id });
      
      const response = await apiRequest("POST", "/api/contributions", {
        ...data,
        amount: data.amount,
        projectId: project.id,
        groupId: project.groupId,
        userId: user.id,
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
    console.log("Form submission data:", data);
    console.log("Form errors:", form.formState.errors);
    console.log("Form validation state:", form.formState.isValid);
    console.log("Project data:", project);
    console.log("User data:", user);
    
    if (!form.formState.isValid) {
      console.error("Form validation failed");
      Object.keys(form.formState.errors).forEach(key => {
        console.error(`Validation error for ${key}:`, form.formState.errors[key as keyof typeof form.formState.errors]);
      });
      return;
    }
    
    createPaymentMutation.mutate(data);
  };

  if (!project) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Make Payment</DialogTitle>
          <p className="text-sm text-gray-600">
            Contributing to <span className="font-medium">{project.name}</span>
          </p>
        </DialogHeader>

        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Target Amount</p>
              <p className="font-semibold">{formatNaira(project.targetAmount)}</p>
            </div>
            <div>
              <p className="text-gray-600">Collected So Far</p>
              <p className="font-semibold text-green-600">{formatNaira(project.collectedAmount)}</p>
            </div>
          </div>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (₦)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="Enter amount" 
                      {...field} 
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
                  <FormLabel>Transaction Reference (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Bank transfer reference or receipt number" 
                      {...field}
                      value={field.value || ""}
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
                  <FormLabel>Note (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Add a note about this payment..." 
                      rows={3}
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Proof of Payment Upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Proof of Payment</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                {proofPreview ? (
                  <div className="space-y-2">
                    <div className="relative">
                      <img 
                        src={proofPreview} 
                        alt="Payment proof" 
                        className="max-w-full h-32 object-contain mx-auto rounded"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={removeProof}
                        className="absolute top-0 right-0 p-1 h-8 w-8"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500">{proofFile?.name}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-8 w-8 text-gray-400 mx-auto" />
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="proof-upload"
                      />
                      <label
                        htmlFor="proof-upload"
                        className="cursor-pointer text-sm text-blue-600 hover:text-blue-800"
                      >
                        Click to upload receipt or screenshot
                      </label>
                    </div>
                    <p className="text-xs text-gray-500">
                      Upload a screenshot of your bank transfer or payment receipt (Max 5MB)
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex space-x-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createPaymentMutation.isPending}
                className="flex-1 bg-nigerian-green hover:bg-forest-green"
              >
                {createPaymentMutation.isPending ? "Processing..." : "Submit Payment"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
