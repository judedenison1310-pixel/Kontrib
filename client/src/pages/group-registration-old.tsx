import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Users, Calendar, Target, CheckCircle, AlertCircle, Phone, MessageSquare } from "lucide-react";
import { formatNaira, calculateProgress } from "@/lib/currency";
import { getCurrentUser } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Form validation schemas
const registrationFormSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(20, "Username must be less than 20 characters"),
  fullName: z.string().min(2, "Full name is required"),
  phoneNumber: z.string().regex(/^(\+234|0)[7-9]\d{9}$/, "Please enter a valid Nigerian phone number"),
});

const otpFormSchema = z.object({
  otp: z.string().length(6, "OTP must be 6 digits"),
});

type RegistrationFormData = z.infer<typeof registrationFormSchema>;
type OtpFormData = z.infer<typeof otpFormSchema>;

export default function GroupRegistration() {
  const [match, params] = useRoute("/register/:link");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = getCurrentUser();
  const [isJoining, setIsJoining] = useState(false);
  const [step, setStep] = useState<"group-info" | "registration" | "otp-verification" | "success">("group-info");
  const [otpData, setOtpData] = useState<{ phoneNumber: string; expiresAt: string } | null>(null);
  const [newUser, setNewUser] = useState<any>(null);

  const { data: group, isLoading, error } = useQuery({
    queryKey: ["/api/groups/registration", params?.link],
    enabled: !!params?.link,
  });

  const registrationForm = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationFormSchema),
    defaultValues: {
      username: "",
      fullName: "",
      phoneNumber: "",
    },
  });

  const otpForm = useForm<OtpFormData>({
    resolver: zodResolver(otpFormSchema),
    defaultValues: {
      otp: "",
    },
  });

  const sendOtpMutation = useMutation({
    mutationFn: async (phoneNumber: string) => {
      const response = await apiRequest("POST", "/api/auth/send-otp", {
        phoneNumber,
      });
      return response.json();
    },
    onSuccess: (data, phoneNumber) => {
      setOtpData({ phoneNumber, expiresAt: data.expiresAt });
      setStep("otp-verification");
      toast({
        title: "OTP Sent!",
        description: `Verification code sent to ${phoneNumber}. Check your WhatsApp messages.`,
      });
      
      // For development, show the OTP in console
      if (data.developmentOtp) {
        console.log("Development OTP:", data.developmentOtp);
        toast({
          title: "Development Mode",
          description: `OTP: ${data.developmentOtp} (Check console for details)`,
          variant: "default",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Send OTP",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegistrationFormData & { otp: string }) => {
      if (!group) throw new Error("Group not found");
      
      const response = await apiRequest("POST", `/api/groups/${group.id}/register-with-otp`, data);
      return response.json();
    },
    onSuccess: (data) => {
      setNewUser(data.user);
      setStep("success");
      toast({
        title: "Registration Successful!",
        description: `Welcome to ${group?.name}! You can now make contributions.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Registration Failed",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const joinGroupMutation = useMutation({
    mutationFn: async () => {
      if (!group || !user) throw new Error("Missing group or user data");
      
      const response = await apiRequest("POST", `/api/groups/${group.id}/join`, {
        userId: user.id,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups", "user", user?.id] });
      toast({
        title: "Successfully Joined!",
        description: `You are now a member of ${group?.name}`,
      });
      setLocation("/member");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Join Group",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const handleJoinGroup = () => {
    if (!user) {
      setStep("registration");
      return;
    }
    
    setIsJoining(true);
    joinGroupMutation.mutate();
  };

  const handleRegistrationSubmit = (data: RegistrationFormData) => {
    sendOtpMutation.mutate(data.phoneNumber);
  };

  const handleOtpSubmit = (data: OtpFormData) => {
    const registrationData = registrationForm.getValues();
    registerMutation.mutate({
      ...registrationData,
      otp: data.otp,
    });
  };

  const handleLoginRedirect = () => {
    // Store the group link in localStorage so user can return after login
    localStorage.setItem('pendingGroupJoin', params?.link || '');
    setLocation("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading group details...</p>
        </div>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Group Not Found</h2>
              <p className="text-gray-600 mb-6">
                This group link is invalid or may have expired.
              </p>
              <Button onClick={() => setLocation("/")} className="bg-nigerian-green hover:bg-forest-green">
                Go to Homepage
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progress = calculateProgress(group.collectedAmount, group.targetAmount);
  const deadline = group.deadline ? new Date(group.deadline) : null;
  const isExpired = deadline && deadline < new Date();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-nigerian-green rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="text-white h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Join Group</h1>
          <p className="text-gray-600">You've been invited to contribute to a financial group</p>
        </div>

        {/* Group Info Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">{group.name}</CardTitle>
              <Badge className={group.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                {group.status}
              </Badge>
            </div>
            {group.description && (
              <p className="text-gray-600 mt-2">{group.description}</p>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Financial Progress */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-600">Collection Progress</span>
                  <span className="text-sm font-medium">{progress}%</span>
                </div>
                <Progress value={progress} className="h-3 mb-3" />
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Target Amount</p>
                    <p className="font-semibold text-lg">{formatNaira(group.targetAmount)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Collected</p>
                    <p className="font-semibold text-lg text-green-600">{formatNaira(group.collectedAmount)}</p>
                  </div>
                </div>
              </div>

              {/* Deadline */}
              {deadline && (
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Calendar className="h-5 w-5 text-gray-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Collection Deadline</p>
                    <p className={`text-sm ${isExpired ? 'text-red-600' : 'text-gray-600'}`}>
                      {deadline.toLocaleDateString('en-NG', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                      {isExpired && " (Expired)"}
                    </p>
                  </div>
                </div>
              )}

              {/* WhatsApp Link */}
              {group.whatsappLink && (
                <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                  <Users className="h-5 w-5 text-green-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">WhatsApp Group</p>
                    <p className="text-sm text-gray-600">Join the discussion group</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(group.whatsappLink, '_blank')}
                    className="border-green-600 text-green-600 hover:bg-green-50"
                  >
                    Join Chat
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Section */}
        <Card>
          <CardContent className="pt-6">
            {user ? (
              <div className="text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to Join?</h3>
                <p className="text-gray-600 mb-6">
                  You'll be able to make contributions and track the group's progress once you join.
                </p>
                <Button
                  onClick={handleJoinGroup}
                  disabled={isJoining || joinGroupMutation.isPending || isExpired}
                  className="w-full bg-nigerian-green hover:bg-forest-green"
                >
                  {isJoining || joinGroupMutation.isPending 
                    ? "Joining Group..." 
                    : isExpired 
                    ? "Group Expired" 
                    : "Join Group"
                  }
                </Button>
                <p className="text-xs text-gray-500 mt-3">
                  By joining, you agree to contribute to this group's financial goal.
                </p>
              </div>
            ) : (
              <div className="text-center">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Account Required</h3>
                <p className="text-gray-600 mb-6">
                  Please create an account or login to join this group.
                </p>
                <div className="space-y-3">
                  <Button
                    onClick={() => setLocation("/")}
                    className="w-full bg-nigerian-green hover:bg-forest-green"
                  >
                    Login / Register
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
