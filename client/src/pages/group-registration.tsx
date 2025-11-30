import { useState } from "react";
import { useRoute, useLocation, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Users,
  Calendar,
  Target,
  CheckCircle,
  AlertCircle,
  Phone,
  MessageSquare,
  ArrowLeft,
} from "lucide-react";
import { formatNaira, calculateProgress } from "@/lib/currency";
import { getCurrentUser } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { type User } from "@shared/schema";

const REDIRECT_KEY = "kontrib_redirectTo";

// Form validation schemas
const registrationFormSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be less than 20 characters"),
  phoneNumber: z
    .string()
    .regex(
      /^\+?[1-9]\d{1,14}$/,
      "Please enter a valid phone number with country code (e.g., +234, +1, +44)",
    ),
});

const otpFormSchema = z.object({
  otp: z.string().length(6, "OTP must be 6 digits"),
});

type RegistrationFormData = z.infer<typeof registrationFormSchema>;
type OtpFormData = z.infer<typeof otpFormSchema>;

export default function GroupRegistration() {
  const [match, params] = useRoute("/register/:link");
  const urlParams = useParams();
  const registrationLink = params?.link || urlParams.link;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = getCurrentUser();
  const [step, setStep] = useState<
    "group-info" | "registration" | "otp-verification" | "success"
  >("group-info");
  const [otpData, setOtpData] = useState<{
    phoneNumber: string;
    expiresAt: string;
  } | null>(null);
  const [newUser, setNewUser] = useState<User | null>(null);

  const {
    data: groupData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/groups/registration", registrationLink],
    enabled: !!registrationLink,
  });

  const group = groupData?.group;

  const { data: purses = [] } = useQuery({
    queryKey: ["/api/groups", group?.id, "purses"],
    enabled: !!group,
  });

  const registrationForm = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationFormSchema),
    defaultValues: {
      fullName: "",
      username: "",
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
        description: data.fallback
          ? `Verification code sent (development mode). Check console for OTP.`
          : `Verification code sent to ${phoneNumber} via WhatsApp.`,
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

      const response = await apiRequest(
        "POST",
        `/api/groups/${group.id}/register-with-otp`,
        data,
      );
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

      const response = await apiRequest(
        "POST",
        `/api/groups/${group.id}/join`,
        {
          userId: user.id,
        },
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/groups", "user", user?.id],
      });
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
    localStorage.setItem(REDIRECT_KEY, window.location.pathname);
    setLocation("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">
            Loading group details...
          </p>
        </div>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-red-600 dark:text-red-400">
              <AlertCircle className="h-6 w-6" />
              <span>Group Not Found</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              The group you're looking for doesn't exist or the link has
              expired.
            </p>
            <Button
              onClick={() => setLocation("/")}
              className="w-full"
              data-testid="go-home"
            >
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderGroupInfo = () => (
    <div className="space-y-6">
      {/* Group Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
              <Users className="text-white h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-2xl text-green-600 dark:text-green-400">
                {group.name}
              </CardTitle>
              <p className="text-gray-600 dark:text-gray-300">
                {group.description}
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Purses List */}
      {purses.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Available Purses
          </h3>
          {purses.map((purse) => (
            <Card key={purse.id} className="p-4">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {purse.name}
                  </h4>
                  <Badge variant="outline">
                    {Math.round(
                      (Number(purse.collectedAmount) /
                        Number(purse.targetAmount)) *
                        100,
                    )}
                    %
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Target</p>
                    <p className="font-semibold">
                      {formatNaira(Number(purse.targetAmount))}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Deadline</p>
                    <p className="font-semibold">
                      {new Date(purse.deadline || "").toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Progress
                  value={Math.round(
                    (Number(purse.collectedAmount) /
                      Number(purse.targetAmount)) *
                      100,
                  )}
                  className="h-2"
                />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-3">
        <Button
          onClick={handleJoinGroup}
          className="w-full bg-green-600 hover:bg-green-700 text-white"
          data-testid="join-group"
        >
          <Users className="h-4 w-4 mr-2" />
          Join Group
        </Button>
        {user && (
          <Button
            variant="outline"
            onClick={handleLoginRedirect}
            className="w-full"
            data-testid="login-existing"
          >
            Already have an account? Login
          </Button>
        )}
      </div>
    </div>
  );

  const renderRegistration = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Button
          variant="ghost"
          onClick={() => setStep("group-info")}
          className="mb-4"
          data-testid="back-to-group"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Group Info
        </Button>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Join {group.name}
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Create your account to join this group
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Information</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...registrationForm}>
            <form
              onSubmit={registrationForm.handleSubmit(handleRegistrationSubmit)}
              className="space-y-4"
            >
              <FormField
                control={registrationForm.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter your full name"
                        {...field}
                        data-testid="input-fullname"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={registrationForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username (WhatsApp Group Nickname)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Your nickname in the WhatsApp group"
                        {...field}
                        data-testid="input-username"
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-sm text-gray-500">
                      Use the same name you have in the WhatsApp group
                    </p>
                  </FormItem>
                )}
              />

              <FormField
                control={registrationForm.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>WhatsApp Phone Number</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., +2348012345678, +1234567890, +441234567890"
                        {...field}
                        data-testid="input-phone"
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-sm text-gray-500">
                      We'll send an OTP to this number via WhatsApp for
                      verification
                    </p>
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={sendOtpMutation.isPending}
                data-testid="send-otp"
              >
                {sendOtpMutation.isPending ? (
                  "Sending OTP..."
                ) : (
                  <>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Send OTP via WhatsApp
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );

  const renderOtpVerification = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Button
          variant="ghost"
          onClick={() => setStep("registration")}
          className="mb-4"
          data-testid="back-to-registration"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Registration
        </Button>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Verify Your Phone
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Enter the 6-digit code sent to {otpData?.phoneNumber}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            OTP Verification
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...otpForm}>
            <form
              onSubmit={otpForm.handleSubmit(handleOtpSubmit)}
              className="space-y-4"
            >
              <FormField
                control={otpForm.control}
                name="otp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Verification Code</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter 6-digit code"
                        {...field}
                        maxLength={6}
                        className="text-center text-2xl tracking-widest"
                        data-testid="input-otp"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={registerMutation.isPending}
                data-testid="verify-otp"
              >
                {registerMutation.isPending
                  ? "Verifying..."
                  : "Verify & Join Group"}
              </Button>
            </form>
          </Form>

          <div className="mt-4 text-center">
            <Button
              variant="link"
              onClick={() => sendOtpMutation.mutate(otpData?.phoneNumber || "")}
              disabled={sendOtpMutation.isPending}
              data-testid="resend-otp"
            >
              Resend Code
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderSuccess = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Welcome to {group.name}!
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          You've successfully joined the group and can now make contributions
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Account</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <Label className="text-sm text-gray-500">Full Name</Label>
              <p className="font-medium">{newUser?.fullName}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-500">
                Username (WhatsApp Group Nickname)
              </Label>
              <p className="font-medium">{newUser?.username}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-500">
                WhatsApp Phone Number
              </Label>
              <p className="font-medium">{newUser?.phoneNumber}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <Button
          onClick={() => setLocation("/member")}
          className="w-full bg-green-600 hover:bg-green-700"
          data-testid="go-to-dashboard"
        >
          Go to Dashboard
        </Button>
        <Button
          onClick={() => setLocation("/join-group")}
          variant="outline"
          className="w-full"
          data-testid="join-another-group"
        >
          Join Another Group
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-md mx-auto pt-8">
        {step === "group-info" && renderGroupInfo()}
        {step === "registration" && renderRegistration()}
        {step === "otp-verification" && renderOtpVerification()}
        {step === "success" && renderSuccess()}
      </div>
    </div>
  );
}
