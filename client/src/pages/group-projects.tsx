import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { AdminKycModal } from "@/components/admin-kyc-modal";
import { Navigation } from "@/components/navigation";
import { CreateProjectModal } from "@/components/create-project-modal";
import { PaymentModal } from "@/components/payment-modal";
import { EditProjectModal } from "@/components/edit-project-modal";
import { VerifiedBadge } from "@/components/verified-badge";
import { VerifiedListingPrompt } from "@/components/verified-listing-prompt";
import type { VerificationStatus } from "@shared/schema";
import type { User as UserType } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  FolderPlus,
  Target,
  Calendar,
  ChevronRight,
  CreditCard,
  Copy,
  Check,
  Pencil,
  Plus,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getCurrentUser } from "@/lib/auth";
import { formatNaira } from "@/lib/currency";
import { useToast } from "@/hooks/use-toast";
import { Project, Group, AjoStatus, AssociationStatus } from "@shared/schema";
import { AjoSetupModal } from "@/components/ajo-setup-modal";
import { AjoCycleStatus } from "@/components/ajo-cycle-status";
import { AssociationSetupModal } from "@/components/association-setup-modal";
import { AssociationStatusPanel } from "@/components/association-status";
import { Repeat, Banknote } from "lucide-react";

export default function GroupProjects() {
  const user = getCurrentUser();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/group/:groupId/projects");
  const groupId = params?.groupId;
  const { toast } = useToast();
  
  const [createProjectModalOpen, setCreateProjectModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteGroupOpen, setDeleteGroupOpen] = useState(false);
  const [ajoSetupOpen, setAjoSetupOpen] = useState(false);
  const [associationSetupOpen, setAssociationSetupOpen] = useState(false);
  const [kycModalOpen, setKycModalOpen] = useState(false);
  // Tracks the create-group → KYC → category setup chain. After the admin
  // closes the KYC sheet during onboarding we open the appropriate setup
  // wizard (Ajo cycle setup or Association dues setup).
  const [chainKycTo, setChainKycTo] = useState<"ajo" | "association" | null>(null);

  // Onboarding sequencing: when the admin lands here right after creating
  // a group (the create modal sends them with ?onboard=ajo or ?onboard=association),
  // open the KYC sheet first and then the relevant setup wizard, so the
  // flow is: name → KYC → setup. Also accepts the legacy ?onboard=1 value
  // for backwards compatibility (treated as ajo). Only fires once per page load.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const flag = params.get("onboard");
    if (!flag) return;
    const target: "ajo" | "association" =
      flag === "association" ? "association" : "ajo";
    // Strip the flag immediately so a refresh doesn't re-trigger the chain.
    params.delete("onboard");
    const cleanQs = params.toString();
    const cleanUrl = window.location.pathname + (cleanQs ? `?${cleanQs}` : "");
    window.history.replaceState(null, "", cleanUrl);
    setKycModalOpen(true);
    setChainKycTo(target);
  }, []);

  // When the KYC sheet closes during onboarding, open the appropriate
  // category setup sheet so the admin sees the next step in the planned
  // sequence.
  const handleKycModalChange = (open: boolean) => {
    setKycModalOpen(open);
    if (!open && chainKycTo) {
      const next = chainKycTo;
      setChainKycTo(null);
      if (next === "association") {
        setAssociationSetupOpen(true);
      } else {
        setAjoSetupOpen(true);
      }
    }
  };

  const deleteGroupMutation = useMutation({
    mutationFn: () =>
      apiRequest("DELETE", `/api/groups/${groupId}`, { userId: user?.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      toast({ title: "Group deleted", description: "The group and all its data have been removed." });
      setLocation("/groups");
    },
    onError: () => {
      toast({ title: "Failed to delete group", variant: "destructive" });
    },
  });

  const { data: group, isLoading: groupLoading } = useQuery<Group>({
    queryKey: ["/api/groups", groupId],
    enabled: !!groupId,
  });

  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/groups", groupId, "projects"],
    enabled: !!groupId,
  });

  const { data: members = [] } = useQuery<Array<{ id: string; groupId: string; userId: string; status: string; user: UserType }>>({
    queryKey: ["/api/groups", groupId, "members"],
    enabled: !!groupId,
  });

  const { data: verificationStatus } = useQuery<VerificationStatus>({
    queryKey: ["/api/groups", groupId, "verification"],
    enabled: !!groupId,
  });

  const isAjoGroup = group?.groupType === "ajo";
  const isAssociationGroup = group?.groupType === "association";
  const { data: ajoStatus } = useQuery<AjoStatus | null>({
    queryKey: ["/api/groups", groupId, "ajo"],
    enabled: !!groupId && isAjoGroup,
  });
  const { data: associationStatus } = useQuery<AssociationStatus | null>({
    queryKey: ["/api/groups", groupId, "association"],
    enabled: !!groupId && isAssociationGroup,
  });

  const isLoading = groupLoading || projectsLoading;
  const isAdmin = user?.id === group?.adminId;

  const handlePaymentClick = (project: Project) => {
    setSelectedProject(project);
    setPaymentModalOpen(true);
  };

  const handleCopyLink = async (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    const url = `${window.location.origin}/project/${project.id}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(project.id);
    toast({ title: "Link copied!", description: "Share it with group members" });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleEditClick = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    setEditProject(project);
    setEditModalOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "active":
        return "bg-blue-100 text-blue-800";
      case "paused":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getProjectTypeLabel = (type: string | undefined) => {
    switch (type) {
      case "monthly": return "Monthly Contributions/Savings";
      case "yearly": return "Dues and Levies";
      case "event": return "Event";
      case "emergency": return "Emergency";
      default: return "Target Goal";
    }
  };

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

  return (
    <div className="min-h-screen bg-gray-50 pb-24 sm:pb-8">
      <Navigation />

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <Button
          variant="ghost"
          onClick={() => setLocation(`/groups`)}
          className="mb-2 -ml-2"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Group
        </Button>

        {group && (
          <>
            <VerifiedListingPrompt
              groupId={group.id}
              isAdmin={isAdmin}
              adminId={group.adminId}
              status={verificationStatus}
            />
          </>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            {group.logoUrl ? (
              <img
                src={group.logoUrl}
                alt=""
                className="w-12 h-12 rounded-xl object-cover border border-gray-200 shrink-0"
                data-testid="img-group-logo-header"
              />
            ) : null}
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 truncate" data-testid="text-page-title">
                {isAjoGroup ? "Cycle" : isAssociationGroup ? "Dues" : "Projects"}
              </h1>
              <p className="text-gray-500 inline-flex items-center gap-1.5">
                {group.name}
                <VerifiedBadge verifiedAt={verificationStatus?.group.verifiedAt} expiresAt={verificationStatus?.group.verificationExpiresAt} />
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={() => setDeleteGroupOpen(true)}
                className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                data-testid="button-delete-group"
                title="Delete group"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            )}
            {!isAjoGroup && !isAssociationGroup && isAdmin && projects.length > 0 && (
              <button
                onClick={() => setCreateProjectModalOpen(true)}
                className="w-12 h-12 bg-amber-400 rounded-full flex items-center justify-center text-gray-900 shadow-lg hover:bg-amber-500 transition-colors"
                data-testid="button-create-project-fab"
              >
                <Plus className="h-6 w-6" />
              </button>
            )}
          </div>
        </div>

        {isAssociationGroup ? (
          <>
            {!associationStatus && isAdmin && (
              <Card className="bg-gradient-to-br from-emerald-50 to-amber-50 border-emerald-200 rounded-2xl">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
                      <Banknote className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-emerald-900">Set up association dues</h3>
                      <p className="text-sm text-emerald-800/80 mt-0.5">
                        Pick the dues amount and how often members pay (monthly, quarterly, or yearly). You can add one-off levies any time after.
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => setAssociationSetupOpen(true)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-full"
                    data-testid="button-open-association-setup"
                  >
                    Set up dues
                  </Button>
                </CardContent>
              </Card>
            )}

            {!associationStatus && !isAdmin && (
              <Card className="bg-amber-50 border-amber-200 rounded-2xl">
                <CardContent className="p-4 text-sm text-amber-800">
                  The admin hasn't set up dues yet. You'll see what you owe and any levies here once they do.
                </CardContent>
              </Card>
            )}

            {associationStatus && (
              <AssociationStatusPanel
                groupId={groupId!}
                status={associationStatus}
                members={members.map(m => ({ userId: m.userId, user: m.user }))}
                isAdmin={isAdmin}
              />
            )}
          </>
        ) : isAjoGroup ? (
          <>
            {!ajoStatus && isAdmin && (
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
                  <Button
                    onClick={() => setAjoSetupOpen(true)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-full"
                    data-testid="button-open-ajo-setup"
                  >
                    Set up cycle
                  </Button>
                  <p className="text-xs text-emerald-800/80 text-center">
                    You can invite members now or after setup.
                  </p>
                </CardContent>
              </Card>
            )}

            {!ajoStatus && !isAdmin && (
              <Card className="bg-amber-50 border-amber-200 rounded-2xl">
                <CardContent className="p-4 text-sm text-amber-800">
                  The admin hasn't started the Ajo cycle yet. You'll see the schedule and your turn here once they do.
                </CardContent>
              </Card>
            )}

            {ajoStatus && (
              <AjoCycleStatus
                groupId={groupId!}
                status={ajoStatus}
                members={members.map(m => ({ userId: m.userId, user: m.user }))}
                isAdmin={isAdmin}
              />
            )}
          </>
        ) : projects.length === 0 ? (
          <Card className="border-2 border-dashed border-gray-300">
            <CardContent className="py-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FolderPlus className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2" data-testid="text-empty-state">
                No projects yet
              </h3>
              <p className="text-gray-500 mb-6">
                {isAdmin 
                  ? "Create your first project to start collecting contributions"
                  : "No projects have been created in this group yet"
                }
              </p>
              {isAdmin && (
                <Button
                  onClick={() => setCreateProjectModalOpen(true)}
                  className="bg-primary hover:bg-primary/90"
                  data-testid="button-create-first-project"
                >
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Create First Project
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {projects.map((project) => {
              const hasTarget = project.targetAmount && parseFloat(project.targetAmount) > 0;
              const progress = hasTarget
                ? Math.min(Math.round((parseFloat(project.collectedAmount) / parseFloat(project.targetAmount!)) * 100), 100)
                : 0;

              return (
                <Card
                  key={project.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer"
                  onClick={() => setLocation(`/project/${project.id}`)}
                  data-testid={`project-card-${project.id}`}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-bold text-gray-900" data-testid={`text-project-name-${project.id}`}>
                            {project.name}
                          </h4>
                          <Badge className={`${getStatusColor(project.status)} text-xs`}>
                            {project.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500">{getProjectTypeLabel(project.projectType)}</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-300 shrink-0" />
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {hasTarget ? (
                        <>
                          <div className="bg-gray-50 rounded-xl p-3">
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <Target className="h-3 w-3" />
                              Target
                            </p>
                            <p className="font-bold text-gray-900">{formatNaira(project.targetAmount!)}</p>
                          </div>
                          <div className="bg-green-50 rounded-xl p-3">
                            <p className="text-xs text-gray-500">Collected</p>
                            <p className="font-bold text-primary">{formatNaira(project.collectedAmount)}</p>
                          </div>
                        </>
                      ) : (
                        <div className="col-span-2 bg-green-50 rounded-xl p-3">
                          <p className="text-xs text-gray-500">Total Collected</p>
                          <p className="font-bold text-xl text-primary">{formatNaira(project.collectedAmount)}</p>
                        </div>
                      )}
                    </div>

                    {hasTarget && (
                      <div className="mb-4">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-gray-500">Progress</span>
                          <span className="text-xs font-medium text-primary">{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                    )}

                    {project.deadline && (
                      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                        <Calendar className="h-4 w-4" />
                        <span>
                          Due: {new Date(project.deadline).toLocaleDateString("en-NG", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    )}

                    <div className="pt-3 border-t border-gray-100">
                      {isAdmin ? (
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => handleCopyLink(e, project)}
                            className="flex-1 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-medium py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors"
                            data-testid={`button-copy-link-${project.id}`}
                          >
                            {copiedId === project.id ? (
                              <><Check className="h-4 w-4 text-green-600" /> Copied!</>
                            ) : (
                              <><Copy className="h-4 w-4" /> Share Link</>
                            )}
                          </button>
                          <button
                            onClick={(e) => handleEditClick(e, project)}
                            className="flex-1 bg-primary hover:bg-primary/90 text-white font-medium py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors"
                            data-testid={`button-edit-${project.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                            Edit Details
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePaymentClick(project);
                          }}
                          className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors"
                          data-testid={`button-payment-${project.id}`}
                        >
                          <CreditCard className="h-4 w-4" />
                          Post Receipt
                        </button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {!isAjoGroup && (
          <div className="text-center text-sm text-gray-500 pt-4">
            {projects.length} {projects.length === 1 ? "project" : "projects"}
          </div>
        )}
      </main>

      {group && (
        <CreateProjectModal
          open={createProjectModalOpen}
          onOpenChange={setCreateProjectModalOpen}
          groupId={group.id}
          groupName={group.name}
        />
      )}

      {selectedProject && (
        <PaymentModal
          open={paymentModalOpen}
          onOpenChange={setPaymentModalOpen}
          project={selectedProject}
        />
      )}

      {editProject && (
        <EditProjectModal
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          project={editProject}
        />
      )}

      {group && isAssociationGroup && (
        <AssociationSetupModal
          open={associationSetupOpen}
          onOpenChange={setAssociationSetupOpen}
          groupId={group.id}
          groupName={group.name}
          memberCount={members.length}
        />
      )}

      {/* Mounted at the page level so the create-group → KYC → cycle setup
          chain can be driven from the onboarding effect above, not just from
          inside the cycle setup sheet. */}
      {isAjoGroup && isAdmin && (
        <AdminKycModal
          open={kycModalOpen}
          onOpenChange={handleKycModalChange}
          mandatory={chainKycTo !== null}
        />
      )}

      {/* Delete Group Confirmation */}
      <AlertDialog open={deleteGroupOpen} onOpenChange={setDeleteGroupOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Delete "{group?.name}"?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                This will permanently delete the group along with <strong>all its projects, contributions, disbursements, and member records</strong>. This cannot be undone.
              </span>
              <span className="block text-red-600 font-medium">
                Only you (the primary admin) can perform this action.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteGroupMutation.mutate()}
              disabled={deleteGroupMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteGroupMutation.isPending ? "Deleting…" : "Yes, delete group"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
