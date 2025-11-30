import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Users, CheckCircle, Loader2 } from "lucide-react";
import { formatNaira, calculateProgress } from "@/lib/currency";
import { format } from "date-fns";
import { getCurrentUser } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const REDIRECT_KEY = "kontrib_redirectTo";

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
  isMember?: boolean;
}

export default function GroupLanding() {
  const params = useParams();
  const groupSlug = params.groupSlug;
  const projectSlug = params.projectSlug;
  const identifier = params.registrationId || params.link || groupSlug;
  const [, navigate] = useLocation();
  const user = getCurrentUser();
  const { toast } = useToast();

  const isJoinFormat = groupSlug && projectSlug;
  const isCustomSlug = groupSlug && !params.link && !params.registrationId && !projectSlug;

  const { data: groupData, isLoading: groupLoading } = useQuery<GroupLandingData>({
    queryKey: isJoinFormat
      ? ["/api/groups/join", groupSlug, projectSlug, user?.id]
      : isCustomSlug 
        ? ["/api/groups/slug", identifier, user?.id]
        : ["/api/groups/registration", identifier, user?.id],
    queryFn: async () => {
      let endpoint: string;
      if (isJoinFormat) {
        endpoint = `/api/groups/join/${groupSlug}/${projectSlug}`;
      } else if (isCustomSlug) {
        endpoint = `/api/groups/slug/${identifier}`;
      } else {
        endpoint = `/api/groups/registration/${identifier}`;
      }
      const url = user ? `${endpoint}?userId=${user.id}` : endpoint;
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) throw new Error("Group not found");
      return response.json();
    },
    enabled: !!(identifier || (groupSlug && projectSlug))
  });

  const joinGroupMutation = useMutation({
    mutationFn: async () => {
      if (!groupData || !user) throw new Error("Missing data");
      const response = await apiRequest("POST", `/api/groups/${groupData.group.id}/join`, { userId: user.id });
      return response.json();
    },
    onSuccess: (data) => {
      toast({ title: "You're in!", description: `Welcome to ${groupData?.group.name}` });
      queryClient.invalidateQueries({ queryKey: ["/api/groups/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups/all"] });
      
      // If user came via project deep link, take them to that project
      if (projectSlug && groupData?.projects.length) {
        const matchedProject = groupData.projects.find(p => {
          const pSlug = p.name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '').slice(0, 50);
          return pSlug === projectSlug;
        });
        if (matchedProject) {
          navigate(`/project/${matchedProject.id}`);
          return;
        }
      }
      navigate("/groups");
    },
    onError: (error: any) => {
      toast({ title: "Couldn't join", description: error.message || "Please try again", variant: "destructive" });
    },
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
    if (!user) {
      localStorage.setItem(REDIRECT_KEY, window.location.pathname);
      navigate("/");
      return;
    }
    
    if (groupData?.isMember) {
      navigate("/groups");
      return;
    }
    
    joinGroupMutation.mutate();
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
  
  const generateProjectSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '')
      .slice(0, 50);
  };
  
  const shareUrl = currentProject && groupData.group.customSlug
    ? `kontrib.app/join/${groupData.group.customSlug}/${generateProjectSlug(currentProject.name)}`
    : groupData.group.customSlug 
      ? `kontrib.app/join/${groupData.group.customSlug}`
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

          {/* Amount Display - Simplified */}
          <div className="text-center py-4">
            <div className="text-4xl font-black text-gray-900 mb-1" data-testid="text-collected-amount">
              {formatNaira(groupData.totalCollected)}
            </div>
            <div className="text-lg text-gray-600">don enter</div>
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
        {groupData?.isMember ? (
          <Button 
            onClick={() => {
              // If came via project link and there's a matching project, go there
              if (projectSlug && groupData?.projects.length) {
                const matchedProject = groupData.projects.find(p => {
                  const pSlug = p.name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '').slice(0, 50);
                  return pSlug === projectSlug;
                });
                if (matchedProject) {
                  navigate(`/project/${matchedProject.id}`);
                  return;
                }
              }
              navigate("/groups");
            }}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-lg font-semibold rounded-xl shadow-lg mb-3 flex items-center justify-center gap-2"
            data-testid="button-already-member"
          >
            <CheckCircle className="w-5 h-5" />
            {projectSlug ? "Go to Project" : "You're Already a Member"}
          </Button>
        ) : (
          <Button 
            onClick={handleJoinGroup}
            disabled={joinGroupMutation.isPending}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-lg font-semibold rounded-xl shadow-lg mb-3 flex items-center justify-center gap-2"
            data-testid="button-join-group"
          >
            {joinGroupMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Users className="w-5 h-5" />
            )}
            {user ? "Join & Contribute" : "Continue with WhatsApp"}
          </Button>
        )}

        {/* Cancel/Exit Button */}
        <Button 
          onClick={() => navigate("/")}
          variant="outline"
          className="w-full py-6 text-lg font-semibold rounded-xl mb-6"
          data-testid="button-cancel"
        >
          Cancel
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
