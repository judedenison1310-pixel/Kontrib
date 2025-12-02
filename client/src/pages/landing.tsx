import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Users, Shield, ArrowRight, Lock, CheckCircle2 } from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { type User as UserType } from "@shared/schema";
import { sendOtp, verifyOtp, updateProfile } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import kontribLogo from "@assets/8_1764455185903.png";
import heroImage from "@assets/stock_images/african_people_smili_bbf3eb72.jpg";

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
    <div className="min-h-screen relative overflow-hidden">
      {/* Background with gradient overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900/95 via-gray-900/90 to-emerald-900/80" />
      
      {/* Decorative elements */}
      <div className="absolute top-20 right-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
      
      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        <header className="px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={kontribLogo} alt="Kontrib" className="w-10 h-10" />
            <span className="text-xl font-bold text-white">Kontrib</span>
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
          
          {step === "phone" && (
            <div className="w-full max-w-sm">
              {/* Glass card */}
              <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl">
                <div className="text-center mb-8">
                  <h1 className="text-3xl font-black text-white leading-tight mb-3">
                    Group Money,<br />Made Simple
                  </h1>
                  <p className="text-white/70 text-sm">
                    Everyone sees every kobo. Instantly.
                  </p>
                </div>

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
                              className="h-14 text-base px-5 rounded-2xl border-0 bg-white/20 backdrop-blur text-white placeholder:text-white/50 text-center font-medium focus:ring-2 focus:ring-emerald-400" 
                              type="tel"
                              {...field}
                              data-testid="input-phone"
                            />
                          </FormControl>
                          <FormMessage className="text-red-300" />
                        </FormItem>
                      )}
                    />
                    <button
                      type="submit"
                      disabled={sendOtpMutation.isPending}
                      className="w-full h-14 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/30 active:scale-[0.98]"
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

                {/* Trust indicators */}
                <div className="mt-8 pt-6 border-t border-white/10">
                  <div className="flex items-center justify-center gap-6 text-white/50 text-xs">
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Transparent</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Secure</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Free</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === "otp" && (
            <div className="w-full max-w-sm">
              <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl">
                <button
                  onClick={() => {
                    setStep("phone");
                    otpForm.reset();
                    setDevOtp(null);
                  }}
                  className="flex items-center gap-2 text-white/60 hover:text-white mb-6 transition-colors"
                  data-testid="button-back-phone"
                >
                  <ArrowRight className="h-4 w-4 rotate-180" />
                  <span className="text-sm font-medium">Back</span>
                </button>
                
                <div className="text-center mb-6">
                  <div className="w-14 h-14 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Lock className="h-7 w-7 text-emerald-400" />
                  </div>
                  <h2 className="text-2xl font-black text-white">
                    Enter Code
                  </h2>
                  <p className="text-white/60 mt-2 text-sm">
                    Sent to <span className="text-white font-medium">{phoneNumber}</span>
                  </p>
                </div>

                {devOtp && (
                  <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-xl p-3 text-center mb-4">
                    <p className="text-sm text-yellow-200">
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
                          className="w-11 h-13 text-center text-xl font-bold border-0 rounded-xl bg-white/20 text-white focus:ring-2 focus:ring-emerald-400 focus:outline-none"
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
                      className="w-full h-14 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all"
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
                    className="text-emerald-400 font-medium hover:underline disabled:opacity-50 text-sm"
                    data-testid="button-resend-otp"
                  >
                    {sendOtpMutation.isPending ? "Sending..." : "Resend code"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === "profile" && (
            <div className="w-full max-w-sm">
              <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl">
                <button
                  onClick={() => setStep("otp")}
                  className="flex items-center gap-2 text-white/60 hover:text-white mb-6 transition-colors"
                  data-testid="button-back-otp"
                >
                  <ArrowRight className="h-4 w-4 rotate-180" />
                  <span className="text-sm font-medium">Back</span>
                </button>
                
                <div className="mb-6">
                  <h2 className="text-2xl font-black text-white">
                    What's your name?
                  </h2>
                  <p className="text-white/60 mt-2 text-sm">So your group knows who you are</p>
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
                              className="h-14 text-base px-5 rounded-2xl border-0 bg-white/20 backdrop-blur text-white placeholder:text-white/50 font-medium focus:ring-2 focus:ring-emerald-400" 
                              autoFocus
                              {...field}
                              data-testid="input-fullname"
                            />
                          </FormControl>
                          <FormMessage className="text-red-300" />
                        </FormItem>
                      )}
                    />
                    <button
                      type="submit"
                      className="w-full h-14 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all"
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
            <div className="w-full max-w-sm">
              <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl">
                <button
                  onClick={() => setStep("profile")}
                  disabled={profileMutation.isPending}
                  className="flex items-center gap-2 text-white/60 hover:text-white mb-6 transition-colors disabled:opacity-50"
                  data-testid="button-back-profile"
                >
                  <ArrowRight className="h-4 w-4 rotate-180" />
                  <span className="text-sm font-medium">Back</span>
                </button>
                
                <div className="mb-6">
                  <h2 className="text-2xl font-black text-white">
                    How will you use Kontrib?
                  </h2>
                  <p className="text-white/60 mt-2 text-sm">You can always do both later</p>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => selectRole("member")}
                    disabled={profileMutation.isPending}
                    className="w-full bg-white/10 hover:bg-white/20 border border-white/20 hover:border-emerald-400/50 rounded-2xl p-4 text-left transition-all active:scale-[0.98] disabled:opacity-50"
                    data-testid="button-role-member"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Users className="h-6 w-6 text-emerald-400" />
                      </div>
                      <div>
                        <p className="font-bold text-white">Join a Group</p>
                        <p className="text-white/50 text-sm">Pay and track contributions</p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => selectRole("admin")}
                    disabled={profileMutation.isPending}
                    className="w-full bg-white/10 hover:bg-white/20 border border-white/20 hover:border-emerald-400/50 rounded-2xl p-4 text-left transition-all active:scale-[0.98] disabled:opacity-50"
                    data-testid="button-role-admin"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Shield className="h-6 w-6 text-emerald-400" />
                      </div>
                      <div>
                        <p className="font-bold text-white">Create a Group</p>
                        <p className="text-white/50 text-sm">Manage and approve payments</p>
                      </div>
                    </div>
                  </button>
                </div>

                {profileMutation.isPending && (
                  <div className="flex items-center justify-center gap-3 text-emerald-400 py-4 mt-4">
                    <div className="w-5 h-5 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
                    <span className="font-medium text-sm">Setting up...</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>

        <footer className="px-6 py-4">
          <div className="flex items-center justify-center text-xs text-white/40">
            <span>kontrib.app &middot; 2025</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
