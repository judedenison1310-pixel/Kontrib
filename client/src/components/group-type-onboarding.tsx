import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { ChevronRight, X, Link2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { GROUP_TYPE_ORDER, GROUP_TYPE_META } from "@/lib/group-types";
import type { GroupType } from "@shared/schema";

interface GroupTypeOnboardingProps {
  userId: string;
  onPickType: (type: GroupType) => void;
  onJoinExisting: () => void;
}

export function GroupTypeOnboarding({ userId, onPickType, onJoinExisting }: GroupTypeOnboardingProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const dismissMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/users/${userId}/onboarding-choice`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
    onError: () => {
      toast({ title: "Couldn't save your choice", description: "Try again in a moment.", variant: "destructive" });
    },
  });

  const handlePick = (type: GroupType) => {
    dismissMutation.mutate();
    onPickType(type);
  };

  const handleJoin = () => {
    dismissMutation.mutate();
    onJoinExisting();
  };

  const handleSkip = () => {
    dismissMutation.mutate();
  };

  return (
    <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 via-white to-emerald-50 rounded-3xl overflow-hidden">
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900" data-testid="onboarding-heading">
              What brings you to Kontrib?
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Pick the kind of group you want to run — we'll set things up to match.
            </p>
          </div>
          <button
            onClick={handleSkip}
            disabled={dismissMutation.isPending}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-white/60 transition-colors shrink-0"
            aria-label="Skip"
            data-testid="button-onboarding-skip"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          {GROUP_TYPE_ORDER.map((type) => {
            const meta = GROUP_TYPE_META[type];
            const Icon = meta.icon;
            return (
              <button
                key={type}
                onClick={() => handlePick(type)}
                disabled={dismissMutation.isPending}
                className={`w-full text-left p-4 rounded-2xl border-2 ${meta.accentBg} hover:shadow-md transition-all active:scale-[0.99] flex items-start gap-3`}
                data-testid={`onboarding-pick-${type}`}
              >
                <div className={`w-11 h-11 rounded-xl bg-white flex items-center justify-center shrink-0 ${meta.accentText}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-gray-900">{meta.label}</p>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${meta.badgeBg} ${meta.accentText}`}>
                      {meta.tagline}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5">{meta.blurb}</p>
                  <p className="text-xs text-gray-400 mt-1">{meta.example}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400 shrink-0 mt-3" />
              </button>
            );
          })}
        </div>

        <div className="mt-5 pt-4 border-t border-amber-200/60 flex items-center justify-between gap-3">
          <p className="text-sm text-gray-600">Have an invite link?</p>
          <button
            onClick={handleJoin}
            disabled={dismissMutation.isPending}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
            data-testid="button-onboarding-join"
          >
            <Link2 className="h-4 w-4" />
            Join an existing group
          </button>
        </div>
      </div>
    </Card>
  );
}
