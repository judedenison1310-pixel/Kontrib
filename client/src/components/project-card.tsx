import { Project, ProjectWithStats } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Target, Calendar, TrendingUp, ChevronRight, CreditCard } from "lucide-react";
import { formatNaira } from "@/lib/currency";
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
  
  const hasTarget = project.targetAmount && parseFloat(project.targetAmount) > 0;
  const progress = hasTarget 
    ? Math.min(Math.round((parseFloat(project.collectedAmount) / parseFloat(project.targetAmount!)) * 100), 100)
    : 0;
  
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

  const handleCardClick = () => {
    setLocation(`/project/${project.id}`);
  };

  return (
    <div 
      className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer active:bg-gray-50"
      onClick={handleCardClick}
      data-testid={`project-card-${project.id}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-bold text-gray-900">{project.name}</h4>
            <Badge className={`${getStatusColor(project.status)} text-xs`}>
              {project.status}
            </Badge>
          </div>
          <p className="text-sm text-gray-500">{getProjectTypeLabel(project.projectType)}</p>
        </div>
        <ChevronRight className="h-5 w-5 text-gray-300 shrink-0" />
      </div>

      {/* Stats */}
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

      {/* Progress bar - only for target-based projects */}
      {hasTarget && (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-500">Progress</span>
            <span className="text-xs font-medium text-primary">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {/* Deadline */}
      {project.deadline && (
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Calendar className="h-4 w-4" />
          <span>Due: {new Date(project.deadline).toLocaleDateString("en-NG", { 
            day: "numeric", 
            month: "short", 
            year: "numeric" 
          })}</span>
        </div>
      )}

      {/* Actions */}
      <div className="pt-3 border-t border-gray-100 flex gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onContribute?.(project);
          }}
          className="flex-1 bg-primary hover:bg-primary/90 text-white font-medium py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors"
          data-testid={`button-contribute-${project.id}`}
        >
          <CreditCard className="h-4 w-4" />
          Submit Proof
        </button>
      </div>
    </div>
  );
}
