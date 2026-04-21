import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ShieldCheck, MapPin, Users, ChevronRight, Sparkles } from "lucide-react";

interface DiscoveryGroup {
  id: string; name: string;
  state: string | null; lga: string | null;
  verifiedAt: string; verificationExpiresAt: string | null;
  memberCount: number;
  registrationLink: string; customSlug: string | null;
  match: "lga" | "state" | "other";
}

interface Props {
  userId?: string | null;
  state?: string | null;
  lga?: string | null;
}

export function VerifiedDiscoveryStrip({ userId, state, lga }: Props) {
  const [, setLocation] = useLocation();
  const params = new URLSearchParams();
  if (userId) params.set("userId", userId);
  if (state) params.set("state", state);
  if (lga) params.set("lga", lga);
  const qs = params.toString();

  const { data, isLoading } = useQuery<{ groups: DiscoveryGroup[] }>({
    queryKey: ["/api/discovery/verified-groups", userId || null, state || null, lga || null],
    queryFn: async () => {
      const res = await fetch(`/api/discovery/verified-groups${qs ? "?" + qs : ""}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  if (isLoading || !data || data.groups.length === 0) return null;
  const groups = data.groups;
  const hasNearby = groups.some(g => g.match !== "other");

  return (
    <section data-testid="verified-discovery-strip" className="space-y-2">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 inline-flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-green-600" />
            Verified groups{hasNearby && state ? ` near you` : ""}
          </h2>
          <p className="text-xs text-gray-500">Trusted Ajo groups you can request to join</p>
        </div>
      </div>
      <div className="-mx-4 px-4 overflow-x-auto pb-1">
        <div className="flex gap-3 min-w-min">
          {groups.map(g => {
            const slug = g.customSlug || g.registrationLink;
            const matchLabel = g.match === "lga" ? "Your area" : g.match === "state" ? "Your state" : null;
            return (
              <button
                key={g.id}
                onClick={() => setLocation(`/${slug}`)}
                className="shrink-0 w-56 text-left bg-white border border-gray-200 hover:border-green-400 hover:shadow-sm rounded-xl p-3 transition-all"
                data-testid={`discovery-card-${g.id}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-green-600 shrink-0" />
                      <p className="font-semibold text-sm text-gray-900 truncate">{g.name}</p>
                    </div>
                    {(g.lga || g.state) && (
                      <p className="text-xs text-gray-500 mt-1 inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {[g.lga, g.state].filter(Boolean).join(", ")}
                      </p>
                    )}
                  </div>
                  {matchLabel && (
                    <span className="shrink-0 inline-flex items-center gap-0.5 bg-green-100 text-green-700 text-[10px] font-medium px-1.5 py-0.5 rounded-full">
                      <Sparkles className="w-2.5 h-2.5" /> {matchLabel}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
                  <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                    <Users className="w-3 h-3" /> {g.memberCount} member{g.memberCount === 1 ? "" : "s"}
                  </span>
                  <span className="inline-flex items-center gap-0.5 text-xs font-medium text-green-700">
                    View <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
