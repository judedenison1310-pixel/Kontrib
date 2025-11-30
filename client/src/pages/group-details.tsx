import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Navigation } from "@/components/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ArrowLeft,
  Users,
  FolderKanban,
  ChevronRight,
  ChevronDown,
  Shield,
  UserCheck,
  CreditCard,
  Bell,
  Plus,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { formatNaira } from "@/lib/currency";
import { Group, Project, User as UserType, ContributionWithDetails } from "@shared/schema";
import { useState } from "react";
import { CreateProjectModal } from "@/components/create-project-modal";

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

  const isLoading = groupLoading || projectsLoading || membersLoading;
  const isAdmin = user?.id === group?.adminId;
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
            <h1 className="text-2xl font-bold" data-testid="text-group-name">
              {group.name}
            </h1>
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
            <span className="text-white/70 text-sm">{members.length} members</span>
            <span className="text-white/70 text-sm">{projects.length} projects</span>
          </div>
        </div>

        {isBoth ? (
          <Tabs defaultValue="admin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="admin" className="flex items-center gap-2" data-testid="tab-admin">
                <Shield className="h-4 w-4" />
                Admin View
                {pendingApprovals > 0 && (
                  <span className="bg-orange-500 text-white text-xs px-1.5 rounded-full">{pendingApprovals}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="member" className="flex items-center gap-2" data-testid="tab-member">
                <UserCheck className="h-4 w-4" />
                My Contributions
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="admin" className="space-y-4 mt-4">
              <AdminContent 
                groupId={groupId!}
                projects={projects}
                members={members}
                pendingApprovals={pendingApprovals}
                setLocation={setLocation}
                onCreateProject={() => setCreateProjectModalOpen(true)}
              />
            </TabsContent>
            
            <TabsContent value="member" className="space-y-4 mt-4">
              <MemberContent
                groupId={groupId!}
                projects={projects}
                myContributions={myContributions}
                myPendingPayments={myPendingPayments}
                setLocation={setLocation}
              />
            </TabsContent>
          </Tabs>
        ) : isAdmin ? (
          <AdminContent 
            groupId={groupId!}
            projects={projects}
            members={members}
            pendingApprovals={pendingApprovals}
            setLocation={setLocation}
            onCreateProject={() => setCreateProjectModalOpen(true)}
          />
        ) : (
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
    </div>
  );
}

function AdminContent({
  groupId,
  projects,
  members,
  pendingApprovals,
  setLocation,
  onCreateProject,
}: {
  groupId: string;
  projects: Project[];
  members: GroupMemberWithUser[];
  pendingApprovals: number;
  setLocation: (path: string) => void;
  onCreateProject: () => void;
}) {
  return (
    <>
      {pendingApprovals > 0 && (
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
                onClick={() => setLocation(`/admin/projects`)}
                data-testid="button-review-payments"
              >
                Review
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        <ProjectsDropdown 
          groupId={groupId} 
          projects={projects} 
          setLocation={setLocation}
          onCreateProject={onCreateProject}
        />

        <Card
          className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-[0.99]"
          onClick={() => setLocation(`/group/${groupId}/members`)}
          data-testid="nav-card-members"
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Members</h3>
                  <p className="text-sm text-gray-500">
                    {members.length} {members.length === 1 ? "member" : "members"}
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-300" />
            </div>
          </CardContent>
        </Card>
      </div>
    </>
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

      {myContributions.length > 0 && (
        <Card className="bg-white rounded-2xl">
          <CardContent className="p-5">
            <h3 className="font-bold text-gray-900 mb-3">Recent Payments</h3>
            <div className="space-y-3">
              {myContributions.slice(0, 5).map((contribution) => (
                <div key={contribution.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="font-medium text-gray-900">{contribution.projectName || "General"}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(contribution.createdAt).toLocaleDateString("en-NG", { 
                        day: "numeric", month: "short", year: "numeric" 
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{formatNaira(contribution.amount)}</p>
                    <Badge className={
                      contribution.status === "confirmed" 
                        ? "bg-green-100 text-green-700" 
                        : "bg-yellow-100 text-yellow-700"
                    }>
                      {contribution.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}

function ProjectsDropdown({
  groupId,
  projects,
  setLocation,
  onCreateProject,
}: {
  groupId: string;
  projects: Project[];
  setLocation: (path: string) => void;
  onCreateProject: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-700";
      case "active": return "bg-blue-100 text-blue-700";
      case "paused": return "bg-orange-100 text-orange-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <CollapsibleTrigger asChild>
          <CardContent className="p-4 cursor-pointer hover:bg-gray-50 transition-colors" data-testid="dropdown-projects">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <FolderKanban className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Projects</h3>
                  <p className="text-sm text-gray-500">
                    {projects.length} {projects.length === 1 ? "project" : "projects"}
                  </p>
                </div>
              </div>
              <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
          </CardContent>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-2">
            {projects.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500 mb-3">No projects yet</p>
                <Button
                  size="sm"
                  onClick={onCreateProject}
                  data-testid="button-create-project"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Create Project
                </Button>
              </div>
            ) : (
              <>
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => setLocation(`/project/${project.id}`)}
                    data-testid={`project-item-${project.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{project.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={`text-xs ${getStatusColor(project.status)}`}>
                          {project.status}
                        </Badge>
                        {project.targetAmount && parseFloat(project.targetAmount) > 0 && (
                          <span className="text-xs text-gray-500">
                            {formatNaira(project.collectedAmount || "0")} / {formatNaira(project.targetAmount)}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2"
                  onClick={onCreateProject}
                  data-testid="button-add-project"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add New Project
                </Button>
              </>
            )}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
