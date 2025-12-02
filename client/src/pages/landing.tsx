import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Users, Shield, ArrowRight, Lock } from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { type User as UserType } from "@shared/schema";
import { sendOtp, verifyOtp, updateProfile } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import kontribLogo from "@assets/8_1764455185903.png";
import heroImage from "@assets/landing page image_1764650881450.jpg";

const phoneSchema = z.object({
  phoneNumber: z.string().min(10, "Enter your WhatsApp number"),
});

const otpSchema = z.object({
  otp: z.string().length(6, "Enter the 6-digit code"),
});

const profileSchema = z.object({
  fullName: z.string().min(2, "Enter your name"),
});

type PhoneFormData = z.infer<typeof phoneSchema>;
type OtpFormData = z.infer<typeof otpSchema>;
type ProfileFormData = z.infer<typeof profileSchema>;

const REDIRECT_KEY = "kontrib_redirectTo";

export default function Landing() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<"phone" | "otp" | "profile" | "role">("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [newUser, setNewUser] = useState<UserType | null>(null);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const getRedirectPath = () => {
    const storedPath = localStorage.getItem(REDIRECT_KEY);
    if (storedPath) {
      localStorage.removeItem(REDIRECT_KEY);
      return storedPath;
    }
    return "/groups";
  };

  const phoneForm = useForm<PhoneFormData>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phoneNumber: "" },
  });

  const otpForm = useForm<OtpFormData>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: "" },
  });

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: "" },
  });

  const sendOtpMutation = useMutation({
    mutationFn: async (phone: string) => {
      return sendOtp(phone);
    },
    onSuccess: (data) => {
      setStep("otp");
      if (data.developmentOtp) {
        setDevOtp(data.developmentOtp);
      }
      toast({ 
        title: "Code sent!", 
        description: "Check your WhatsApp for the 6-digit code" 
      });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Couldn't send code", 
        description: error.message || "Please check your number and try again", 
        variant: "destructive" 
      });
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async (otp: string) => {
      return verifyOtp(phoneNumber, otp);
    },
    onSuccess: (data) => {
      if (data.verified && data.user) {
        setNewUser(data.user);
        if (data.isNewUser) {
          setStep("profile");
          toast({ title: "Phone verified!", description: "Let's set up your profile" });
        } else {
          toast({ 
            title: "Welcome back!", 
            description: `Good to see you, ${data.user.fullName || 'friend'}!` 
          });
          setLocation(getRedirectPath());
        }
      }
    },
    onError: (error: Error) => {
      toast({ 
        title: "Invalid code", 
        description: error.message || "Please check and try again", 
        variant: "destructive" 
      });
      otpForm.reset();
    },
  });

  const profileMutation = useMutation({
    mutationFn: async (data: { fullName: string; role?: string }) => {
      if (!newUser) throw new Error("No user");
      return updateProfile(newUser.id, data);
    },
    onSuccess: (user) => {
      toast({ title: "Welcome to Kontrib!", description: `You're all set, ${user.fullName}!` });
      setLocation(getRedirectPath());
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Try again", variant: "destructive" });
    },
  });

  const onPhoneSubmit = (data: PhoneFormData) => {
    setPhoneNumber(data.phoneNumber);
    sendOtpMutation.mutate(data.phoneNumber);
  };

  const onOtpSubmit = (data: OtpFormData) => {
    verifyOtpMutation.mutate(data.otp);
  };

  const onProfileSubmit = (data: ProfileFormData) => {
    setStep("role");
    profileForm.setValue("fullName", data.fullName);
  };

  const selectRole = (role: "member" | "admin") => {
    const fullName = profileForm.getValues("fullName");
    profileMutation.mutate({ fullName, role });
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    
    const currentOtp = otpForm.getValues("otp").split("");
    currentOtp[index] = value.slice(-1);
    const newOtp = currentOtp.join("").slice(0, 6);
    otpForm.setValue("otp", newOtp);
    
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
    
    if (newOtp.length === 6) {
      verifyOtpMutation.mutate(newOtp);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otpForm.getValues("otp")[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    otpForm.setValue("otp", pasted);
    if (pasted.length === 6) {
      verifyOtpMutation.mutate(pasted);
    }
  };

  useEffect(() => {
    if (step === "otp") {
      otpInputRefs.current[0]?.focus();
    }
  }, [step]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={kontribLogo} alt="Kontrib" className="w-9 h-9" />
          <span className="text-xl font-bold text-gray-900">Kontrib</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center px-6 pb-6">
        
        {step === "phone" && (
          <div className="w-full max-w-md text-center pt-4 flex-1 flex flex-col">
            <div className="mb-6">
              <h1 className="text-3xl sm:text-4xl font-black text-gray-900 leading-tight">
                Track Group Money Together
              </h1>
            </div>

            <div className="rounded-2xl overflow-hidden mb-6 shadow-lg">
              <img 
                src={heroImage} 
                alt="People using Kontrib" 
                className="w-full h-48 sm:h-56 object-cover"
                loading="eager"
              />
            </div>

            <p className="text-gray-600 text-base mb-6">
              See every payment. No more "who has paid?"
            </p>

            <div className="space-y-3">
              <Form {...phoneForm}>
                <form onSubmit={phoneForm.handleSubmit(onPhoneSubmit)} className="space-y-3">
                  <FormField
                    control={phoneForm.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input 
                            placeholder="WhatsApp number e.g. +2349056783314" 
                            className="h-14 text-base px-5 rounded-xl border-2 border-gray-200 focus:border-primary bg-white text-center font-medium" 
                            type="tel"
                            {...field}
                            data-testid="input-phone"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <button
                    type="submit"
                    disabled={sendOtpMutation.isPending}
                    className="btn-kontrib w-full rounded-xl"
                    data-testid="button-continue"
                  >
                    {sendOtpMutation.isPending ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <SiWhatsapp className="h-5 w-5" />
                        Continue with WhatsApp
                      </>
                    )}
                  </button>
                </form>
              </Form>
            </div>
          </div>
        )}

        {step === "otp" && (
          <div className="w-full max-w-md pt-8">
            <button
              onClick={() => {
                setStep("phone");
                otpForm.reset();
                setDevOtp(null);
              }}
              className="flex items-center gap-2 text-gray-500 hover:text-primary mb-6 transition-colors"
              data-testid="button-back-phone"
            >
              <ArrowRight className="h-4 w-4 rotate-180" />
              <span className="text-sm font-medium">Back</span>
            </button>
            
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="h-7 w-7 text-primary" />
                </div>
                <h2 className="text-2xl font-black text-gray-900">
                  Enter the code
                </h2>
                <p className="text-gray-500 mt-2">
                  Sent to <span className="font-semibold text-gray-700">{phoneNumber}</span>
                </p>
              </div>

              {devOtp && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-center">
                  <p className="text-sm text-yellow-800">
                    Dev mode: <span className="font-bold tracking-wider">{devOtp}</span>
                  </p>
                </div>
              )}

              <Form {...otpForm}>
                <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-5">
                  <div className="flex justify-center gap-3" onPaste={handleOtpPaste}>
                    {[0, 1, 2, 3, 4, 5].map((index) => (
                      <input
                        key={index}
                        ref={(el) => (otpInputRefs.current[index] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        className="w-11 h-13 text-center text-xl font-bold border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none bg-white"
                        value={otpForm.watch("otp")[index] || ""}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        disabled={verifyOtpMutation.isPending}
                        data-testid={`input-otp-${index}`}
                      />
                    ))}
                  </div>
                  
                  <button
                    type="submit"
                    disabled={verifyOtpMutation.isPending || otpForm.watch("otp").length < 6}
                    className="btn-kontrib w-full rounded-xl"
                    data-testid="button-verify-otp"
                  >
                    {verifyOtpMutation.isPending ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        Verify Code
                        <ArrowRight className="h-5 w-5" />
                      </>
                    )}
                  </button>
                </form>
              </Form>

              <div className="text-center">
                <button
                  onClick={() => sendOtpMutation.mutate(phoneNumber)}
                  disabled={sendOtpMutation.isPending}
                  className="text-primary font-medium hover:underline disabled:opacity-50 text-sm"
                  data-testid="button-resend-otp"
                >
                  {sendOtpMutation.isPending ? "Sending..." : "Didn't get it? Send again"}
                </button>
              </div>
            </div>
          </div>
        )}

        {step === "profile" && (
          <div className="w-full max-w-md pt-8">
            <button
              onClick={() => setStep("otp")}
              className="flex items-center gap-2 text-gray-500 hover:text-primary mb-6 transition-colors"
              data-testid="button-back-otp"
            >
              <ArrowRight className="h-4 w-4 rotate-180" />
              <span className="text-sm font-medium">Back</span>
            </button>
            
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-black text-gray-900">
                  What's your name?
                </h2>
                <p className="text-gray-500 mt-2">So group members can recognize you</p>
              </div>

              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                  <FormField
                    control={profileForm.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input 
                            placeholder="Your full name" 
                            className="h-14 text-lg rounded-xl border-2 border-gray-200 focus:border-primary px-5 bg-white" 
                            autoFocus
                            {...field}
                            data-testid="input-fullname"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <button
                    type="submit"
                    className="btn-kontrib w-full rounded-xl"
                    data-testid="button-next"
                  >
                    Continue
                    <ArrowRight className="h-5 w-5" />
                  </button>
                </form>
              </Form>
            </div>
          </div>
        )}

        {step === "role" && (
          <div className="w-full max-w-md pt-8">
            <button
              onClick={() => setStep("profile")}
              disabled={profileMutation.isPending}
              className="flex items-center gap-2 text-gray-500 hover:text-primary mb-6 transition-colors disabled:opacity-50"
              data-testid="button-back-profile"
            >
              <ArrowRight className="h-4 w-4 rotate-180" />
              <span className="text-sm font-medium">Back</span>
            </button>
            
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-black text-gray-900">
                  What do you want to do?
                </h2>
                <p className="text-gray-500 mt-2">You can change this later</p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => selectRole("member")}
                  disabled={profileMutation.isPending}
                  className="w-full bg-white border-2 border-gray-200 hover:border-primary hover:shadow-md rounded-xl p-4 text-left transition-all active:scale-[0.98] disabled:opacity-50"
                  data-testid="button-role-member"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">Join Groups</p>
                      <p className="text-gray-500 text-sm">Contribute and track payments</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => selectRole("admin")}
                  disabled={profileMutation.isPending}
                  className="w-full bg-white border-2 border-gray-200 hover:border-primary hover:shadow-md rounded-xl p-4 text-left transition-all active:scale-[0.98] disabled:opacity-50"
                  data-testid="button-role-admin"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Shield className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">Create Groups</p>
                      <p className="text-gray-500 text-sm">Manage and approve payments</p>
                    </div>
                  </div>
                </button>
              </div>

              {profileMutation.isPending && (
                <div className="flex items-center justify-center gap-3 text-primary py-3">
                  <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  <span className="font-medium text-sm">Setting up your account...</span>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="px-6 py-3 border-t border-gray-200 bg-white">
        <div className="flex items-center justify-between text-xs">
          <span className="text-kontrib-green font-semibold">kontrib.app</span>
          <span className="text-gray-400">2025 Kontrib</span>
        </div>
      </footer>
    </div>
  );
}
