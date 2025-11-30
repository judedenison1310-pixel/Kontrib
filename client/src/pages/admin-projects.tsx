import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Navigation } from "@/components/navigation";
import { CreateProjectModal } from "@/components/create-project-modal";
import { PaymentModal } from "@/components/payment-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  FolderPlus,
  Target,
  Calendar,
  ChevronRight,
  CreditCard,
  Users,
  Plus,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { formatNaira } from "@/lib/currency";
import { Project, Group } from "@shared/schema";

interface ProjectWithGroup extends Project {
  groupId: string;
  groupName: string;
}

export default function AdminProjects() {
  const user = getCurrentUser();
  const [, setLocation] = useLocation();
  const [createProjectModalOpen, setCreateProjectModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectWithGroup | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

  const { data: projects = [], isLoading: projectsLoading } = useQuery<ProjectWithGroup[]>({
    queryKey: ["/api/projects/admin", user?.id],
    enabled: !!user,
  });

  const { data: groups = [], isLoading: groupsLoading } = useQuery<Group[]>({
    queryKey: ["/api/groups", "admin", user?.id],
    enabled: !!user,
  });

  const isLoading = projectsLoading || groupsLoading;

  const handleCreateProject = (group?: Group) => {
    if (group) {
      setSelectedGroup(group);
    } else if (groups.length > 0) {
      setSelectedGroup(groups[0]);
    }
    setCreateProjectModalOpen(true);
  };

  const handlePaymentClick = (project: ProjectWithGroup) => {
    setSelectedProject(project);
    setPaymentModalOpen(true);
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
      case "monthly": return "Monthly Dues";
      case "yearly": return "Yearly Dues";
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

  return (
    <div className="min-h-screen bg-gray-50 pb-24 sm:pb-8">
      <Navigation />

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900" data-testid="text-page-title">
              My Projects
            </h1>
            <p className="text-gray-500">Manage your contributions</p>
          </div>
          {projects.length > 0 && groups.length > 0 && (
            <button
              onClick={() => handleCreateProject()}
              className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white shadow-lg hover:bg-primary/90 transition-colors"
              data-testid="button-create-project-fab"
            >
              <Plus className="h-6 w-6" />
            </button>
          )}
        </div>

        {projects.length === 0 ? (
          <Card className="border-2 border-dashed border-gray-300">
            <CardContent className="py-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FolderPlus className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2" data-testid="text-empty-state">
                No projects yet
              </h3>
              <p className="text-gray-500 mb-6">
                Create your first project to start collecting contributions
              </p>
              {groups.length > 0 ? (
                <Button
                  onClick={() => handleCreateProject()}
                  className="bg-primary hover:bg-primary/90"
                  data-testid="button-create-first-project"
                >
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Create First Project
                </Button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-amber-600">You need to create a group first</p>
                  <Button
                    onClick={() => setLocation("/admin")}
                    variant="outline"
                    data-testid="button-go-to-dashboard"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Go to Dashboard
                  </Button>
                </div>
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
                        <p className="text-xs text-primary mt-1">{project.groupName}</p>
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
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePaymentClick(project);
                        }}
                        className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors"
                        data-testid={`button-payment-${project.id}`}
                      >
                        <CreditCard className="h-4 w-4" />
                        Submit Payment Proof
                      </button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {selectedGroup && (
        <CreateProjectModal
          open={createProjectModalOpen}
          onOpenChange={setCreateProjectModalOpen}
          groupId={selectedGroup.id}
          groupName={selectedGroup.name}
        />
      )}

      {selectedProject && (
        <PaymentModal
          open={paymentModalOpen}
          onOpenChange={setPaymentModalOpen}
          project={selectedProject}
        />
      )}
    </div>
  );
}
