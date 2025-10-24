import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Users } from "lucide-react";
import { formatNaira, calculateProgress } from "@/lib/currency";
import { format } from "date-fns";

interface GroupLandingData {
  group: {
    id: string;
    name: string;
    description: string;
    adminId: string;
    registrationLink: string;
    customSlug: string;
  };
  projects: Array<{
    id: string;
    name: string;
    description: string;
    targetAmount: string;
    collectedAmount: string;
    deadline: string;
  }>;
  memberCount: number;
  totalTarget: string;
  totalCollected: string;
}

export default function GroupLanding() {
  const params = useParams();
  // Handle multiple URL patterns: /join/:link, /register/:link, or /:groupSlug
  const identifier = params.registrationId || params.link || params.groupSlug;
  const [, navigate] = useLocation();

  // Determine if this is a custom slug or registration link
  const isCustomSlug = params.groupSlug && !params.link && !params.registrationId;

  const { data: groupData, isLoading: groupLoading } = useQuery<GroupLandingData>({
    queryKey: isCustomSlug 
      ? ["/api/groups/slug", identifier]
      : ["/api/groups/registration", identifier],
    enabled: !!identifier
  });

  const getDaysRemaining = () => {
    if (!groupData?.projects.length) return null;
    
    const earliestDeadline = groupData.projects
      .filter(p => p.deadline)
      .reduce((earliest, project) => {
        const projectDeadline = new Date(project.deadline);
        return !earliest || projectDeadline < earliest ? projectDeadline : earliest;
      }, null as Date | null);
    
    if (!earliestDeadline) return null;
    
    const now = new Date();
    const diffTime = earliestDeadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return {
      days: diffDays > 0 ? diffDays : 0,
      date: earliestDeadline
    };
  };

  const handleJoinGroup = () => {
    navigate("/");
  };

  if (groupLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-green-600 text-lg">Loading...</div>
      </div>
    );
  }

  if (!groupData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Group Not Found</h1>
          <p className="text-gray-600 mb-4">This group link may be invalid or expired.</p>
          <Button onClick={() => navigate("/")} data-testid="button-go-home">
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  const progressPercentage = calculateProgress(groupData.totalCollected, groupData.totalTarget);
  const deadlineInfo = getDaysRemaining();
  
  const currentProject = groupData.projects.length > 0 ? groupData.projects[0] : null;
  const shareUrl = groupData.group.customSlug 
    ? `kontrib.app/${groupData.group.customSlug}`
    : `kontrib.app/join/${groupData.group.registrationLink}`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Kontrib Logo Header */}
      <div className="bg-white py-4">
        <div className="max-w-md mx-auto px-4">
          <div className="flex items-center justify-center">
            {/* Official Kontrib Logo */}
            <img 
              src="/kontrib-logo.jpg?v=3" 
              alt="Kontrib" 
              className="h-24 w-auto object-contain"
              data-testid="img-kontrib-logo"
              onError={(e) => {
                console.error('Logo failed to load');
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto px-4 pb-8">
        {/* Group Info Card */}
        <Card className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-4">
          <div className="flex items-start gap-4 mb-6">
            {/* Group Icon */}
            <div className="w-14 h-14 bg-green-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
              <Users className="w-7 h-7 text-white" />
            </div>
            
            {/* Group Name and Description */}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-gray-900 mb-1" data-testid="text-group-name">
                {groupData.group.name}
              </h1>
              {currentProject && (
                <p className="text-gray-600 text-sm" data-testid="text-project-description">
                  {currentProject.description || currentProject.name}
                </p>
              )}
            </div>
          </div>

          {/* Progress Section */}
          <div className="space-y-3">
            {/* Amount Display */}
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-2xl font-bold text-gray-900" data-testid="text-collected-amount">
                  {formatNaira(groupData.totalCollected)}
                </span>
                <span className="text-sm text-gray-600 ml-2">don enter</span>
              </div>
              <div className="text-right">
                <span className="text-sm text-gray-600">out of </span>
                <span className="text-lg font-bold text-gray-900" data-testid="text-target-amount">
                  {formatNaira(groupData.totalTarget)}
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="relative">
              <Progress 
                value={progressPercentage} 
                className="h-8 bg-gray-200" 
                data-testid="progress-bar"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold text-white drop-shadow-md" data-testid="text-progress-percentage">
                  {progressPercentage}%
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Deadline Section */}
        {deadlineInfo && (
          <div className="text-center mb-4">
            <p className="text-gray-600 text-sm mb-1">E remain till</p>
            <p className="text-2xl font-bold text-gray-900" data-testid="text-deadline">
              {format(deadlineInfo.date, "MMM d, yyyy")}
            </p>
          </div>
        )}

        {/* Join Button */}
        <Button 
          onClick={handleJoinGroup}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-lg font-semibold rounded-xl shadow-lg mb-6 flex items-center justify-center gap-2"
          data-testid="button-join-group"
        >
          <Users className="w-5 h-5" />
          Join Group
        </Button>

        {/* Info Box */}
        <div className="bg-gray-100 rounded-xl p-6 text-center space-y-3">
          <p className="text-sm text-gray-600 font-medium" data-testid="text-share-url">
            {shareUrl}
          </p>
          <p className="text-base font-semibold text-gray-900">
            Let's keep it transparent!
          </p>
          <p className="text-sm text-gray-700">
            <span className="font-semibold">Join Kontrib</span> to track your contributions
          </p>
          <p className="text-sm text-gray-600" data-testid="text-member-count">
            <span className="font-bold">{groupData.memberCount}</span> Members Joined
          </p>
        </div>
      </div>
    </div>
  );
}
