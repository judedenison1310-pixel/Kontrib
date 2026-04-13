import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navigation } from "@/components/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/lib/auth";
import {
  Gift,
  Copy,
  Check,
  Users,
  Trophy,
  Clock,
  CheckCircle2,
  Banknote,
  ChevronRight,
  Share2,
  ArrowLeft,
} from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

const REWARD_AMOUNT = 20000;
const REQUIRED_MEMBERS = 5;

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 }).format(amount);
}

export default function Referrals() {
  const user = getCurrentUser();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery<{
    code: string;
    stats: { total: number; completed: number; pending: number; totalEarned: number; pendingEarned: number };
    referrals: Array<{
      id: string;
      status: string;
      createdAt: string;
      completedAt: string | null;
      rewardAmount: string;
      referee: { fullName: string | null; phoneNumber: string };
    }>;
  }>({
    queryKey: ["/api/referrals/me", user?.id],
    queryFn: async () => {
      const res = await fetch(`/api/referrals/me?userId=${user?.id}`);
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
    enabled: !!user?.id,
  });

  const referralLink = data?.code
    ? `${window.location.origin}/ref/${data.code}`
    : "";

  const whatsappMessage = `💰 Want to manage your Ajo/Osusu properly?\n\nKontrib is a free app that tracks every group contribution — who paid, who hasn't, and how much is left. No more spreadsheets or forgotten payments!\n\nJoin me here 👇\n${referralLink}\n\n✅ Takes 30 seconds to sign up\n✅ Works for any group savings\n✅ Everyone can see the records in real time`;

  const copyLink = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Link copied!", description: "Share it with friends to earn ₦20,000 each" });
    });
  };

  const shareWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`;
    window.open(url, "_blank");
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="max-w-2xl mx-auto px-4 py-6 pb-28 space-y-5">
        {/* Back button */}
        <button
          onClick={() => setLocation("/groups")}
          className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {/* Hero banner */}
        <div className="bg-primary rounded-2xl p-6 text-white">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Gift className="h-5 w-5 text-green-200" />
                <span className="text-green-200 text-sm font-medium">Earn Rewards</span>
              </div>
              <h1 className="text-2xl font-bold">Refer &amp; Earn</h1>
              <p className="text-green-100 text-sm mt-1">
                Get <span className="font-bold text-white">₦20,000</span> for every friend whose group reaches {REQUIRED_MEMBERS} active members
              </p>
            </div>
            <div className="bg-white/15 rounded-2xl p-3 text-center min-w-[80px]">
              <p className="text-green-200 text-xs">Earned</p>
              <p className="font-bold text-lg leading-tight">
                {isLoading ? "—" : formatCurrency(data?.stats.totalEarned ?? 0)}
              </p>
            </div>
          </div>

          {/* Stats row */}
          {!isLoading && (
            <div className="grid grid-cols-3 gap-2 mt-4">
              <div className="bg-white/10 rounded-xl p-2.5 text-center">
                <p className="text-2xl font-bold">{data?.stats.total ?? 0}</p>
                <p className="text-green-200 text-xs">Referred</p>
              </div>
              <div className="bg-white/10 rounded-xl p-2.5 text-center">
                <p className="text-2xl font-bold">{data?.stats.completed ?? 0}</p>
                <p className="text-green-200 text-xs">Complete</p>
              </div>
              <div className="bg-white/10 rounded-xl p-2.5 text-center">
                <p className="text-2xl font-bold">{data?.stats.pending ?? 0}</p>
                <p className="text-green-200 text-xs">Pending</p>
              </div>
            </div>
          )}
        </div>

        {/* Pending earnings callout */}
        {!isLoading && (data?.stats.pendingEarned ?? 0) > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
            <Clock className="h-5 w-5 text-amber-500 flex-shrink-0" />
            <div>
              <p className="font-semibold text-amber-800 text-sm">
                {formatCurrency(data!.stats.pendingEarned)} pending
              </p>
              <p className="text-amber-700 text-xs mt-0.5">
                Waiting for your referrals' groups to reach {REQUIRED_MEMBERS} active members
              </p>
            </div>
          </div>
        )}

        {/* Your referral link */}
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2 text-gray-800 font-semibold">
              <Share2 className="h-4 w-4 text-primary" />
              Your referral link
            </div>

            {isLoading ? (
              <div className="h-12 bg-gray-100 rounded-xl animate-pulse" />
            ) : (
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl p-3">
                <span className="flex-1 text-sm text-gray-700 font-mono truncate">
                  {referralLink}
                </span>
                <button
                  onClick={copyLink}
                  className="flex items-center gap-1.5 bg-primary text-white text-xs font-medium px-3 py-1.5 rounded-lg shrink-0"
                  data-testid="button-copy-link"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            )}

            {/* Code badge */}
            {data?.code && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Your code:</span>
                <code className="bg-primary/10 text-primary text-sm font-bold px-2 py-0.5 rounded-lg tracking-widest">
                  {data.code}
                </code>
              </div>
            )}

            {/* WhatsApp share */}
            <button
              onClick={shareWhatsApp}
              className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#22c05e] text-white font-semibold py-3 rounded-xl transition-colors"
              data-testid="button-share-whatsapp"
            >
              <SiWhatsapp className="h-5 w-5" />
              Share via WhatsApp
            </button>
          </CardContent>
        </Card>

        {/* How it works */}
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardContent className="p-5 space-y-3">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-primary" />
              How it works
            </h3>
            <div className="space-y-3">
              {[
                { step: "1", text: "Share your unique referral link with friends" },
                { step: "2", text: "They sign up and create or join a Kontrib group" },
                { step: "3", text: `Their group reaches ${REQUIRED_MEMBERS} active members` },
                { step: "4", text: `You earn ${formatCurrency(REWARD_AMOUNT)} — automatically!` },
              ].map(({ step, text }) => (
                <div key={step} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center shrink-0">
                    {step}
                  </div>
                  <p className="text-sm text-gray-700">{text}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Referrals list */}
        <div>
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Your referrals
            {(data?.stats.total ?? 0) > 0 && (
              <Badge className="bg-primary/10 text-primary border-0 text-xs">
                {data?.stats.total}
              </Badge>
            )}
          </h3>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (data?.referrals?.length ?? 0) === 0 ? (
            <Card className="border-0 shadow-sm rounded-2xl">
              <CardContent className="p-8 text-center">
                <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Users className="h-7 w-7 text-primary" />
                </div>
                <p className="font-semibold text-gray-800">No referrals yet</p>
                <p className="text-sm text-gray-500 mt-1">
                  Share your link above and start earning ₦20,000 per referral
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {data!.referrals.map((referral) => (
                <Card key={referral.id} className="border-0 shadow-sm rounded-2xl">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                      {referral.referee.fullName?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {referral.referee.fullName || "Unnamed user"}
                      </p>
                      <p className="text-xs text-gray-500">
                        Joined {new Date(referral.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      {referral.status === "complete" ? (
                        <div className="flex flex-col items-end gap-1">
                          <Badge className="bg-green-100 text-green-700 border-0 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Complete
                          </Badge>
                          <span className="text-xs font-semibold text-green-700">
                            +{formatCurrency(REWARD_AMOUNT)}
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-end gap-1">
                          <Badge className="bg-amber-100 text-amber-700 border-0 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Pending
                          </Badge>
                          <span className="text-xs text-gray-400">
                            Needs {REQUIRED_MEMBERS} members
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-gray-400 pb-2">
          Rewards are processed monthly. Terms &amp; conditions apply.
        </p>
      </div>
    </div>
  );
}
