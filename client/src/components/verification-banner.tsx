import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldQuestion, Clock, Check, X, AlertCircle } from "lucide-react";
import type { VerificationStatus, User as UserType } from "@shared/schema";
import { VerificationApplyModal } from "./verification-apply-modal";

interface GroupMemberWithUser {
  id: string; groupId: string; userId: string; status: string; user: UserType;
}

interface Props {
  groupId: string;
  isAdmin: boolean;
  adminId: string;
  members: GroupMemberWithUser[];
}

export function VerificationBanner({ groupId, isAdmin, adminId, members }: Props) {
  const [applyOpen, setApplyOpen] = useState(false);
  const { data: status, isLoading } = useQuery<VerificationStatus>({
    queryKey: ["/api/groups", groupId, "verification"],
    enabled: !!groupId,
  });

  if (isLoading || !status) return null;

  // Already verified
  if (status.group.verifiedAt) {
    return (
      <Card className="mb-4 border-green-200 bg-green-50" data-testid="banner-verified">
        <CardContent className="p-4 flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-green-600 shrink-0" />
          <div className="flex-1">
            <div className="font-semibold text-green-900">Verified Ajo Group</div>
            <div className="text-xs text-green-700">
              Verified {new Date(status.group.verifiedAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
              {status.group.verificationExpiresAt && ` · renews ${new Date(status.group.verificationExpiresAt).toLocaleDateString("en-NG", { month: "short", year: "numeric" })}`}
            </div>
          </div>
          <Badge className="bg-green-600">Verified</Badge>
        </CardContent>
      </Card>
    );
  }

  // Has an application — show its state
  const app = status.application;
  if (app && app.status !== "rejected") {
    const officersAccepted = app.officers.filter(o => o.status === "accepted").length;
    const officersTotal = app.officers.length;
    const vouchedCount = app.attestations.filter(a => a.status === "vouched").length;
    const attestersTotal = app.attestations.length;

    const labelByStatus: Record<string, { text: string; tone: string; icon: any }> = {
      submitted:      { text: "Application submitted",  tone: "blue",   icon: Clock },
      under_review:   { text: "Under Kontrib review",   tone: "blue",   icon: Clock },
      info_requested: { text: "More info requested",    tone: "orange", icon: AlertCircle },
      approved:       { text: "Approved — finalizing",  tone: "green",  icon: Check },
    };
    const m = labelByStatus[app.status] ?? labelByStatus.submitted;
    const Icon = m.icon;
    const toneCls = m.tone === "green" ? "border-green-200 bg-green-50 text-green-900"
      : m.tone === "orange" ? "border-orange-200 bg-orange-50 text-orange-900"
      : "border-blue-200 bg-blue-50 text-blue-900";

    return (
      <Card className={`mb-4 ${toneCls}`} data-testid="banner-verification-pending">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center gap-3">
            <Icon className="w-5 h-5 shrink-0" />
            <div className="flex-1">
              <div className="font-semibold">{m.text}</div>
              <div className="text-xs opacity-80">
                Officers confirmed: {officersAccepted}/{officersTotal} · Vouches received: {vouchedCount}/{attestersTotal}
              </div>
            </div>
          </div>
          {app.reviewerNotes && (
            <p className="text-sm bg-white/60 border rounded p-2"><strong>Reviewer note:</strong> {app.reviewerNotes}</p>
          )}
        </CardContent>
      </Card>
    );
  }

  // Rejected — admin can re-apply
  if (app && app.status === "rejected") {
    return (
      <Card className="mb-4 border-red-200 bg-red-50" data-testid="banner-verification-rejected">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center gap-3">
            <X className="w-5 h-5 text-red-600 shrink-0" />
            <div className="flex-1">
              <div className="font-semibold text-red-900">Verification not approved</div>
              {app.reviewerNotes && <div className="text-xs text-red-700">Reviewer note: {app.reviewerNotes}</div>}
            </div>
            {isAdmin && (
              <Button size="sm" variant="outline" onClick={() => setApplyOpen(true)} data-testid="button-verification-reapply">
                Re-apply
              </Button>
            )}
          </div>
          {isAdmin && (
            <VerificationApplyModal
              open={applyOpen} onOpenChange={setApplyOpen}
              groupId={groupId} adminId={adminId} members={members}
            />
          )}
        </CardContent>
      </Card>
    );
  }

  // No application yet — show eligibility / apply CTA (admin only sees the CTA)
  const e = status.eligibility;
  const reqRow = (label: string, ok: boolean, detail: string) => (
    <li className="flex items-center gap-2 text-sm">
      {ok ? <Check className="w-4 h-4 text-green-600 shrink-0" /> : <Clock className="w-4 h-4 text-gray-400 shrink-0" />}
      <span className={ok ? "text-gray-700" : "text-gray-500"}>{label}</span>
      <span className="text-xs text-gray-400 ml-auto">{detail}</span>
    </li>
  );

  if (!isAdmin) {
    // Members see a soft note only when not yet verified — keep it quiet
    return null;
  }

  return (
    <Card className="mb-4 border-gray-200" data-testid="banner-verification-eligible">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <ShieldQuestion className="w-6 h-6 text-gray-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-semibold text-gray-900">Verified Ajo Group badge</div>
            <p className="text-xs text-gray-600">
              Earn a public trust badge once your group has a track record. Free during the pilot.
            </p>
          </div>
        </div>
        <ul className="space-y-1.5 pl-1">
          {reqRow("At least 30 days old", e.requirements.ageOk, `${e.ageDays} day${e.ageDays === 1 ? "" : "s"}`)}
          {reqRow("At least 10 active members", e.requirements.membersOk, `${e.activeMemberCount} active`)}
          {reqRow("At least 1 completed cycle or funded purse", e.requirements.cycleOk, `${e.completedCycleCount} done`)}
        </ul>
        <div className="flex justify-end">
          <Button onClick={() => setApplyOpen(true)} disabled={!e.eligible} data-testid="button-verification-apply">
            <ShieldCheck className="w-4 h-4 mr-1" />
            {e.eligible ? "Apply for Verified" : "Not yet eligible"}
          </Button>
        </div>
        <VerificationApplyModal
          open={applyOpen} onOpenChange={setApplyOpen}
          groupId={groupId} adminId={adminId} members={members}
        />
      </CardContent>
    </Card>
  );
}
