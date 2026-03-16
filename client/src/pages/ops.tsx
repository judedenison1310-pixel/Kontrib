import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Users,
  Gift,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  Banknote,
  Lock,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import kontribLogo from "@assets/8_1764455185903.png";

const OPS_PASS_KEY = "kontrib_ops_pass";

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 }).format(n);
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

type OpsData = {
  stats: {
    totalUsers: number;
    totalReferrals: number;
    completedReferrals: number;
    pendingReferrals: number;
    totalRewardsOwed: number;
    totalPaymentProofs: number;
    pendingProofs: number;
  };
  referrals: Array<{
    id: string;
    status: string;
    rewardAmount: string;
    createdAt: string;
    completedAt: string | null;
    referrer: { fullName: string | null; phoneNumber: string };
    referee: { fullName: string | null; phoneNumber: string };
  }>;
  contributions: Array<{
    id: string;
    userName: string;
    groupName: string;
    amount: string;
    status: string;
    paymentType: string;
    createdAt: string;
  }>;
};

export default function Ops() {
  const [password, setPassword] = useState(() => sessionStorage.getItem(OPS_PASS_KEY) || "");
  const [inputPassword, setInputPassword] = useState("");
  const [activeTab, setActiveTab] = useState<"referrals" | "payments">("payments");
  const [refFilter, setRefFilter] = useState<"all" | "complete" | "pending">("all");

  const { data, isLoading, isError, error, refetch } = useQuery<OpsData>({
    queryKey: ["/api/ops/overview", password],
    queryFn: async () => {
      const res = await fetch(`/api/ops/overview?password=${encodeURIComponent(password)}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed");
      }
      return res.json();
    },
    enabled: !!password,
    retry: false,
  });

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    sessionStorage.setItem(OPS_PASS_KEY, inputPassword);
    setPassword(inputPassword);
    setInputPassword("");
  };

  const handleLock = () => {
    sessionStorage.removeItem(OPS_PASS_KEY);
    setPassword("");
  };

  const filteredReferrals = (data?.referrals || []).filter(r =>
    refFilter === "all" ? true : r.status === refFilter
  );

  // Lock screen
  if (!password || (isError && (error as Error).message === "Unauthorised")) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="flex items-center justify-center gap-3 mb-8">
            <img src={kontribLogo} alt="Kontrib" className="w-10 h-10" />
            <div>
              <p className="font-bold text-white text-lg">Kontrib Ops</p>
              <p className="text-gray-400 text-xs">Internal Dashboard</p>
            </div>
          </div>
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-center w-12 h-12 bg-primary/20 rounded-full mx-auto mb-4">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              <p className="text-white text-center font-semibold mb-1">Team access only</p>
              <p className="text-gray-400 text-sm text-center mb-5">Enter your ops password to continue</p>
              <form onSubmit={handleUnlock} className="space-y-3">
                <Input
                  type="password"
                  placeholder="Ops password"
                  value={inputPassword}
                  onChange={e => setInputPassword(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                  autoFocus
                  data-testid="input-ops-password"
                />
                <button
                  type="submit"
                  className="w-full bg-primary text-white font-semibold py-2.5 rounded-lg hover:bg-primary/90 transition-colors"
                  data-testid="button-ops-unlock"
                >
                  Unlock
                </button>
                {isError && <p className="text-red-400 text-xs text-center">Incorrect password</p>}
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={kontribLogo} alt="Kontrib" className="w-8 h-8" />
          <div>
            <p className="font-bold text-sm">Kontrib Ops</p>
            <p className="text-gray-400 text-xs">Live dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={handleLock}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white border border-gray-700 rounded-lg px-3 py-1.5"
          >
            <Lock className="h-3.5 w-3.5" />
            Lock
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1,2,3,4].map(i => <div key={i} className="h-20 bg-gray-800 rounded-xl animate-pulse" />)}
          </div>
        ) : data && (
          <>
            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total Users", value: data.stats.totalUsers, icon: Users, color: "text-blue-400" },
                { label: "Rewards Owed", value: formatCurrency(data.stats.totalRewardsOwed), icon: Banknote, color: "text-green-400" },
                { label: "Pending Proofs", value: data.stats.pendingProofs, icon: CreditCard, color: "text-amber-400" },
                { label: "Completed Referrals", value: data.stats.completedReferrals, icon: Gift, color: "text-purple-400" },
              ].map(({ label, value, icon: Icon, color }) => (
                <Card key={label} className="bg-gray-900 border-gray-800">
                  <CardContent className="p-4">
                    <Icon className={`h-5 w-5 ${color} mb-2`} />
                    <p className="text-xl font-bold">{value}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-gray-800 pb-0">
              {(["payments", "referrals"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${
                    activeTab === tab
                      ? "border-primary text-primary"
                      : "border-transparent text-gray-400 hover:text-white"
                  }`}
                >
                  {tab === "payments" ? `Payments (${data.stats.totalPaymentProofs})` : `Referrals (${data.stats.totalReferrals})`}
                </button>
              ))}
            </div>

            {/* Payment Proofs tab */}
            {activeTab === "payments" && (
              <div className="space-y-2">
                {data.contributions.length === 0 ? (
                  <div className="text-center py-10 text-gray-500">No payment proofs yet</div>
                ) : data.contributions.map(c => (
                  <Card key={c.id} className="bg-gray-900 border-gray-800">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm">{c.userName}</p>
                          <span className="text-gray-500 text-xs">·</span>
                          <p className="text-gray-400 text-xs truncate">{c.groupName}</p>
                        </div>
                        <p className="text-gray-500 text-xs mt-0.5">{fmtDate(c.createdAt)} · {c.paymentType.replace(/_/g, " ")}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-sm">₦{parseFloat(c.amount).toLocaleString()}</p>
                        {c.status === "pending" ? (
                          <Badge className="bg-amber-500/20 text-amber-300 border-0 text-xs mt-1">
                            <Clock className="h-3 w-3 mr-1" />Pending
                          </Badge>
                        ) : c.status === "confirmed" ? (
                          <Badge className="bg-green-500/20 text-green-300 border-0 text-xs mt-1">
                            <CheckCircle2 className="h-3 w-3 mr-1" />Confirmed
                          </Badge>
                        ) : (
                          <Badge className="bg-red-500/20 text-red-300 border-0 text-xs mt-1">
                            <AlertCircle className="h-3 w-3 mr-1" />{c.status}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Referrals tab */}
            {activeTab === "referrals" && (
              <div className="space-y-3">
                {/* Filter pills */}
                <div className="flex gap-2">
                  {(["all", "complete", "pending"] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setRefFilter(f)}
                      className={`text-xs px-3 py-1 rounded-full capitalize transition-colors ${
                        refFilter === f
                          ? "bg-primary text-white"
                          : "bg-gray-800 text-gray-400 hover:text-white"
                      }`}
                    >
                      {f} {f === "all" ? `(${data.stats.totalReferrals})` : f === "complete" ? `(${data.stats.completedReferrals})` : `(${data.stats.pendingReferrals})`}
                    </button>
                  ))}
                </div>

                {filteredReferrals.length === 0 ? (
                  <div className="text-center py-10 text-gray-500">No referrals</div>
                ) : filteredReferrals.map(r => (
                  <Card key={r.id} className="bg-gray-900 border-gray-800">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 text-sm">
                          <span className="font-medium">{r.referrer.fullName || r.referrer.phoneNumber}</span>
                          <span className="text-gray-500 text-xs">referred</span>
                          <span className="font-medium">{r.referee.fullName || r.referee.phoneNumber}</span>
                        </div>
                        <p className="text-gray-500 text-xs mt-0.5">
                          {fmtDate(r.createdAt)}
                          {r.completedAt && ` · Completed ${fmtDate(r.completedAt)}`}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        {r.status === "complete" ? (
                          <>
                            <Badge className="bg-green-500/20 text-green-300 border-0 text-xs">
                              <CheckCircle2 className="h-3 w-3 mr-1" />Complete
                            </Badge>
                            <p className="text-green-400 text-xs font-bold mt-1">+{formatCurrency(parseFloat(r.rewardAmount))}</p>
                          </>
                        ) : (
                          <Badge className="bg-amber-500/20 text-amber-300 border-0 text-xs">
                            <Clock className="h-3 w-3 mr-1" />Pending
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {data.stats.completedReferrals > 0 && (
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between">
                    <span className="text-gray-400 text-sm">Total rewards owed</span>
                    <span className="text-green-400 font-bold">{formatCurrency(data.stats.totalRewardsOwed)}</span>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
