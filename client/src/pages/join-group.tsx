import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getCurrentUser } from "@/lib/auth";
import { formatNaira } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { 
  Users, 
  Target, 
  Clock, 
  Link2, 
  CheckCircle2, 
  ArrowRight,
  AlertCircle,
  Loader2
} from "lucide-react";

interface GroupData {
  group: {
    id: string;
    name: string;
    description: string;
    customSlug: string;
  };
  projects: Array<{
    id: string;
    name: string;
    targetAmount: string;
    collectedAmount: string;
    deadline: string;
  }>;
  memberCount: number;
  totalTarget: string;
  totalCollected: string;
}

export default function JoinGroupPage() {
  const [groupLink, setGroupLink] = useState("");
  const [extractedIdentifier, setExtractedIdentifier] = useState<{ value: string; type: 'slug' | 'registration' } | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const user = getCurrentUser();

  // Helper function to calculate progress percentage
  const calculateProgress = (collected: string, target: string): number => {
    const collectedNum = parseFloat(collected || "0");
    const targetNum = parseFloat(target || "1");
    return Math.round((collectedNum / targetNum) * 100);
  };

  // Extract group identifier (custom slug or registration link) from various URL formats
  const extractGroupIdentifier = (input: string): { value: string; type: 'slug' | 'registration' } | null => {
    const trimmedInput = input.trim();
    
    // Handle direct UUID registration link format
    if (trimmedInput.match(/^[a-f0-9-]{36}$/)) {
      return { value: trimmedInput, type: 'registration' };
    }
    
    // Handle kontrib.app/join/[identifier] format (could be slug or UUID)
    const kontribMatch = trimmedInput.match(/kontrib\.app\/join\/([^/?]+)/);
    if (kontribMatch) {
      const identifier = kontribMatch[1];
      const type = identifier.match(/^[a-f0-9-]{36}$/) ? 'registration' : 'slug';
      return { value: identifier, type };
    }
    
    // Handle full URL with /join/[identifier] path (including replit.app URLs)
    try {
      const url = new URL(trimmedInput);
      const joinMatch = url.pathname.match(/\/join\/([^/?]+)/);
      if (joinMatch) {
        const identifier = joinMatch[1];
        const type = identifier.match(/^[a-f0-9-]{36}$/) ? 'registration' : 'slug';
        return { value: identifier, type };
      }
    } catch {
      // Not a valid URL, continue
    }
    
    // Handle /join/[identifier] format
    const pathMatch = trimmedInput.match(/^\/join\/([^/?]+)/);
    if (pathMatch) {
      const identifier = pathMatch[1];
      const type = identifier.match(/^[a-f0-9-]{36}$/) ? 'registration' : 'slug';
      return { value: identifier, type };
    }
    
    // Handle direct custom slug (alphanumeric, hyphens, underscores)
    if (trimmedInput.match(/^[a-zA-Z0-9_-]+$/)) {
      return { value: trimmedInput, type: 'slug' };
    }
    
    return null;
  };

  // Preview group data when identifier is detected
  const { data: groupPreview, isLoading: isLoadingPreview, error: previewError } = useQuery<GroupData>({
    queryKey: extractedIdentifier 
      ? extractedIdentifier.type === 'slug' 
        ? ['/api/groups/slug', extractedIdentifier.value]
        : ['/api/groups/registration', extractedIdentifier.value]
      : ['/api/groups/none'],
    enabled: !!extractedIdentifier,
  });

  // Join group mutation
  const joinGroupMutation = useMutation({
    mutationFn: async () => {
      if (!extractedIdentifier || !user || !groupPreview) throw new Error("Missing data");
      
      return apiRequest("POST", `/api/groups/${groupPreview.group.id}/join`, {
        userId: user.id
      });
    },
    onSuccess: () => {
      toast({
        title: "Successfully joined group!",
        description: `You are now a member of ${groupPreview?.group.name}`,
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/groups/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats/user'] });
      
      // Navigate to member dashboard
      setLocation("/dashboard");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to join group",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleLinkInput = (value: string) => {
    setGroupLink(value);
    const identifier = extractGroupIdentifier(value);
    setExtractedIdentifier(identifier);
  };

  const handleJoinGroup = () => {
    if (!groupPreview) return;
    joinGroupMutation.mutate();
  };

  const getDaysRemaining = (): number | null => {
    if (!groupPreview?.projects.length) return null;
    
    const earliestDeadline = groupPreview.projects
      .filter((p: any) => p.deadline)
      .map((p: any) => new Date(p.deadline))
      .sort((a: Date, b: Date) => a.getTime() - b.getTime())[0];
    
    if (!earliestDeadline) return null;
    
    const today = new Date();
    const diffTime = earliestDeadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays > 0 ? diffDays : 0;
  };

  const progressPercentage = groupPreview 
    ? calculateProgress(groupPreview.totalCollected, groupPreview.totalTarget)
    : 0;
  
  const daysRemaining = getDaysRemaining();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-md mx-auto px-4 space-y-6">
        
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Join a Group</h1>
          <p className="text-gray-600">Enter a group link to join and start contributing</p>
        </div>

        {/* Link Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5" />
              Group Link
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="group-link">Paste group link here</Label>
              <Input
                id="group-link"
                placeholder="kontrib.app/join/... or registration link"
                value={groupLink}
                onChange={(e) => handleLinkInput(e.target.value)}
                data-testid="input-group-link"
              />
              {groupLink && !extractedIdentifier && (
                <div className="flex items-center gap-2 text-sm text-orange-600">
                  <AlertCircle className="w-4 h-4" />
                  Invalid link format. Please check and try again.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {isLoadingPreview && extractedIdentifier && (
          <Card>
            <CardContent className="py-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-green-600" />
              <p className="text-gray-600">Loading group details...</p>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {previewError && extractedIdentifier && (
          <Card className="border-red-200">
            <CardContent className="py-8 text-center">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
              <h3 className="font-semibold text-red-800 mb-2">Group Not Found</h3>
              <p className="text-red-600 text-sm">
                The group link is invalid or the group no longer exists.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Group Preview */}
        {groupPreview && !previewError && (
          <Card className="border-green-200">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                {groupPreview.group.name}
              </h2>
              {groupPreview.group.description && (
                <p className="text-gray-600 text-sm">
                  {groupPreview.group.description}
                </p>
              )}
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Goal Amount */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Target className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-gray-600">Target Goal</span>
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {formatNaira(groupPreview.totalTarget)}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Progress</span>
                  <span className="text-sm font-bold text-green-600">
                    {progressPercentage}%
                  </span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Raised: {formatNaira(groupPreview.totalCollected)}</span>
                  <span>Remaining: {formatNaira(parseInt(groupPreview.totalTarget) - parseInt(groupPreview.totalCollected))}</span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <Users className="w-4 h-4 text-green-600 mx-auto mb-1" />
                  <div className="text-lg font-bold text-green-600">
                    {groupPreview.memberCount}
                  </div>
                  <div className="text-xs text-gray-600">Members</div>
                </div>
                
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <Target className="w-4 h-4 text-blue-600 mx-auto mb-1" />
                  <div className="text-lg font-bold text-blue-600">
                    {groupPreview.projects.length}
                  </div>
                  <div className="text-xs text-gray-600">Projects</div>
                </div>
              </div>

              {/* Deadline */}
              {daysRemaining !== null && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-orange-600" />
                    <span className="text-sm font-medium text-orange-800">Time Remaining</span>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-orange-600 mb-1">
                      {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}
                    </div>
                    <div className="text-xs text-orange-700">
                      Until first deadline
                    </div>
                  </div>
                </div>
              )}

              {/* Join Button */}
              {user ? (
                <Button 
                  onClick={handleJoinGroup}
                  disabled={joinGroupMutation.isPending}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-lg font-semibold rounded-lg shadow-lg"
                  data-testid="button-join-group"
                >
                  {joinGroupMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5 mr-2" />
                      Join This Group
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                    <AlertCircle className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                    <p className="text-sm text-blue-800 font-medium mb-2">
                      Please log in to join this group
                    </p>
                    <p className="text-xs text-blue-600">
                      You'll need an account to become a member and start contributing
                    </p>
                  </div>
                  <Button 
                    onClick={() => setLocation("/")}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4"
                    data-testid="button-login-to-join"
                  >
                    Go to Login
                  </Button>
                </div>
              )}

              {/* Projects Preview */}
              {groupPreview.projects.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-medium text-gray-900 text-sm">Projects in this group</h3>
                  <div className="space-y-2">
                    {groupPreview.projects.slice(0, 3).map((project: any) => (
                      <div key={project.id} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium text-gray-900">{project.name}</span>
                          <span className="text-sm font-bold text-green-600">
                            {formatNaira(project.targetAmount)}
                          </span>
                        </div>
                        <Progress 
                          value={calculateProgress(project.collectedAmount, project.targetAmount)} 
                          className="h-1" 
                        />
                      </div>
                    ))}
                    {groupPreview.projects.length > 3 && (
                      <div className="text-center text-xs text-gray-500">
                        +{groupPreview.projects.length - 3} more projects
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Trust Indicators */}
              <div className="text-center text-xs text-gray-500 space-y-1">
                <div>Secure group contributions with SMS verification</div>
                <div className="flex items-center justify-center gap-4">
                  <Badge variant="secondary" className="text-xs">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Verified Group
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    <Users className="w-3 h-3 mr-1" />
                    {groupPreview.memberCount} Active Members
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}