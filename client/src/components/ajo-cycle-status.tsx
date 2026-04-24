import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ChevronRight, Trophy, CheckCircle2, Clock, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getCurrentUser } from "@/lib/auth";
import { formatNaira } from "@/lib/currency";
import type { AjoStatus, User } from "@shared/schema";

interface MemberRow { userId: string; user: User }

interface AjoCycleStatusProps {
  groupId: string;
  status: AjoStatus;
  members: MemberRow[];
  isAdmin: boolean;
}

const FREQUENCY_LABEL: Record<string, string> = {
  weekly: "weekly",
  biweekly: "every 2 weeks",
  monthly: "monthly",
};

function memberLabel(u: User | null): string {
  if (!u) return "—";
  return u.fullName?.trim() || u.phoneNumber || "Member";
}

function formatDueDate(d: Date | string | null): string {
  if (!d) return "No date set";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function daysUntil(d: Date | string | null): number | null {
  if (!d) return null;
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return diff;
}

export function AjoCycleStatus({ groupId, status, members, isAdmin }: AjoCycleStatusProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const actor = getCurrentUser();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { settings, currentCycle, paidCount, expectedCount } = status;
  const cycleNumber = settings.currentCycleNumber;
  const totalRounds = settings.totalRounds;
  const isCompleted = settings.status === "completed";

  // Build a name lookup so we can render the upcoming queue.
  const nameById = new Map<string, string>();
  members.forEach(m => nameById.set(m.userId, memberLabel(m.user)));
  const order = settings.payoutOrder ?? [];

  const advanceMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/groups/${groupId}/ajo/advance`, {
        actorId: actor?.id,
      });
      return res.json();
    },
    onSuccess: (data: AjoStatus) => {
      qc.invalidateQueries({ queryKey: ["/api/groups", groupId, "ajo"] });
      qc.invalidateQueries({ queryKey: ["/api/groups", groupId, "projects"] });
      qc.invalidateQueries({ queryKey: ["/api/groups", groupId] });
      setConfirmOpen(false);
      if (data?.settings?.status === "completed") {
        toast({
          title: "Round complete",
          description: "Every member has had their turn — congratulations!",
        });
      } else {
        toast({
          title: `Cycle ${data?.settings?.currentCycleNumber} started`,
          description: `Recipient: ${memberLabel(data?.currentCycle?.recipient ?? null)}`,
        });
      }
    },
    onError: (err: any) => {
      toast({
        title: "Could not advance",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isCompleted) {
    return (
      <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200 rounded-2xl">
        <CardContent className="p-6 text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-emerald-500 text-white mx-auto flex items-center justify-center">
            <Trophy className="h-7 w-7" />
          </div>
          <h3 className="text-xl font-bold text-emerald-900">Round complete</h3>
          <p className="text-sm text-emerald-800">
            All {totalRounds} members have received their pot. You can wind down the group, or talk to your members about starting a fresh round.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!currentCycle) {
    // Defensive — shouldn't happen if settings exist with status='active'.
    return null;
  }

  const recipient = currentCycle.recipient;
  const amountPerMember = settings.contributionAmount;
  const expectedPot = (Number(amountPerMember) || 0) * expectedCount;
  const days = daysUntil(currentCycle.deadline);
  const dueLabel = formatDueDate(currentCycle.deadline);
  const progressPct = expectedCount > 0 ? Math.min(100, Math.round((paidCount / expectedCount) * 100)) : 0;

  const meIsRecipient = actor?.id && recipient?.id === actor.id;

  // Upcoming = the rest of the order after the current recipient.
  const upcoming = order.slice(cycleNumber).slice(0, 4);

  return (
    <div className="space-y-4">
      {/* Hero cycle card */}
      <Card className="bg-gradient-to-br from-amber-50 via-white to-emerald-50 border-emerald-200 rounded-2xl overflow-hidden">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
              Cycle {cycleNumber} of {totalRounds}
            </Badge>
            <span className="text-xs text-gray-500 capitalize">
              {FREQUENCY_LABEL[settings.frequency] || settings.frequency}
            </span>
          </div>

          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">This cycle's recipient</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1" data-testid="text-recipient-name">
              {memberLabel(recipient)}
              {meIsRecipient && (
                <Badge className="ml-2 bg-emerald-600 text-white">You</Badge>
              )}
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white border border-gray-100 p-3">
              <p className="text-[11px] text-gray-500 uppercase tracking-wide">Per member</p>
              <p className="text-base font-bold text-gray-900 mt-0.5">{formatNaira(amountPerMember)}</p>
            </div>
            <div className="rounded-xl bg-white border border-gray-100 p-3">
              <p className="text-[11px] text-gray-500 uppercase tracking-wide">Expected pot</p>
              <p className="text-base font-bold text-gray-900 mt-0.5">{formatNaira(expectedPot.toString())}</p>
            </div>
          </div>

          <div className="rounded-xl bg-white border border-gray-100 p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Clock className="h-4 w-4 text-amber-600" />
                <span>Due {dueLabel}</span>
              </div>
              {days !== null && (
                <span className={`text-xs font-medium ${days < 0 ? "text-red-600" : days <= 3 ? "text-amber-600" : "text-gray-500"}`}>
                  {days < 0 ? `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} late`
                    : days === 0 ? "Due today"
                    : `${days} day${days === 1 ? "" : "s"} to go`}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
              <span className="font-medium">{paidCount} of {expectedCount} paid</span>
              <span>{progressPct}%</span>
            </div>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          <Button
            onClick={() => setLocation(`/project/${currentCycle.id}`)}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-full h-11"
            data-testid="button-open-cycle"
          >
            {meIsRecipient ? "View my cycle" : "Pay or view this cycle"}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </CardContent>
      </Card>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <Card className="bg-white rounded-2xl border-gray-100">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Coming up</p>
            <ol className="space-y-2">
              {upcoming.map((uid, i) => (
                <li key={uid} className="flex items-center gap-3 text-sm">
                  <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-700 text-xs font-bold flex items-center justify-center">
                    {cycleNumber + i + 1}
                  </span>
                  <span className="flex-1 truncate text-gray-800">{nameById.get(uid) || "Member"}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* Admin: advance */}
      {isAdmin && (
        <Card className="bg-white rounded-2xl border-gray-100">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900 text-sm">Done with this cycle?</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Once {memberLabel(recipient)} has received the pot, advance to{" "}
                  {cycleNumber === totalRounds
                    ? "close out the round."
                    : `Cycle ${cycleNumber + 1} (${nameById.get(order[cycleNumber] ?? "") || "next member"}).`}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(true)}
              className="w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              data-testid="button-advance-cycle"
            >
              {cycleNumber === totalRounds ? "Close round" : "Advance to next cycle"}
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {cycleNumber === totalRounds ? "Close the Ajo round?" : `Advance to Cycle ${cycleNumber + 1}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {cycleNumber === totalRounds
                ? "This marks the round as complete. Every member should have received their pot by now."
                : `Cycle ${cycleNumber} will be closed and Cycle ${cycleNumber + 1} will start with ${nameById.get(order[cycleNumber] ?? "") || "the next member"} as recipient. This cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={advanceMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                advanceMutation.mutate();
              }}
              disabled={advanceMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {advanceMutation.isPending ? "Working..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
