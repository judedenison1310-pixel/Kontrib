import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Shield, Smartphone, TrendingUp, CheckCircle } from "lucide-react";
import { insertUserSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { setCurrentUser } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Please enter a valid phone number with country code (e.g., +234, +1, +44)"),
});

// OTP-based registration schema - no passwords needed
const registerSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  username: z.string().min(3, "Username must be at least 3 characters").max(20, "Username must be less than 20 characters"),
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Please enter a valid phone number with country code (e.g., +234, +1, +44)"),
  role: z.enum(["admin", "member"], { required_error: "Please select your role" }),
});

const otpSchema = z.object({
  otp: z.string().length(6, "OTP must be 6 digits"),
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;
type OtpFormData = z.infer<typeof otpSchema>;

export default function Landing() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [registrationStep, setRegistrationStep] = useState<"form" | "otp-verification" | "success">("form");
  const [loginStep, setLoginStep] = useState<"form" | "otp-verification">("form");
  const [otpData, setOtpData] = useState<{ phoneNumber: string; expiresAt: string; username?: string } | null>(null);
  const [newUser, setNewUser] = useState<any>(null);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", phoneNumber: "" },
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      username: "",
      phoneNumber: "",
      role: "member",
    },
  });

  const otpForm = useForm<OtpFormData>({
    resolver: zodResolver(otpSchema),
    defaultValues: {
      otp: "",
    },
  });

  const sendLoginOtpMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      const response = await apiRequest("POST", "/api/auth/send-login-otp", data);
      return response.json();
    },
    onSuccess: (data, variables) => {
      setOtpData({ 
        phoneNumber: variables.phoneNumber, 
        username: variables.username,
        expiresAt: data.expiresAt 
      });
      setLoginStep("otp-verification");
      toast({
        title: "OTP Sent!",
        description: `Verification code sent to ${variables.phoneNumber} via SMS.`,
      });
      
      // For development, show the OTP in console
      if (data.developmentOtp) {
        console.log("Development Login OTP:", data.developmentOtp);
        toast({
          title: "Development Mode",
          description: `Login OTP: ${data.developmentOtp}`,
          variant: "default",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid username or phone number.",
        variant: "destructive",
      });
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: { username: string; phoneNumber: string; otp: string }) => {
      const response = await apiRequest("POST", "/api/auth/login-with-otp", data);
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentUser(data.user);
      toast({
        title: "Welcome back!",
        description: "You have been successfully logged in.",
      });
      setLocation(data.user.role === "admin" ? "/admin" : "/member");
    },
    onError: (error: any) => {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid OTP or login details.",
        variant: "destructive",
      });
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
      setRegistrationStep("otp-verification");
      toast({
        title: "OTP Sent!",
        description: `Verification code sent to ${phoneNumber} via SMS.`,
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
    mutationFn: async (data: RegisterFormData & { otp: string }) => {
      // Create account with OTP verification
      const userData = {
        ...data,
        password: "otp-auth", // OTP-based auth marker
        role: data.role
      };
      
      const response = await apiRequest("POST", "/api/auth/register-with-otp", userData);
      return response.json();
    },
    onSuccess: (data) => {
      setNewUser(data.user);
      setCurrentUser(data.user);
      setRegistrationStep("success");
      toast({
        title: "Account Created!",
        description: `Welcome ${data.user.role === "admin" ? "Admin" : "Member"}! Your account has been created successfully.`,
      });
      
      // Redirect based on role after a short delay
      setTimeout(() => {
        setLocation(data.user.role === "admin" ? "/admin" : "/member");
      }, 2000);
    },
    onError: (error: any) => {
      toast({
        title: "Registration Failed",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const onLoginForm = (data: LoginFormData) => {
    sendLoginOtpMutation.mutate(data);
  };

  const onLoginOtpVerify = (data: OtpFormData) => {
    if (!otpData?.username || !otpData?.phoneNumber) return;
    
    loginMutation.mutate({
      username: otpData.username,
      phoneNumber: otpData.phoneNumber,
      otp: data.otp,
    });
  };

  const onRegister = (data: RegisterFormData) => {
    sendOtpMutation.mutate(data.phoneNumber);
  };

  const onOtpVerify = (data: OtpFormData) => {
    const registrationData = registerForm.getValues();
    registerMutation.mutate({
      ...registrationData,
      otp: data.otp,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-12 h-12 bg-nigerian-green rounded-lg flex items-center justify-center">
            <Users className="text-white h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-nigerian-green">Kontrib</h1>
            <p className="text-gray-600">WhatsApp Group Financial Management</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left side - Features */}
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Manage Group Contributions with Transparency
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                A mobile-optimized platform for managing financial contributions in WhatsApp groups with accountability and ease.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Users className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Group Management</h3>
                  <p className="text-sm text-gray-600">Create and manage multiple contribution groups with shareable links</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Shield className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Transparency</h3>
                  <p className="text-sm text-gray-600">Real-time tracking of contributions and payment status</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Smartphone className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">WhatsApp Integration</h3>
                  <p className="text-sm text-gray-600">Seamless integration with WhatsApp groups for easy sharing</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Financial Tracking</h3>
                  <p className="text-sm text-gray-600">Comprehensive reporting and contribution history</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right side - Auth Forms */}
          <div className="max-w-md mx-auto w-full">
            <Card>
              <CardHeader>
                <CardTitle className="text-center">Access Your Account</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "login" | "register")}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="login">Login</TabsTrigger>
                    <TabsTrigger value="register">Sign Up</TabsTrigger>
                  </TabsList>

                  <TabsContent value="login">
                    {loginStep === "form" && (
                      <Form {...loginForm}>
                        <form onSubmit={loginForm.handleSubmit(onLoginForm)} className="space-y-4">
                          <FormField
                            control={loginForm.control}
                            name="username"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Username</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter your username" {...field} data-testid="login-input-username" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={loginForm.control}
                            name="phoneNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>WhatsApp Phone Number</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g., +2348012345678, +1234567890, +441234567890" {...field} data-testid="login-input-phone" />
                                </FormControl>
                                <FormMessage />
                                <p className="text-xs text-gray-500 mt-1">
                                  We'll send an OTP to this number via SMS for verification
                                </p>
                              </FormItem>
                            )}
                          />

                          <Button 
                            type="submit" 
                            className="w-full bg-nigerian-green hover:bg-forest-green"
                            disabled={sendLoginOtpMutation.isPending}
                            data-testid="send-login-otp"
                          >
                            {sendLoginOtpMutation.isPending ? (
                              "Sending OTP..."
                            ) : (
                              <>
                                <Smartphone className="h-4 w-4 mr-2" />
                                Send OTP via SMS
                              </>
                            )}
                          </Button>
                        </form>
                      </Form>
                    )}

                    {loginStep === "otp-verification" && (
                      <div className="space-y-4">
                        <div className="text-center mb-6">
                          <h3 className="text-lg font-semibold text-gray-900">Verify Login</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            Enter the 6-digit code sent to {otpData?.phoneNumber}
                          </p>
                        </div>
                        
                        <Form {...otpForm}>
                          <form onSubmit={otpForm.handleSubmit(onLoginOtpVerify)} className="space-y-4">
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
                                      data-testid="login-input-otp"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <Button 
                              type="submit" 
                              className="w-full bg-nigerian-green hover:bg-forest-green"
                              disabled={loginMutation.isPending}
                              data-testid="verify-login-otp"
                            >
                              {loginMutation.isPending ? "Logging in..." : "Verify & Login"}
                            </Button>
                            
                            <div className="flex justify-between items-center text-sm">
                              <Button 
                                type="button"
                                variant="ghost" 
                                onClick={() => {
                                  setLoginStep("form");
                                  otpForm.reset();
                                }}
                                data-testid="back-to-login-form"
                              >
                                ← Back to Login
                              </Button>
                              <Button 
                                type="button"
                                variant="link" 
                                onClick={() => {
                                  if (otpData?.username && otpData?.phoneNumber) {
                                    sendLoginOtpMutation.mutate({
                                      username: otpData.username,
                                      phoneNumber: otpData.phoneNumber
                                    });
                                  }
                                }}
                                disabled={sendLoginOtpMutation.isPending}
                                data-testid="resend-login-otp"
                              >
                                Resend Code
                              </Button>
                            </div>
                          </form>
                        </Form>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="register">
                    {registrationStep === "form" && (
                      <div className="space-y-4">
                        <Form {...registerForm}>
                          <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                            <FormField
                              control={registerForm.control}
                              name="fullName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Full Name</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Enter your full name" {...field} data-testid="input-fullname" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={registerForm.control}
                              name="username"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Username (WhatsApp Nickname)</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Your WhatsApp nickname" {...field} data-testid="input-username" />
                                  </FormControl>
                                  <FormMessage />
                                  <p className="text-xs text-gray-500 mt-1">
                                    Use the same name you have in WhatsApp groups
                                  </p>
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={registerForm.control}
                              name="phoneNumber"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>WhatsApp Phone Number</FormLabel>
                                  <FormControl>
                                    <Input placeholder="e.g., +2348012345678, +1234567890, +441234567890" {...field} data-testid="input-phone" />
                                  </FormControl>
                                  <FormMessage />
                                  <p className="text-xs text-gray-500 mt-1">
                                    We'll send an OTP to this number via SMS text message for verification
                                  </p>
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={registerForm.control}
                              name="role"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Account Type</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value} data-testid="select-role">
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select your account type" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="member">
                                        <div className="flex items-center space-x-2">
                                          <Users className="h-4 w-4" />
                                          <div>
                                            <p className="font-medium">Group Member</p>
                                            <p className="text-xs text-gray-500">Join groups and make contributions</p>
                                          </div>
                                        </div>
                                      </SelectItem>
                                      <SelectItem value="admin">
                                        <div className="flex items-center space-x-2">
                                          <Shield className="h-4 w-4" />
                                          <div>
                                            <p className="font-medium">Group Admin</p>
                                            <p className="text-xs text-gray-500">Create and manage contribution groups</p>
                                          </div>
                                        </div>
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <Button 
                              type="submit" 
                              className="w-full bg-nigerian-green hover:bg-forest-green"
                              disabled={sendOtpMutation.isPending}
                              data-testid="send-otp"
                            >
                              {sendOtpMutation.isPending ? (
                                "Sending OTP..."
                              ) : (
                                <>
                                  <Smartphone className="h-4 w-4 mr-2" />
                                  Send OTP via SMS
                                </>
                              )}
                            </Button>
                          </form>
                        </Form>
                      </div>
                    )}

                    {registrationStep === "otp-verification" && (
                      <div className="space-y-4">
                        <div className="text-center mb-6">
                          <h3 className="text-lg font-semibold text-gray-900">Verify Your Phone</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            Enter the 6-digit code sent to {otpData?.phoneNumber}
                          </p>
                        </div>
                        
                        <Form {...otpForm}>
                          <form onSubmit={otpForm.handleSubmit(onOtpVerify)} className="space-y-4">
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
                              className="w-full bg-nigerian-green hover:bg-forest-green"
                              disabled={registerMutation.isPending}
                              data-testid="verify-otp"
                            >
                              {registerMutation.isPending ? "Creating Account..." : "Verify & Create Account"}
                            </Button>
                            
                            <div className="flex justify-between items-center text-sm">
                              <Button 
                                type="button"
                                variant="ghost" 
                                onClick={() => setRegistrationStep("form")}
                                data-testid="back-to-form"
                              >
                                ← Back to Form
                              </Button>
                              <Button 
                                type="button"
                                variant="link" 
                                onClick={() => sendOtpMutation.mutate(otpData?.phoneNumber || "")}
                                disabled={sendOtpMutation.isPending}
                                data-testid="resend-otp"
                              >
                                Resend Code
                              </Button>
                            </div>
                          </form>
                        </Form>
                      </div>
                    )}

                    {registrationStep === "success" && (
                      <div className="space-y-4">
                        <div className="text-center mb-6">
                          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="h-8 w-8 text-green-600" />
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900">Account Created!</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            Your account has been created successfully with OTP verification
                          </p>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                          <div>
                            <label className="text-xs text-gray-500 uppercase tracking-wide">Full Name</label>
                            <p className="font-medium">{newUser?.fullName}</p>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 uppercase tracking-wide">Username</label>
                            <p className="font-medium">{newUser?.username}</p>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 uppercase tracking-wide">WhatsApp Number</label>
                            <p className="font-medium">{newUser?.phoneNumber}</p>
                          </div>
                        </div>

                        <Button 
                          onClick={() => {
                            setCurrentUser(newUser);
                            setLocation("/member");
                          }} 
                          className="w-full bg-nigerian-green hover:bg-forest-green"
                          data-testid="go-to-dashboard"
                        >
                          Continue to Dashboard
                        </Button>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
