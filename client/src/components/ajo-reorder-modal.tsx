import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronUp, ChevronDown, Lock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getCurrentUser } from "@/lib/auth";
import type { User, AjoSettings } from "@shared/schema";

interface MemberRow { userId: string; user: User }

interface AjoReorderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  settings: AjoSettings;
  members: MemberRow[];
}

function memberLabel(u: User | undefined): string {
  if (!u) return "Member";
  return u.fullName?.trim() || u.phoneNumber || "Member";
}

export function AjoReorderModal({
  open,
  onOpenChange,
  groupId,
  settings,
  members,
}: AjoReorderModalProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const actor = getCurrentUser();

  // Quick lookup of member display info by userId.
  const userById = new Map<string, User>();
  members.forEach(m => userById.set(m.userId, m.user));

  const [order, setOrder] = useState<string[]>(settings.payoutOrder ?? []);

  // Re-seed if the modal reopens after settings change (e.g. after advance).
  useEffect(() => {
    if (open) setOrder(settings.payoutOrder ?? []);
  }, [open, settings.payoutOrder]);

  // Past + current recipients are locked. Tail starts at currentCycleNumber
  // (because positions are 0-indexed and currentCycleNumber-1 is the current).
  const lockedCount = settings.currentCycleNumber;

  const move = (idx: number, delta: number) => {
    setOrder(prev => {
      const target = idx + delta;
      // Don't allow swapping into the locked prefix.
      if (target < lockedCount || target >= prev.length) return prev;
      if (idx < lockedCount) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const reorderMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/groups/${groupId}/ajo/payout-order`, {
        actorId: actor?.id,
        payoutOrder: order,
      });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/groups", groupId, "ajo"] });
      toast({
        title: "Order updated",
        description: "The upcoming recipients list has been saved.",
      });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({
        title: "Could not save order",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  // Compare against original to enable Save only when something changed.
  const original = settings.payoutOrder ?? [];
  const isDirty =
    order.length !== original.length ||
    order.some((u, i) => u !== original[i]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[88vh] rounded-t-3xl p-0">
        <div className="flex flex-col h-full">
          <SheetHeader className="px-5 py-4 border-b border-gray-100">
            <button
              onClick={() => onOpenChange(false)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              data-testid="button-reorder-back"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Back</span>
            </button>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-5 py-6 space-y-5">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Reorder upcoming members</h2>
              <p className="text-sm text-gray-500 mt-1">
                Members who have already received their pot are locked. You can move
                anyone in the unfinished part of the queue.
              </p>
            </div>

            <ol className="space-y-2">
              {order.map((uid, idx) => {
                const u = userById.get(uid);
                const isLocked = idx < lockedCount;
                const isCurrent = idx === lockedCount - 1;
                return (
                  <li
                    key={`${uid}-${idx}`}
                    className={`flex items-center gap-3 rounded-xl border p-3 ${
                      isLocked
                        ? "bg-gray-50 border-gray-200 opacity-70"
                        : "bg-white border-gray-200"
                    }`}
                    data-testid={`row-reorder-${idx}`}
                  >
                    <span className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center ${
                      isCurrent
                        ? "bg-amber-100 text-amber-700"
                        : isLocked
                        ? "bg-gray-200 text-gray-500"
                        : "bg-emerald-100 text-emerald-700"
                    }`}>
                      {idx + 1}
                    </span>
                    <span className="flex-1 truncate text-gray-900">
                      {memberLabel(u)}
                      {isCurrent && (
                        <span className="ml-2 text-xs text-amber-700">Current</span>
                      )}
                      {isLocked && !isCurrent && (
                        <span className="ml-2 text-xs text-gray-500">Paid</span>
                      )}
                    </span>
                    {isLocked ? (
                      <Lock className="h-4 w-4 text-gray-400" />
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => move(idx, -1)}
                          disabled={idx <= lockedCount}
                          className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent"
                          data-testid={`btn-reorder-up-${idx}`}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => move(idx, 1)}
                          disabled={idx === order.length - 1}
                          className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent"
                          data-testid={`btn-reorder-down-${idx}`}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="border-t border-gray-100 px-5 py-4 bg-white">
            <Button
              onClick={() => reorderMutation.mutate()}
              disabled={!isDirty || reorderMutation.isPending}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-base h-12 rounded-full"
              data-testid="button-save-reorder"
            >
              {reorderMutation.isPending ? "Saving..." : "Save new order"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
