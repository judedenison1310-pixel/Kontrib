import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Navigation } from "@/components/navigation";
import { 
  CreditCard, 
  Upload, 
  Target, 
  Users, 
  Calendar,
  CheckCircle,
  AlertCircle,
  Info
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { formatNaira } from "@/lib/currency";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PAYMENT_TYPES, getPaymentTypeLabel } from "@/lib/payment-types";
import { PaymentAccountDetails } from "@/components/payment-account-details";
import { z } from "zod";

const paymentSchema = z.object({
  groupId: z.string().min(1, "Please select a group"),
  purseId: z.string().optional(),
  amount: z.string().min(1, "Amount is required").refine((val) => !isNaN(Number(val)) && Number(val) > 0, "Amount must be a positive number"),
  paymentType: z.string().min(1, "Please select a payment method"),
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
    defaultValues: {
      groupId: "",
      purseId: "",
      amount: "",
      paymentType: "",
      reference: "",
      notes: "",
      proofOfPayment: "",
    },
  });

  // Fetch user's groups
  const { data: userGroups = [], isLoading: groupsLoading } = useQuery<any[]>({
    queryKey: ["/api/groups", "user", user?.id],
    enabled: !!user,
  });

  // Fetch projects for selected group
  const { data: groupPurses = [] } = useQuery<any[]>({
    queryKey: ["/api/groups", selectedGroupId, "projects"],
    enabled: !!selectedGroupId,
  });

  // Find selected group details
  const selectedGroup = userGroups.find(group => group.groupId === selectedGroupId)?.group;
  
  // Find selected project details
  const selectedPurseId = form.watch("purseId");
  const selectedPurse = groupPurses.find(purse => purse.id === selectedPurseId);
  
  // Get allowed payment types for selected project
  const allowedPaymentTypes = selectedPurse?.allowedPaymentTypes ? 
    JSON.parse(selectedPurse.allowedPaymentTypes) : 
    PAYMENT_TYPES.map(type => type.value);

  const paymentMutation = useMutation({
    mutationFn: async (data: PaymentFormData) => {
      const response = await apiRequest("POST", "/api/contributions", {
        ...data,
        userId: user?.id,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Payment Submitted!",
        description: "Your payment has been submitted for admin approval.",
      });
      form.reset();
      setSelectedGroupId("");
      queryClient.invalidateQueries({ queryKey: ["/api/contributions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
    onError: (error: any) => {
      toast({
        title: "Payment Failed",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File",
        description: "Please upload an image file (PNG, JPG, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      // Convert to base64 for storage
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        form.setValue("proofOfPayment", base64String);
        setUploading(false);
        toast({
          title: "Upload Successful",
          description: "Payment proof uploaded successfully.",
        });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      setUploading(false);
      toast({
        title: "Upload Failed",
        description: "Failed to upload file. Please try again.",
        variant: "destructive",
      });
    }
  };

  const onSubmit = (data: PaymentFormData) => {
    paymentMutation.mutate(data);
  };

  if (groupsLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="animate-pulse space-y-6">
            <div className="h-32 bg-gray-200 rounded-xl"></div>
            <div className="h-96 bg-gray-200 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 sm:pb-0">
      <Navigation />
      
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Make Payment</h1>
          <p className="text-gray-600">Submit your contribution with proof of payment for admin approval.</p>
        </div>

        {userGroups.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">No Groups Found</h3>
              <p className="text-gray-600 mb-6">
                You need to join a contribution group before you can make payments.
              </p>
              <Button 
                className="bg-nigerian-green hover:bg-forest-green"
                onClick={() => navigate("/join-group")}
                data-testid="button-find-groups"
              >
                Find Groups to Join
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Selected Group Info */}
            {selectedGroup && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Target className="h-5 w-5 mr-2 text-nigerian-green" />
                    {selectedGroup.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Target Amount</p>
                      <p className="text-lg font-semibold text-nigerian-green">
                        {formatNaira(selectedGroup.targetAmount || 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Collected So Far</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {formatNaira(selectedGroup.collectedAmount || 0)}
                      </p>
                    </div>
                  </div>
                  {selectedGroup.targetAmount && (
                    <div className="mt-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600">Progress</span>
                        <span className="font-medium">
                          {Math.round(((selectedGroup.collectedAmount || 0) / selectedGroup.targetAmount) * 100)}%
                        </span>
                      </div>
                      <Progress 
                        value={((selectedGroup.collectedAmount || 0) / selectedGroup.targetAmount) * 100} 
                        className="h-3"
                      />
                    </div>
                  )}
                  {selectedGroup.deadline && (
                    <div className="mt-4 flex items-center text-sm text-gray-600">
                      <Calendar className="h-4 w-4 mr-2" />
                      Deadline: {new Date(selectedGroup.deadline).toLocaleDateString()}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Payment Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="h-5 w-5 mr-2 text-nigerian-green" />
                  Payment Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* Group Selection */}
                    <FormField
                      control={form.control}
                      name="groupId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Select Group</FormLabel>
                          <Select 
                            onValueChange={(value) => {
                              field.onChange(value);
                              setSelectedGroupId(value);
                              form.setValue("purseId", ""); // Reset purse selection
                            }} 
                            defaultValue={field.value}
                            data-testid="select-group"
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Choose a group to contribute to" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {userGroups.map((membership) => (
                                <SelectItem key={membership.id} value={membership.groupId}>
                                  <div className="flex items-center justify-between w-full">
                                    <span>{membership.group.name}</span>
                                    <Badge variant="secondary" className="ml-2">
                                      {membership.group.memberCount || 0} members
                                    </Badge>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Project Selection (if group has projects) */}
                    {groupPurses.length > 0 && (
                      <FormField
                        control={form.control}
                        name="purseId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Select Project (Optional)</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Choose a specific project or leave empty for general contribution" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="">General Contribution</SelectItem>
                                {groupPurses.map((project) => (
                                  <SelectItem key={project.id} value={project.id}>
                                    <div className="flex items-center justify-between w-full">
                                      <span>{project.name}</span>
                                      <span className="text-xs text-gray-500 ml-2">
                                        {formatNaira(project.targetAmount)}
                                      </span>
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

                    {/* Payment Type Selection */}
                    <FormField
                      control={form.control}
                      name="paymentType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Method</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Choose your payment method" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {allowedPaymentTypes.map((paymentTypeValue) => {
                                const paymentType = PAYMENT_TYPES.find(type => type.value === paymentTypeValue);
                                return paymentType ? (
                                  <SelectItem key={paymentType.value} value={paymentType.value}>
                                    <div className="flex items-center">
                                      <span className="mr-2">{paymentType.icon}</span>
                                      <div>
                                        <div className="font-medium">{paymentType.label}</div>
                                        <div className="text-xs text-gray-500">{paymentType.description}</div>
                                      </div>
                                    </div>
                                  </SelectItem>
                                ) : null;
                              })}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Payment Account Details Display */}
                    {selectedPurse && form.watch("paymentType") && (
                      <PaymentAccountDetails 
                        project={selectedPurse}
                        selectedPaymentType={form.watch("paymentType")}
                      />
                    )}

                    {/* Amount */}
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount (₦)</FormLabel>
                          <FormControl>
                            <Input 
                              type="text" 
                              placeholder="Enter amount in Naira" 
                              {...field} 
                              data-testid="input-amount"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Payment Reference */}
                    <FormField
                      control={form.control}
                      name="reference"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bank Transfer Reference (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter transaction reference if you have one" 
                              {...field} 
                              data-testid="input-reference"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Proof of Payment Upload */}
                    <FormField
                      control={form.control}
                      name="proofOfPayment"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Proof of Payment</FormLabel>
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <div className="space-y-2">
                              <p className="text-sm font-medium text-gray-900">
                                Upload payment receipt or screenshot
                              </p>
                              <p className="text-xs text-gray-500">
                                PNG, JPG up to 5MB
                              </p>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileUpload}
                                className="hidden"
                                id="proof-upload"
                                data-testid="file-upload"
                              />
                              <Button 
                                asChild
                                variant="outline" 
                                className="cursor-pointer"
                                disabled={uploading}
                              >
                                <label htmlFor="proof-upload">
                                  {uploading ? "Uploading..." : "Choose File"}
                                </label>
                              </Button>
                              {field.value && (
                                <div className="flex items-center justify-center text-green-600 text-sm mt-2">
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  File uploaded successfully
                                </div>
                              )}
                            </div>
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
                          <FormLabel>Additional Notes (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Any additional information about this payment..." 
                              {...field} 
                              data-testid="textarea-notes"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Submit Button */}
                    <div className="flex justify-end space-x-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          form.reset();
                          setSelectedGroupId("");
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="bg-nigerian-green hover:bg-forest-green"
                        disabled={paymentMutation.isPending}
                        data-testid="submit-payment"
                      >
                        {paymentMutation.isPending ? "Submitting..." : "Submit Payment"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Payment Instructions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Info className="h-5 w-5 mr-2 text-blue-500" />
                  Payment Instructions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-nigerian-green text-white rounded-full flex items-center justify-center text-sm font-medium">
                      1
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Make Bank Transfer</h4>
                      <p className="text-sm text-gray-600">
                        Transfer the contribution amount to the group's designated bank account.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-nigerian-green text-white rounded-full flex items-center justify-center text-sm font-medium">
                      2
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Take Screenshot</h4>
                      <p className="text-sm text-gray-600">
                        Capture a clear screenshot or photo of your payment receipt.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-nigerian-green text-white rounded-full flex items-center justify-center text-sm font-medium">
                      3
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Submit Here</h4>
                      <p className="text-sm text-gray-600">
                        Fill out this form with payment details and upload your receipt for admin approval.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
                    <p className="text-sm font-medium text-yellow-800">Important Notice</p>
                  </div>
                  <p className="text-sm text-yellow-700 mt-1">
                    Your payment will be marked as "pending" until the group admin reviews and approves it. 
                    You'll receive a notification once it's confirmed.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}