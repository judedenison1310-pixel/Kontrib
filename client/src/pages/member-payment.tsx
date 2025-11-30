import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  CreditCard, 
  Upload, 
  Building2, 
  User,
  Phone,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  CheckCircle,
  Camera
} from "lucide-react";
import { formatNaira } from "@/lib/currency";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PaymentProject {
  id: string;
  name: string;
  targetAmount: string;
  collectedAmount: string;
  deadline: string;
  groupId: string;
  groupName: string;
}

interface BankDetails {
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export default function MemberPayment() {
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string>("");
  const [step, setStep] = useState<"select" | "instructions" | "upload" | "success">("select");
  const [copiedField, setCopiedField] = useState<string>("");
  
  const { toast } = useToast();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  // Fetch user's joined groups and their projects
  const { data: projects = [], isLoading: projectsLoading } = useQuery<PaymentProject[]>({
    queryKey: ["/api/contributions/member", user.id, "projects"],
    enabled: !!user.id
  });

  // Fetch bank details for the selected project's admin
  const { data: bankDetails } = useQuery<BankDetails>({
    queryKey: ["/api/bank-details", selectedProject],
    enabled: !!selectedProject
  });

  // Submit contribution mutation
  const submitContributionMutation = useMutation({
    mutationFn: async (contributionData: FormData) => {
      return apiRequest("POST", "/api/contributions", contributionData);
    },
    onSuccess: () => {
      setStep("success");
      queryClient.invalidateQueries({ queryKey: ["/api/contributions/member", user.id] });
    },
    onError: (error: any) => {
      toast({
        title: "Payment Submission Failed",
        description: error.message || "Failed to submit payment proof",
        variant: "destructive",
      });
    }
  });

  const selectedProjectData = projects.find(p => p.id === selectedProject);

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast({
        title: "Copied!",
        description: `${field} copied to clipboard`,
      });
      setTimeout(() => setCopiedField(""), 2000);
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Please copy manually",
        variant: "destructive",
      });
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid File",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select an image smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    setProofFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setProofPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitPayment = async () => {
    if (!selectedProject || !amount || !proofFile) {
      toast({
        title: "Missing Information",
        description: "Please fill all required fields and upload proof",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("projectId", selectedProject);
    formData.append("userId", user.id);
    formData.append("amount", amount);
    formData.append("reference", reference);
    formData.append("notes", notes);
    formData.append("proofOfPayment", proofFile);

    submitContributionMutation.mutate(formData);
  };

  const getProgressPercentage = (project: PaymentProject) => {
    const collected = parseFloat(project.collectedAmount || "0");
    const target = parseFloat(project.targetAmount || "1");
    return Math.min((collected / target) * 100, 100);
  };

  const getDaysLeft = (deadline: string) => {
    const deadlineDate = new Date(deadline);
    const now = new Date();
    const diffTime = deadlineDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(diffDays, 0);
  };

  if (projectsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-nigerian-green" />
          <span>Loading your groups...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 pb-24 md:pb-4 overflow-y-auto">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Make Contribution
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Choose a project and submit your payment proof
          </p>
        </div>

        {step === "select" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-nigerian-green" />
                Select Project & Amount
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {projects.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                    No Projects Available
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    You haven't joined any groups with active projects yet.
                  </p>
                  <Button 
                    onClick={() => window.location.href = "/groups"}
                    className="mt-4"
                  >
                    Browse Groups
                  </Button>
                </div>
              ) : (
                <>
                  <div>
                    <Label>Select Project</Label>
                    <Select onValueChange={setSelectedProject} value={selectedProject}>
                      <SelectTrigger data-testid="project-select">
                        <SelectValue placeholder="Choose a project to contribute to" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{project.name}</span>
                              <span className="text-sm text-gray-500">
                                {project.groupName}
                                {project.targetAmount && parseFloat(project.targetAmount) > 0 && (
                                  <> • {formatNaira(project.collectedAmount)} / {formatNaira(project.targetAmount)}</>
                                )}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedProjectData && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{selectedProjectData.name}</h4>
                        {selectedProjectData.deadline && (
                          <Badge variant={getDaysLeft(selectedProjectData.deadline) < 7 ? "destructive" : "secondary"}>
                            {getDaysLeft(selectedProjectData.deadline)} days left
                          </Badge>
                        )}
                      </div>
                      {selectedProjectData.targetAmount && parseFloat(selectedProjectData.targetAmount) > 0 && (
                        <>
                          <Progress value={getProgressPercentage(selectedProjectData)} className="h-2" />
                          <div className="flex justify-between text-sm text-gray-600">
                            <span>{formatNaira(selectedProjectData.collectedAmount)} raised</span>
                            <span>Goal: {formatNaira(selectedProjectData.targetAmount)}</span>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  <div>
                    <Label htmlFor="amount">Contribution Amount (₦)</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="Enter amount"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      data-testid="amount-input"
                    />
                  </div>

                  <Button 
                    onClick={() => setStep("instructions")}
                    disabled={!selectedProject || !amount}
                    className="w-full bg-nigerian-green hover:bg-forest-green"
                    data-testid="proceed-to-payment-button"
                  >
                    Proceed to Payment Instructions
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {step === "instructions" && bankDetails && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-nigerian-green" />
                Payment Instructions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Transfer Details</h4>
                <p className="text-blue-700 text-sm">
                  Transfer {formatNaira(amount)} to the account below, then upload your payment proof.
                </p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <Label className="text-xs text-gray-500">BANK NAME</Label>
                    <p className="font-medium">{bankDetails.bankName}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(bankDetails.bankName, "Bank Name")}
                    className="mt-4"
                  >
                    {copiedField === "Bank Name" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <Label className="text-xs text-gray-500">ACCOUNT NUMBER</Label>
                    <p className="font-mono font-medium text-lg">{bankDetails.accountNumber}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(bankDetails.accountNumber, "Account Number")}
                    className="mt-4"
                  >
                    {copiedField === "Account Number" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <Label className="text-xs text-gray-500">ACCOUNT NAME</Label>
                    <p className="font-medium">{bankDetails.accountName}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(bankDetails.accountName, "Account Name")}
                    className="mt-4"
                  >
                    {copiedField === "Account Name" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>

                <div className="p-4 bg-nigerian-green/10 border border-nigerian-green/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-nigerian-green" />
                    <span className="font-medium text-nigerian-green">Amount to Transfer</span>
                  </div>
                  <p className="text-2xl font-bold text-nigerian-green mt-1">
                    {formatNaira(amount)}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setStep("select")}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button 
                  onClick={() => setStep("upload")}
                  className="flex-1 bg-nigerian-green hover:bg-forest-green"
                >
                  I've Made the Transfer
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "upload" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-nigerian-green" />
                Upload Payment Proof
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pb-6">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-amber-800 text-sm">
                  Upload a screenshot or photo of your transfer receipt for verification.
                </p>
              </div>

              <div>
                <Label>Upload Proof of Payment *</Label>
                <div className="mt-2">
                  {!proofFile ? (
                    <label className="border-2 border-dashed border-gray-300 rounded-lg p-6 block cursor-pointer hover:border-nigerian-green transition-colors">
                      <div className="text-center">
                        <Camera className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-sm font-medium text-gray-900">Click to upload payment proof</p>
                        <p className="text-xs text-gray-500">PNG, JPG up to 10MB</p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                        data-testid="proof-upload-input"
                      />
                    </label>
                  ) : (
                    <div className="space-y-2">
                      <div className="relative border rounded-lg overflow-hidden">
                        <img 
                          src={proofPreview} 
                          alt="Payment proof" 
                          className="w-full h-48 object-contain bg-gray-50"
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setProofFile(null);
                          setProofPreview("");
                        }}
                        data-testid="change-image-button"
                      >
                        Change Image
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="reference">Transaction Reference (Optional)</Label>
                <Input
                  id="reference"
                  placeholder="Enter transaction reference if available"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  data-testid="reference-input"
                />
              </div>

              <div>
                <Label htmlFor="notes">Additional Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional information about this payment"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  data-testid="notes-textarea"
                />
              </div>

              {/* Mobile Sticky Button Area */}
              <div className="flex gap-2 md:relative fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-gray-800 border-t md:border-t-0 z-10 md:p-0">
                <Button 
                  variant="outline" 
                  onClick={() => setStep("instructions")}
                  className="flex-1"
                  data-testid="back-button"
                >
                  Back
                </Button>
                <Button 
                  onClick={handleSubmitPayment}
                  disabled={!proofFile || submitContributionMutation.isPending}
                  className="flex-1 bg-nigerian-green hover:bg-forest-green"
                  data-testid="submit-payment-button"
                >
                  {submitContributionMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Submit Payment Proof
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "success" && (
          <Card>
            <CardContent className="p-8 text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Payment Submitted Successfully!
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Your payment proof has been submitted for verification. The admin will review and confirm your contribution shortly.
              </p>
              
              <div className="space-y-3">
                <Button 
                  onClick={() => window.location.href = "/my-contributions"}
                  className="w-full"
                  variant="outline"
                >
                  View My Contributions
                </Button>
                <Button 
                  onClick={() => {
                    setStep("select");
                    setSelectedProject("");
                    setAmount("");
                    setReference("");
                    setNotes("");
                    setProofFile(null);
                    setProofPreview("");
                  }}
                  className="w-full bg-nigerian-green hover:bg-forest-green"
                >
                  Make Another Contribution
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}