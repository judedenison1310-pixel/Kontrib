import { Project, ProjectWithStats } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Settings, Target, Calendar, TrendingUp, Users } from "lucide-react";
import { formatNaira, calculateProgress } from "@/lib/currency";
import { useLocation } from "wouter";

interface ProjectCardProps {
  project: Project | ProjectWithStats;
  isAdmin?: boolean;
  onManage?: (project: Project) => void;
  onContribute?: (project: Project) => void;
  showViewContributors?: boolean;
}

export function ProjectCard({ 
  project, 
  isAdmin = false, 
  onManage, 
  onContribute,
  showViewContributors = true
}: ProjectCardProps) {
  const [, setLocation] = useLocation();
  const progress = calculateProgress(project.collectedAmount, project.targetAmount);
  const contributionCount = 'contributionCount' in project ? project.contributionCount : 0;
  
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

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h4 className="font-semibold text-gray-900">{project.name}</h4>
              <Badge className={getStatusColor(project.status)}>
                {project.status}
              </Badge>
            </div>
            {project.description && (
              <p className="text-sm text-gray-600 mb-3">{project.description}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm mb-4">
          <div>
            <p className="text-gray-600 flex items-center">
              <Target className="h-4 w-4 mr-1" />
              Target
            </p>
            <p className="font-semibold">{formatNaira(project.targetAmount)}</p>
          </div>
          <div>
            <p className="text-gray-600">Collected</p>
            <p className="font-semibold text-green-600">{formatNaira(project.collectedAmount)}</p>
          </div>
          <div>
            <p className="text-gray-600 flex items-center">
              <TrendingUp className="h-4 w-4 mr-1" />
              Progress
            </p>
            <div className="flex items-center space-x-2">
              <Progress value={progress} className="flex-1 h-2" />
              <span className="text-xs font-medium">{progress}%</span>
            </div>
          </div>
        </div>

        {project.deadline && (
          <div className="mb-4 p-2 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              Deadline: {new Date(project.deadline).toLocaleDateString()}
            </p>
          </div>
        )}

        {('contributionCount' in project || 'completionRate' in project) && (
          <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
            {'contributionCount' in project && <span>{(project as any).contributionCount} contributions</span>}
            {'completionRate' in project && <span>Completion: {(project as any).completionRate}%</span>}
          </div>
        )}

        <div className="space-y-2">
          <div className="flex space-x-2">
            <Button
              onClick={() => onContribute?.(project)}
              className="flex-1 bg-nigerian-green hover:bg-forest-green"
              data-testid="button-contribute"
            >
              Contribute
            </Button>
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onManage?.(project)}
                className="flex-1"
                data-testid="button-manage"
              >
                <Settings className="h-4 w-4 mr-2" />
                Manage
              </Button>
            )}
          </div>
          {showViewContributors && (
            <Button
              variant="outline"
              onClick={() => setLocation(`/project/${project.id}`)}
              className="w-full"
              data-testid="button-view-contributors"
            >
              <Users className="h-4 w-4 mr-2" />
              View Contributors
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}