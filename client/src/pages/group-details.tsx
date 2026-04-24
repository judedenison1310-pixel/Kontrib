import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Navigation } from "@/components/navigation";
import {
  ArrowLeft,
  Shield,
  UserCheck,
  CreditCard,
  ChevronRight,
  Bell,
  Plus,
  Pencil,
  Copy,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getCurrentUser } from "@/lib/auth";
import { formatNaira } from "@/lib/currency";
import { Group, Project, User as UserType, ContributionWithDetails, AjoStatus } from "@shared/schema";
import { useState } from "react";
import { CreateProjectModal } from "@/components/create-project-modal";
import { EditNameModal } from "@/components/edit-name-modal";
import { VerifiedBadge } from "@/components/verified-badge";
import { AjoSetupModal } from "@/components/ajo-setup-modal";
import { AjoCycleStatus } from "@/components/ajo-cycle-status";
import { Repeat } from "lucide-react";

interface GroupMemberWithUser {
  id: string;
  groupId: string;
  userId: string;
  contributedAmount: string;
  status: string;
  joinedAt: Date;
  user: UserType;
}

export default function GroupDetails() {
  const { groupId } = useParams();
  const [, setLocation] = useLocation();
  const user = getCurrentUser();
  const [createProjectModalOpen, setCreateProjectModalOpen] = useState(false);
  const [editGroupNameModalOpen, setEditGroupNameModalOpen] = useState(false);
  const [ajoSetupOpen, setAjoSetupOpen] = useState(false);
  const { toast } = useToast();

  const { data: group, isLoading: groupLoading } = useQuery<Group>({
    queryKey: ["/api/groups", groupId],
    enabled: !!groupId,
  });

  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/groups", groupId, "projects"],
    enabled: !!groupId,
  });

  const { data: members = [], isLoading: membersLoading } = useQuery<GroupMemberWithUser[]>({
    queryKey: ["/api/groups", groupId, "members"],
    enabled: !!groupId,
  });

  const { data: contributions = [] } = useQuery<ContributionWithDetails[]>({
    queryKey: ["/api/contributions/group", groupId],
    enabled: !!groupId,
  });

  // Ajo cycle status — only fetched for ajo-typed groups. Returns null
  // when the admin has not yet set up the cycle.
  const isAjoGroup = group?.groupType === "ajo";
  const { data: ajoStatus } = useQuery<AjoStatus | null>({
    queryKey: ["/api/groups", groupId, "ajo"],
    enabled: !!groupId && isAjoGroup,
  });

  const isLoading = groupLoading || projectsLoading || membersLoading;
  const isAdmin = user?.id === group?.adminId;
  const isCoAdmin = (group?.coAdmins ?? []).includes(user?.id ?? '');
  const isReviewer = isAdmin || isCoAdmin;
  const isMember = members.some(m => m.userId === user?.id);
  const isBoth = isAdmin && isMember;

  const pendingApprovals = contributions.filter(c => c.status === "pending").length;
  const myContributions = contributions.filter(c => c.userId === user?.id);
  const myPendingPayments = myContributions.filter(c => c.status === "pending").length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-lg mx-auto px-4 py-6">
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-green-600 border-r-transparent"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-lg mx-auto px-4 py-6">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Group Not Found</h2>
            <p className="text-gray-600 mb-6">The group you're looking for doesn't exist.</p>
            <Button onClick={() => setLocation("/groups")} data-testid="button-back-groups">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Groups
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const totalCollected = projects.reduce(
    (sum, project) => sum + (parseFloat(project.collectedAmount || "0") || 0),
    0,
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800";
      case "active": return "bg-blue-100 text-blue-800";
      case "paused": return "bg-orange-100 text-orange-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getRoleBadge = () => {
    if (isBoth) {
      return (
        <div className="flex gap-1">
          <Badge className="bg-green-100 text-green-700 text-xs">
            <Shield className="h-3 w-3 mr-1" />
            Admin
          </Badge>
          <Badge className="bg-blue-100 text-blue-700 text-xs">
            <UserCheck className="h-3 w-3 mr-1" />
            Member
          </Badge>
        </div>
      );
    }
    if (isAdmin) {
      return (
        <Badge className="bg-green-100 text-green-700 text-xs">
          <Shield className="h-3 w-3 mr-1" />
          Admin
        </Badge>
      );
    }
    return (
      <Badge className="bg-blue-100 text-blue-700 text-xs">
        <UserCheck className="h-3 w-3 mr-1" />
        Member
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24 sm:pb-8">
      <Navigation />

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <Button
          variant="ghost"
          onClick={() => setLocation("/groups")}
          className="mb-2 -ml-2"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Groups
        </Button>

        <div className={`rounded-2xl p-6 text-white ${
          isAdmin ? 'bg-gradient-to-r from-green-600 to-green-700' : 'bg-gradient-to-r from-blue-600 to-blue-700'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-2xl font-bold inline-flex items-center gap-2" data-testid="text-group-name">
              {group.name}
              <VerifiedBadge verifiedAt={group.verifiedAt} expiresAt={group.verificationExpiresAt} className="text-white" />
            </h1>
            {isAdmin && (
              <button
                onClick={() => setEditGroupNameModalOpen(true)}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                data-testid="button-edit-group-name"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
            <Badge className={getStatusColor(group.status)}>
              {group.status}
            </Badge>
          </div>
          {group.description && (
            <p className="text-white/80 mb-3" data-testid="text-group-description">
              {group.description}
            </p>
          )}
          
          <div className="bg-white/10 rounded-xl p-3 mb-4">
            <p className="text-white/70 text-xs mb-1">Total Generated</p>
            <p className="font-bold text-2xl" data-testid="text-total-generated">{formatNaira(totalCollected.toString())}</p>
          </div>
          
          <div className="flex items-center gap-3">
            {getRoleBadge()}
            {/* In private groups, only admins can see member count/list */}
            {(group.privacyMode !== "private" || isAdmin) && (
              <button
                onClick={() => setLocation(`/group/${groupId}/members`)}
                className="text-white/70 text-sm hover:text-white hover:underline transition-colors"
                data-testid="button-view-members"
              >
                {members.length} members
              </button>
            )}
            <button
              onClick={() => setLocation(`/group/${groupId}/projects`)}
              className="text-white/70 text-sm hover:text-white hover:underline transition-colors"
              data-testid="button-view-projects"
            >
              {projects.length} projects
            </button>
          </div>
        </div>

        {/* Show pending approvals banner for admins and co-admins */}
        {isReviewer && pendingApprovals > 0 && (
          <Card className="bg-orange-50 border-orange-200 rounded-2xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                    <Bell className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-orange-900">{pendingApprovals} Pending Approval{pendingApprovals > 1 ? 's' : ''}</h3>
                    <p className="text-sm text-orange-700">Payment proofs waiting for review</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="bg-orange-600 hover:bg-orange-700"
                  onClick={() => setLocation(`/group/${groupId}/pending`)}
                  data-testid="button-review-payments"
                >
                  Review
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Ajo-typed groups get a dedicated cycle workflow instead of the
            generic project list. Either the setup CTA (admin, no settings yet)
            or the active cycle status panel. */}
        {isAjoGroup && !ajoStatus && isAdmin && (
          <Card className="bg-gradient-to-br from-emerald-50 to-amber-50 border-emerald-200 rounded-2xl">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
                  <Repeat className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-emerald-900">Set up your Ajo cycle</h3>
                  <p className="text-sm text-emerald-800/80 mt-0.5">
                    Pick the contribution amount, how often everyone pays, and the
                    order each member receives the pot. Cycle 1 starts as soon as you finish.
                  </p>
                </div>
              </div>
              {members.length < 2 ? (
                <div className="space-y-2">
                  <p className="text-xs text-emerald-800/80">
                    Add at least one more member, then come back to set up your cycle.
                  </p>
                  <div className="flex gap-2">
                    {group?.whatsappLink && (
                      <Button
                        asChild
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full"
                        data-testid="button-invite-whatsapp"
                      >
                        <a href={group.whatsappLink} target="_blank" rel="noopener noreferrer">
                          Invite via WhatsApp
                        </a>
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={async () => {
                        const slug = group?.customSlug || group?.registrationLink;
                        if (!slug) return;
                        const url = `${window.location.origin}/join/${slug}`;
                        await navigator.clipboard.writeText(url);
                        toast({ title: "Invite link copied!", description: "Share it with members to join the group." });
                      }}
                      className="flex-1 rounded-full border-emerald-300 text-emerald-800 hover:bg-emerald-50"
                      data-testid="button-copy-invite-link"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy link
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={() => setAjoSetupOpen(true)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-full"
                  data-testid="button-open-ajo-setup"
                >
                  Set up cycle
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {isAjoGroup && !ajoStatus && !isAdmin && (
          <Card className="bg-amber-50 border-amber-200 rounded-2xl">
            <CardContent className="p-4 text-sm text-amber-800">
              The admin hasn't started the Ajo cycle yet. You'll see the schedule and your turn here once they do.
            </CardContent>
          </Card>
        )}

        {isAjoGroup && ajoStatus && (
          <AjoCycleStatus
            groupId={groupId!}
            status={ajoStatus}
            members={members}
            isAdmin={isAdmin}
          />
        )}

        {/* Non-Ajo groups: keep the existing project workflow. */}
        {!isAjoGroup && isAdmin && (
          <Button
            onClick={() => setCreateProjectModalOpen(true)}
            className="w-full"
            data-testid="button-create-project"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create New Project
          </Button>
        )}

        {!isAjoGroup && isMember && (
          <MemberContent
            groupId={groupId!}
            projects={projects}
            myContributions={myContributions}
            myPendingPayments={myPendingPayments}
            setLocation={setLocation}
          />
        )}
      </main>

      {group && (
        <CreateProjectModal
          open={createProjectModalOpen}
          onOpenChange={setCreateProjectModalOpen}
          groupId={groupId!}
          groupName={group.name}
        />
      )}

      {group && (
        <EditNameModal
          open={editGroupNameModalOpen}
          onOpenChange={setEditGroupNameModalOpen}
          type="group"
          currentName={group.name}
          entityId={group.id}
        />
      )}

      {group && isAjoGroup && (
        <AjoSetupModal
          open={ajoSetupOpen}
          onOpenChange={setAjoSetupOpen}
          groupId={group.id}
          groupName={group.name}
          members={members.map(m => ({ userId: m.userId, user: m.user }))}
        />
      )}
    </div>
  );
}

function MemberContent({
  groupId,
  projects,
  myContributions,
  myPendingPayments,
  setLocation,
}: {
  groupId: string;
  projects: Project[];
  myContributions: ContributionWithDetails[];
  myPendingPayments: number;
  setLocation: (path: string) => void;
}) {
  const myTotalContributed = myContributions
    .filter(c => c.status === "confirmed")
    .reduce((sum, c) => sum + parseFloat(c.amount), 0);

  return (
    <>
      <Card className="bg-white rounded-2xl">
        <CardContent className="p-4 text-center">
          <p className="text-sm text-gray-500 mb-1">My Contributions</p>
          <p className="text-xl font-bold text-primary">{formatNaira(myTotalContributed.toString())}</p>
        </CardContent>
      </Card>

      {myPendingPayments > 0 && (
        <Card className="bg-yellow-50 border-yellow-200 rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                <Bell className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-bold text-yellow-900">{myPendingPayments} Pending Payment{myPendingPayments > 1 ? 's' : ''}</h3>
                <p className="text-sm text-yellow-700">Awaiting admin approval</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card
        className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-[0.99]"
        onClick={() => setLocation(`/group/${groupId}/projects`)}
        data-testid="nav-card-projects-member"
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Submit a Payment</h3>
                <p className="text-sm text-gray-500">
                  {projects.length} active {projects.length === 1 ? "project" : "projects"}
                </p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-300" />
          </div>
        </CardContent>
      </Card>

    </>
  );
}

