import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Group, Project } from "@shared/schema";
import { formatNaira } from "@/lib/currency";
import { Target, Calendar, TrendingUp, Loader2, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface ProjectSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: Group | null;
  onSelectProject: (project: Project) => void;
}

export function ProjectSelectionModal({ 
  open, 
  onOpenChange, 
  group,
  onSelectProject 
}: ProjectSelectionModalProps) {
  const { data: projects = [], isLoading, error } = useQuery<Project[]>({
    queryKey: ["/api/groups", group?.id, "projects"],
    queryFn: async () => {
      if (!group) return [];
      const response = await fetch(`/api/groups/${group.id}/projects`);
      if (!response.ok) throw new Error("Failed to fetch projects");
      return response.json();
    },
    enabled: !!group && open,
  });

  const calculateProgress = (collected: string, target: string) => {
    const collectedNum = Number(collected);
    const targetNum = Number(target);
    if (targetNum === 0) return 0;
    return Math.min(Math.round((collectedNum / targetNum) * 100), 100);
  };

  const handleSelectProject = (project: Project) => {
    onSelectProject(project);
    onOpenChange(false);
  };

  if (!group) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select a Project</DialogTitle>
          <p className="text-sm text-gray-600">
            Choose which project in <span className="font-medium">{group.name}</span> you'd like to contribute to
          </p>
        </DialogHeader>

        {isLoading ? (
          <div className="py-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-green-600" />
            <p className="text-gray-600">Loading projects...</p>
          </div>
        ) : error ? (
          <div className="py-12 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load Projects</h3>
            <p className="text-gray-600 mb-4">
              {error instanceof Error ? error.message : "Please try again later"}
            </p>
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              data-testid="close-error-modal"
            >
              Close
            </Button>
          </div>
        ) : projects.length === 0 ? (
          <div className="py-12 text-center">
            <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Projects Available</h3>
            <p className="text-gray-600">
              This group doesn't have any active projects yet. Contact the admin to add projects.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {projects.map((project) => {
              const progress = calculateProgress(project.collectedAmount, project.targetAmount);
              const remaining = Number(project.targetAmount) - Number(project.collectedAmount);
              
              return (
                <Card 
                  key={project.id} 
                  className="hover:shadow-md transition-shadow cursor-pointer border-2 hover:border-green-200"
                  onClick={() => handleSelectProject(project)}
                  data-testid={`project-card-${project.id}`}
                >
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {/* Project Header */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {project.name}
                        </h3>
                        {project.description && (
                          <p className="text-sm text-gray-600">{project.description}</p>
                        )}
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-600">Progress</span>
                          <span className="text-sm font-bold text-green-600">{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Raised: {formatNaira(project.collectedAmount)}</span>
                          <span>Remaining: {formatNaira(remaining.toString())}</span>
                        </div>
                      </div>

                      {/* Project Stats */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-green-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Target className="w-4 h-4 text-green-600" />
                            <span className="text-xs text-gray-600">Target</span>
                          </div>
                          <p className="text-sm font-semibold text-green-700">
                            {formatNaira(project.targetAmount)}
                          </p>
                        </div>
                        
                        {project.deadline && (
                          <div className="bg-blue-50 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <Calendar className="w-4 h-4 text-blue-600" />
                              <span className="text-xs text-gray-600">Deadline</span>
                            </div>
                            <p className="text-sm font-semibold text-blue-700">
                              {format(new Date(project.deadline), "MMM dd, yyyy")}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Action Button */}
                      <Button 
                        className="w-full bg-nigerian-green hover:bg-forest-green"
                        data-testid={`select-project-${project.id}`}
                      >
                        <TrendingUp className="w-4 h-4 mr-2" />
                        Contribute to this Project
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <div className="flex justify-end pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            data-testid="cancel-project-selection"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
