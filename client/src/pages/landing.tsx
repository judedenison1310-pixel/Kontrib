import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Users, Shield, ArrowRight, Lock, CheckCircle2, Zap } from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { type User as UserType } from "@shared/schema";
import { sendOtp, verifyOtp, updateProfile } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import kontribLogo from "@assets/8_1764455185903.png";
import heroImage from "@assets/Komntrib (2)_1764653626078.jpg";

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
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <img src={kontribLogo} alt="Kontrib" className="w-10 h-10" />
          <span className="text-xl font-bold text-gray-900">Kontrib</span>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto px-4 py-6 w-full">
        {step === "phone" && (
          <div className="space-y-8">
            {/* Hero Image - text embedded in image */}
            <div className="rounded-2xl overflow-hidden shadow-lg">
              <img 
                src={heroImage} 
                alt="Track group money with ease" 
                className="w-full aspect-square object-cover"
              />
            </div>

            {/* Login Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <p className="text-gray-600 text-center mb-6">
                Everyone sees every kobo. Instantly.
              </p>

              <Form {...phoneForm}>
                <form onSubmit={phoneForm.handleSubmit(onPhoneSubmit)} className="space-y-4">
                  <FormField
                    control={phoneForm.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input 
                            placeholder="+234 XXX XXX XXXX" 
                            className="h-14 text-base px-4 rounded-xl border-gray-200 text-center font-medium focus:border-green-500 focus:ring-green-500" 
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
                    className="w-full h-14 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
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

            {/* Trust Indicators */}
            <div className="flex items-center justify-center gap-6">
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span>Transparent</span>
              </div>
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span>Secure</span>
              </div>
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <Zap className="w-4 h-4 text-green-600" />
                <span>Fast</span>
              </div>
            </div>
          </div>
        )}

        {step === "otp" && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <button
              onClick={() => {
                setStep("phone");
                otpForm.reset();
                setDevOtp(null);
              }}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6 transition-colors"
              data-testid="button-back-phone"
            >
              <ArrowRight className="h-4 w-4 rotate-180" />
              <span className="text-sm font-medium">Back</span>
            </button>
            
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Lock className="h-7 w-7 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                Enter Code
              </h2>
              <p className="text-gray-500 mt-2">
                Sent to <span className="text-gray-900 font-medium">{phoneNumber}</span>
              </p>
            </div>

            {devOtp && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-center mb-4">
                <p className="text-sm text-yellow-800">
                  Dev: <span className="font-bold tracking-wider">{devOtp}</span>
                </p>
              </div>
            )}

            <Form {...otpForm}>
              <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-5">
                <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <input
                      key={index}
                      ref={(el) => (otpInputRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      className="w-11 h-13 text-center text-xl font-bold border border-gray-200 rounded-xl bg-gray-50 text-gray-900 focus:border-green-500 focus:ring-2 focus:ring-green-500 focus:outline-none"
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
                  className="w-full h-14 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all"
                  data-testid="button-verify-otp"
                >
                  {verifyOtpMutation.isPending ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Verify"
                  )}
                </button>
              </form>
            </Form>

            <div className="text-center mt-4">
              <button
                onClick={() => sendOtpMutation.mutate(phoneNumber)}
                disabled={sendOtpMutation.isPending}
                className="text-green-600 font-medium hover:underline disabled:opacity-50"
                data-testid="button-resend-otp"
              >
                {sendOtpMutation.isPending ? "Sending..." : "Resend code"}
              </button>
            </div>
          </div>
        )}

        {step === "profile" && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <button
              onClick={() => setStep("otp")}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6 transition-colors"
              data-testid="button-back-otp"
            >
              <ArrowRight className="h-4 w-4 rotate-180" />
              <span className="text-sm font-medium">Back</span>
            </button>
            
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                What's your name?
              </h2>
              <p className="text-gray-500 mt-2">So your group knows who you are</p>
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
                          className="h-14 text-base px-4 rounded-xl border-gray-200 font-medium focus:border-green-500 focus:ring-green-500" 
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
                  className="w-full h-14 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  data-testid="button-next"
                >
                  Continue
                  <ArrowRight className="h-5 w-5" />
                </button>
              </form>
            </Form>
          </div>
        )}

        {step === "role" && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <button
              onClick={() => setStep("profile")}
              disabled={profileMutation.isPending}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6 transition-colors disabled:opacity-50"
              data-testid="button-back-profile"
            >
              <ArrowRight className="h-4 w-4 rotate-180" />
              <span className="text-sm font-medium">Back</span>
            </button>
            
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                How will you use Kontrib?
              </h2>
              <p className="text-gray-500 mt-2">You can always do both later</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => selectRole("member")}
                disabled={profileMutation.isPending}
                className="w-full bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-green-300 rounded-2xl p-4 text-left transition-all active:scale-[0.98] disabled:opacity-50"
                data-testid="button-role-member"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Users className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">Join a Group</p>
                    <p className="text-gray-500 text-sm">Pay and track contributions</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => selectRole("admin")}
                disabled={profileMutation.isPending}
                className="w-full bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-green-300 rounded-2xl p-4 text-left transition-all active:scale-[0.98] disabled:opacity-50"
                data-testid="button-role-admin"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Shield className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">Create a Group</p>
                    <p className="text-gray-500 text-sm">Manage and approve payments</p>
                  </div>
                </div>
              </button>
            </div>

            {profileMutation.isPending && (
              <div className="flex items-center justify-center gap-3 text-green-600 py-4 mt-4">
                <div className="w-5 h-5 border-2 border-green-200 border-t-green-600 rounded-full animate-spin" />
                <span className="font-medium text-sm">Setting up...</span>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer - pushed to bottom */}
      <footer className="py-6 mt-auto">
        <div className="text-center text-sm text-gray-400">
          kontrib.app
        </div>
      </footer>
    </div>
  );
}
