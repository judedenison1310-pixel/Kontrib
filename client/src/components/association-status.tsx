import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  ChevronRight, Clock, ArrowRight, UserX, MessageCircle, Send,
  Plus, Receipt, Wallet, CalendarClock,
} from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getCurrentUser } from "@/lib/auth";
import { formatNaira } from "@/lib/currency";
import {
  generateIndividualReminderMessage,
  generateBulkReminderMessage,
  generateWhatsAppLink,
  generateWhatsAppShareLink,
} from "@/lib/reminders";
import type { AssociationStatus, ContributionWithDetails, Group, User, Project } from "@shared/schema";

interface MemberRow { userId: string; user: User }

interface AssociationStatusProps {
  groupId: string;
  status: AssociationStatus;
  members: MemberRow[];
  isAdmin: boolean;
}

const FREQUENCY_LABEL: Record<string, string> = {
  monthly: "monthly",
  quarterly: "quarterly",
  yearly: "yearly",
};

const FREQUENCY_NEXT_LABEL: Record<string, string> = {
  monthly: "next month",
  quarterly: "next quarter",
  yearly: "next year",
};

function memberLabel(u: User | null): string {
  if (!u) return "—";
  return u.fullName?.trim() || u.phoneNumber || "Member";
}

function formatDueDate(d: Date | string | null): string {
  if (!d) return "No date set";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function daysUntil(d: Date | string | null): number | null {
  if (!d) return null;
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return diff;
}

export function AssociationStatusPanel({ groupId, status, members, isAdmin }: AssociationStatusProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const actor = getCurrentUser();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [levyOpen, setLevyOpen] = useState(false);
  const [levyName, setLevyName] = useState("");
  const [levyAmount, setLevyAmount] = useState("");
  const [levyDeadline, setLevyDeadline] = useState("");
  const [levyDescription, setLevyDescription] = useState("");

  const { settings, currentPeriod, paidCount, expectedCount, levies } = status;
  const periodNumber = settings.currentPeriodNumber;
  const frequencyLabel = FREQUENCY_LABEL[settings.duesFrequency] || settings.duesFrequency;

  // Group context for the WhatsApp reminder messages.
  const { data: group } = useQuery<Group>({
    queryKey: ["/api/groups", groupId],
    enabled: !!groupId && isAdmin,
  });

  const periodProjectId = currentPeriod?.id;
  const { data: periodContributions = [] } = useQuery<ContributionWithDetails[]>({
    queryKey: [`/api/contributions/project/${periodProjectId}`],
    enabled: !!periodProjectId && isAdmin,
  });

  const advanceMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/groups/${groupId}/association/advance`, {
        actorId: actor?.id,
      });
      return res.json();
    },
    onSuccess: (data: AssociationStatus) => {
      qc.invalidateQueries({ queryKey: ["/api/groups", groupId, "association"] });
      qc.invalidateQueries({ queryKey: ["/api/groups", groupId, "projects"] });
      qc.invalidateQueries({ queryKey: ["/api/groups", groupId] });
      setConfirmOpen(false);
      toast({
        title: `Period ${data?.settings?.currentPeriodNumber} started`,
        description: `Due ${formatDueDate(data?.currentPeriod?.deadline ?? null)}.`,
      });
    },
    onError: (err: any) => {
      toast({
        title: "Could not advance",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetLevyForm = () => {
    setLevyName("");
    setLevyAmount("");
    setLevyDeadline("");
    setLevyDescription("");
  };

  const levyMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        actorId: actor?.id,
        name: levyName,
        amount: levyAmount,
      };
      if (levyDeadline) payload.deadline = new Date(levyDeadline).toISOString();
      if (levyDescription) payload.description = levyDescription;
      const res = await apiRequest("POST", `/api/groups/${groupId}/association/levy`, payload);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/groups", groupId, "association"] });
      qc.invalidateQueries({ queryKey: ["/api/groups", groupId, "projects"] });
      toast({ title: "Levy added", description: `${levyName} is now open for contributions.` });
      resetLevyForm();
      setLevyOpen(false);
    },
    onError: (err: any) => {
      toast({
        title: "Could not add levy",
        description: err?.message || "Please check the details and try again.",
        variant: "destructive",
      });
    },
  });

  const days = daysUntil(currentPeriod?.deadline ?? null);
  const dueLabel = formatDueDate(currentPeriod?.deadline ?? null);
  const progressPct = expectedCount > 0 ? Math.min(100, Math.round((paidCount / expectedCount) * 100)) : 0;
  const duesAmount = settings.duesAmount;
  const expectedTotal = (Number(duesAmount) || 0) * expectedCount;

  // Unpaid this period (admin view).
  const paidUserIds = new Set(
    periodContributions.filter(c => c.status === "confirmed").map(c => c.userId),
  );
  const unpaidMembers = isAdmin
    ? members.filter(m => !paidUserIds.has(m.userId))
    : [];

  const reminderProject = currentPeriod
    ? {
        name: currentPeriod.name,
        targetAmount: currentPeriod.targetAmount,
        deadline: currentPeriod.deadline,
        currency: currentPeriod.currency,
      }
    : { name: "", targetAmount: null, deadline: null, currency: null };
  const reminderGroup = group
    ? {
        name: group.name,
        customSlug: group.customSlug ?? null,
        registrationLink: group.registrationLink ?? null,
      }
    : { name: "", customSlug: null, registrationLink: null };

  const unpaidWithPhones = unpaidMembers.filter(m => !!m.user.phoneNumber);
  const bulkLink = unpaidWithPhones.length > 0
    ? generateWhatsAppShareLink(
        generateBulkReminderMessage(
          unpaidWithPhones.map(m => ({
            fullName: m.user.fullName ?? "",
            phoneNumber: m.user.phoneNumber ?? "",
          })),
          reminderProject,
          reminderGroup,
        ),
      )
    : null;

  const canSubmitLevy =
    levyName.trim().length >= 2 && !!levyAmount && Number(levyAmount) > 0 && !levyMutation.isPending;

  return (
    <div className="space-y-4">
      {/* Hero dues period card */}
      {currentPeriod ? (
        <Card className="bg-gradient-to-br from-amber-50 via-white to-emerald-50 border-emerald-200 rounded-2xl overflow-hidden">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
                Period {periodNumber}
              </Badge>
              <span className="text-xs text-gray-500 capitalize">
                {frequencyLabel} dues
              </span>
            </div>

            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Now collecting</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1" data-testid="text-period-name">
                {currentPeriod.name}
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white border border-gray-100 p-3">
                <p className="text-[11px] text-gray-500 uppercase tracking-wide">Per member</p>
                <p className="text-base font-bold text-gray-900 mt-0.5">{formatNaira(duesAmount)}</p>
              </div>
              <div className="rounded-xl bg-white border border-gray-100 p-3">
                <p className="text-[11px] text-gray-500 uppercase tracking-wide">Expected total</p>
                <p className="text-base font-bold text-gray-900 mt-0.5">{formatNaira(expectedTotal.toString())}</p>
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
              onClick={() => setLocation(`/project/${currentPeriod.id}`)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-full h-11"
              data-testid="button-open-period"
            >
              Pay or view this period
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Unpaid this period (admin-only) */}
      {isAdmin && currentPeriod && unpaidMembers.length > 0 && (
        <Card className="bg-white rounded-2xl border-gray-100" data-testid="card-association-unpaid">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center">
                  <UserX className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Unpaid this period</p>
                  <p className="text-xs text-gray-500">
                    {unpaidMembers.length} of {expectedCount} {unpaidMembers.length === 1 ? "member hasn't" : "members haven't"} paid yet
                  </p>
                </div>
              </div>
              {bulkLink && (
                <a
                  href={bulkLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 px-3 py-1.5 rounded-full border border-emerald-200 bg-emerald-50"
                  data-testid="button-association-remind-all"
                >
                  <Send className="h-3.5 w-3.5" />
                  Remind all
                </a>
              )}
            </div>
            <ul className="space-y-1">
              {unpaidMembers.map(m => {
                const phone = m.user.phoneNumber || "";
                const link = phone
                  ? generateWhatsAppLink(
                      phone,
                      generateIndividualReminderMessage(
                        { fullName: m.user.fullName ?? "", phoneNumber: phone },
                        reminderProject,
                        reminderGroup,
                      ),
                    )
                  : null;
                return (
                  <li
                    key={m.userId}
                    className="flex items-center justify-between gap-3 py-2 border-t border-gray-100 first:border-t-0"
                    data-testid={`row-association-unpaid-${m.userId}`}
                  >
                    <span className="flex-1 truncate text-sm text-gray-800">
                      {memberLabel(m.user)}
                    </span>
                    {link ? (
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800 px-2.5 py-1 rounded-full hover:bg-emerald-50"
                        data-testid={`button-association-remind-${m.userId}`}
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        Remind
                      </a>
                    ) : (
                      <span className="text-[11px] text-gray-400">No phone</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Levies list */}
      <Card className="bg-white rounded-2xl border-gray-100">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center">
                <Receipt className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">Levies</p>
                <p className="text-xs text-gray-500">
                  {levies.length === 0 ? "No levies yet" : `${levies.length} active`}
                </p>
              </div>
            </div>
            {isAdmin && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setLevyOpen(true)}
                className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                data-testid="button-add-levy"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add levy
              </Button>
            )}
          </div>

          {levies.length === 0 ? (
            <p className="text-xs text-gray-500 px-1">
              One-off levies (e.g. building fund, special event) appear here. Members can pay them in addition to the regular dues.
            </p>
          ) : (
            <ul className="space-y-2">
              {levies.map((levy: Project) => {
                const levyDays = daysUntil(levy.deadline);
                return (
                  <li key={levy.id}>
                    <button
                      type="button"
                      onClick={() => setLocation(`/project/${levy.id}`)}
                      className="w-full text-left rounded-xl border border-gray-100 bg-white hover:border-emerald-200 hover:bg-emerald-50/30 p-3 transition-colors"
                      data-testid={`row-levy-${levy.id}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{levy.name}</p>
                          {levy.description && (
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{levy.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                              <Wallet className="h-3 w-3" />
                              {formatNaira(levy.targetAmount ?? "0")}
                            </span>
                            {levy.deadline && (
                              <span className={`inline-flex items-center gap-1 text-xs ${
                                levyDays !== null && levyDays < 0 ? "text-red-600" : "text-gray-500"
                              }`}>
                                <CalendarClock className="h-3 w-3" />
                                {formatDueDate(levy.deadline)}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400 mt-1" />
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Admin: advance period */}
      {isAdmin && currentPeriod && (
        <Card className="bg-white rounded-2xl border-gray-100">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                <CalendarClock className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900 text-sm">Ready to roll forward?</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Close period {periodNumber} and open period {periodNumber + 1} for {FREQUENCY_NEXT_LABEL[settings.duesFrequency] || "the next period"}.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(true)}
              className="w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              data-testid="button-advance-period"
            >
              Advance to period {periodNumber + 1}
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Advance to period {periodNumber + 1}?</AlertDialogTitle>
            <AlertDialogDescription>
              Period {periodNumber} will be closed and a new period will open for the next {frequencyLabel === "yearly" ? "year" : frequencyLabel === "quarterly" ? "quarter" : "month"}. Members can still see past periods in their history.
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

      {/* Add-levy dialog */}
      <Dialog open={levyOpen} onOpenChange={(o) => { setLevyOpen(o); if (!o) resetLevyForm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add a levy</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Levy name</Label>
              <Input
                placeholder="e.g. Building fund 2026"
                value={levyName}
                onChange={e => setLevyName(e.target.value)}
                data-testid="input-levy-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Amount per member</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₦</span>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="e.g. 10000"
                  value={levyAmount}
                  onChange={e => setLevyAmount(e.target.value)}
                  className="pl-7"
                  data-testid="input-levy-amount"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Deadline (optional)</Label>
              <Input
                type="date"
                value={levyDeadline}
                onChange={e => setLevyDeadline(e.target.value)}
                data-testid="input-levy-deadline"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                placeholder="What is this levy for?"
                value={levyDescription}
                onChange={e => setLevyDescription(e.target.value)}
                rows={3}
                data-testid="input-levy-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setLevyOpen(false)} disabled={levyMutation.isPending}>
              Cancel
            </Button>
            <Button
              onClick={() => levyMutation.mutate()}
              disabled={!canSubmitLevy}
              className="bg-emerald-600 hover:bg-emerald-700"
              data-testid="button-submit-levy"
            >
              {levyMutation.isPending ? "Adding..." : "Add levy"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
