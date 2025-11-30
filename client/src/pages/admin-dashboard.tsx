import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Navigation } from "@/components/navigation";
import { CreateGroupModal } from "@/components/create-group-modal";
import { CreateProjectModal } from "@/components/create-project-modal";
import { ManageAccountabilityPartnersModal } from "@/components/manage-accountability-partners-modal";
import { ProjectCard } from "@/components/project-card";
import { PaymentModal } from "@/components/payment-modal";
import { PaymentApprovalModal } from "@/components/payment-approval-modal";
import { StatusBadge, DashboardSkeleton } from "@/components/ui/kontrib-ui";
import { SiWhatsapp } from "react-icons/si";
import {
  Plus,
  Users,
  Clock,
  FolderPlus,
  UserCheck,
  CheckCircle,
  XCircle,
  ChevronRight,
  ChevronDown,
  Eye,
  Wallet,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { formatNaira } from "@/lib/currency";
import { Group, Project, ContributionWithDetails } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export default function AdminDashboard() {
  const user = getCurrentUser();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [createGroupModalOpen, setCreateGroupModalOpen] = useState(false);
  const [createProjectModalOpen, setCreateProjectModalOpen] = useState(false);
  const [managePartnersModalOpen, setManagePartnersModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [selectedContribution, setSelectedContribution] = useState<ContributionWithDetails | null>(null);

  const { data: groups = [], isLoading: groupsLoading } = useQuery<Group[]>({
    queryKey: ["/api/groups", "admin", user?.id],
    enabled: !!user,
  });

  const { data: adminStats = {}, isLoading: statsLoading } = useQuery<any>({
    queryKey: ["/api/stats", "admin", user?.id],
    enabled: !!user,
  });

  const { data: recentContributions = [], isLoading: contributionsLoading } = useQuery<ContributionWithDetails[]>({
    queryKey: ["/api/contributions/admin", user?.id],
    enabled: !!user,
  });

  const pendingContributions = recentContributions.filter(c => c.status === "pending");

  const handleShareGroup = (group: Group) => {
    const groupSlug = group.customSlug || group.registrationLink;
    const joinLink = `kontrib.app/join/${groupSlug}`;
    const shareText = `${joinLink}\n\nYou have been invited to join ${group.name} on Kontrib!\n\nLogin to submit your contributions\n\nLet's keep it transparent\n\nKontrib.app`;
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank");
  };

  const handleCreateProject = (group: Group) => {
    setSelectedGroup(group);
    setCreateProjectModalOpen(true);
  };

  const handleManagePartners = (group: Group) => {
    setSelectedGroup(group);
    setManagePartnersModalOpen(true);
  };

  const toggleGroupExpansion = (groupId: string) => {
    setExpandedGroupId(expandedGroupId === groupId ? null : groupId);
  };

  const handleContributeToProject = (project: Project) => {
    setSelectedProject(project);
    setPaymentModalOpen(true);
  };

  const useGroupProjects = (groupId: string) => {
    return useQuery<Project[]>({
      queryKey: ["/api/groups", groupId, "projects"],
      enabled: !!groupId,
    });
  };

  function GroupCard({ group }: { group: Group }) {
    const { data: projects = [], isLoading: projectsLoading } = useGroupProjects(group.id);
    const isExpanded = expandedGroupId === group.id;

    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        {/* Group Header */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center shrink-0">
            <Users className="h-6 w-6 text-gray-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 truncate">{group.name}</h3>
            <p className="text-sm text-gray-500">{group.description || "No description"}</p>
          </div>
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
            group.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
          }`}>
            {group.status}
          </span>
        </div>

        {/* Quick Actions Grid */}
        <div className="mt-4 grid grid-cols-4 gap-2">
          <button
            onClick={() => handleShareGroup(group)}
            className="flex flex-col items-center gap-1 p-3 rounded-xl bg-[#25D366] text-white hover:bg-[#20bd5a] transition-colors"
            data-testid={`share-${group.id}`}
          >
            <SiWhatsapp className="h-5 w-5" />
            <span className="text-xs font-medium">Share</span>
          </button>
          <button
            onClick={() => setLocation(`/group/${group.id}`)}
            className="flex flex-col items-center gap-1 p-3 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            data-testid={`view-members-${group.id}`}
          >
            <Eye className="h-5 w-5" />
            <span className="text-xs font-medium">Members</span>
          </button>
          <button
            onClick={() => handleCreateProject(group)}
            className="flex flex-col items-center gap-1 p-3 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            data-testid={`add-project-${group.id}`}
          >
            <FolderPlus className="h-5 w-5" />
            <span className="text-xs font-medium">Project</span>
          </button>
          <button
            onClick={() => handleManagePartners(group)}
            className="flex flex-col items-center gap-1 p-3 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            data-testid={`manage-partners-${group.id}`}
          >
            <UserCheck className="h-5 w-5" />
            <span className="text-xs font-medium">Partners</span>
          </button>
        </div>

        {/* Expandable Projects Section */}
        <button
          onClick={() => toggleGroupExpansion(group.id)}
          className="mt-4 w-full flex items-center justify-between p-3 bg-gray-50 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          data-testid={`toggle-projects-${group.id}`}
        >
          <span>{projects.length} Project{projects.length !== 1 ? "s" : ""}</span>
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        {/* Projects List */}
        {isExpanded && (
          <div className="mt-3 space-y-3 border-t border-gray-100 pt-4">
            {projectsLoading ? (
              <div className="flex justify-center py-4">
                <div className="w-6 h-6 border-2 border-gray-200 border-t-primary rounded-full animate-spin" />
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-4">
                <FolderPlus className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No projects yet</p>
                <button
                  onClick={() => handleCreateProject(group)}
                  className="mt-2 text-primary text-sm font-medium hover:underline"
                >
                  Create First Project
                </button>
              </div>
            ) : (
              projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  isAdmin={true}
                  onContribute={handleContributeToProject}
                />
              ))
            )}
          </div>
        )}
      </div>
    );
  }

  if (groupsLoading || statsLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24 sm:pb-8">
      <Navigation />

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Page Header - Clean Style */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Groups</h1>
            <p className="text-gray-500">Manage your contributions</p>
          </div>
          {groups.length > 0 && (
            <button
              onClick={() => setCreateGroupModalOpen(true)}
              className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white shadow-lg hover:bg-primary/90 transition-colors"
              data-testid="button-create-group-fab"
            >
              <Plus className="h-6 w-6" />
            </button>
          )}
        </div>

        {/* Pending Approvals Alert */}
        {pendingContributions.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-amber-900">
                  {pendingContributions.length} Payment{pendingContributions.length > 1 ? "s" : ""} Awaiting Approval
                </p>
                <p className="text-sm text-amber-700">Tap to review payment proofs</p>
              </div>
              <ChevronRight className="h-5 w-5 text-amber-400" />
            </div>
          </div>
        )}

        {/* Groups List or Empty State */}
        {groups.length === 0 ? (
          <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">No groups yet</h3>
            <p className="text-gray-500 mb-6">
              Start by creating your first group
            </p>
            <button
              onClick={() => setCreateGroupModalOpen(true)}
              className="bg-primary hover:bg-primary/90 text-white font-semibold px-6 py-3 rounded-full transition-colors"
              data-testid="button-create-first-group"
            >
              Create First Group
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => (
              <GroupCard key={group.id} group={group} />
            ))}
          </div>
        )}

        {/* Payment Proofs to Review */}
        {pendingContributions.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Payment Proofs to Review</h2>
            <div className="space-y-2">
              {pendingContributions.slice(0, 5).map((contribution) => (
                <div
                  key={contribution.id}
                  className="bg-white rounded-2xl p-4 border border-gray-100 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => {
                    setSelectedContribution(contribution);
                    setApprovalModalOpen(true);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                        <Clock className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{contribution.userName}</p>
                        <p className="text-sm text-gray-500">{contribution.groupName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{formatNaira(Number(contribution.amount))}</p>
                      <StatusBadge status="pending" size="sm" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Recent Transactions */}
        {recentContributions.filter(c => c.status !== "pending").length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Transactions</h2>
            <div className="space-y-2">
              {recentContributions.filter(c => c.status !== "pending").slice(0, 5).map((contribution) => (
                <div key={contribution.id} className="bg-white rounded-2xl p-4 border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        contribution.status === "confirmed" ? "bg-green-100" : "bg-red-100"
                      }`}>
                        {contribution.status === "confirmed" ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{contribution.userName}</p>
                        <p className="text-xs text-gray-500">{contribution.groupName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{formatNaira(Number(contribution.amount))}</p>
                      <StatusBadge 
                        status={contribution.status as "confirmed" | "rejected"} 
                        size="sm" 
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Modals */}
      <CreateGroupModal
        open={createGroupModalOpen}
        onOpenChange={setCreateGroupModalOpen}
      />
      {selectedGroup && (
        <>
          <CreateProjectModal
            open={createProjectModalOpen}
            onOpenChange={setCreateProjectModalOpen}
            groupId={selectedGroup.id}
            groupName={selectedGroup.name}
          />
          <ManageAccountabilityPartnersModal
            open={managePartnersModalOpen}
            onOpenChange={setManagePartnersModalOpen}
            groupId={selectedGroup.id}
            groupName={selectedGroup.name}
          />
        </>
      )}
      <PaymentModal
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        project={selectedProject}
      />
      <PaymentApprovalModal
        open={approvalModalOpen}
        onOpenChange={setApprovalModalOpen}
        contribution={selectedContribution}
      />
    </div>
  );
}
