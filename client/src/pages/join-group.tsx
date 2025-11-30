import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Navigation } from "@/components/navigation";
import { ProgressCircle, BigButton, CardKontrib, StatusBadge } from "@/components/ui/kontrib-ui";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getCurrentUser } from "@/lib/auth";
import { formatNaira } from "@/lib/currency";
import { ArrowLeft, Users, Target, Clock, Link2, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

const REDIRECT_KEY = "kontrib_redirectTo";

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
  isMember: boolean;
}

export default function JoinGroupPage() {
  const [groupLink, setGroupLink] = useState("");
  const [extractedIdentifier, setExtractedIdentifier] = useState<{ value: string; type: "slug" | "registration" } | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const user = getCurrentUser();

  const calculateProgress = (collected: string, target: string): number => {
    const collectedNum = parseFloat(collected || "0");
    const targetNum = parseFloat(target || "1");
    return Math.round((collectedNum / targetNum) * 100);
  };

  const extractGroupIdentifier = (input: string): { value: string; type: "slug" | "registration" } | null => {
    const trimmedInput = input.trim();
    if (trimmedInput.match(/^[a-f0-9-]{36}$/)) return { value: trimmedInput, type: "registration" };
    
    const kontribRegisterMatch = trimmedInput.match(/kontrib\.app\/register\/([^/?]+)/);
    if (kontribRegisterMatch) return { value: kontribRegisterMatch[1], type: "registration" };
    
    const kontribJoinMatch = trimmedInput.match(/kontrib\.app\/join\/([^/?]+)/);
    if (kontribJoinMatch) {
      const identifier = kontribJoinMatch[1];
      return { value: identifier, type: identifier.match(/^[a-f0-9-]{36}$/) ? "registration" : "slug" };
    }
    
    const kontribDirectMatch = trimmedInput.match(/kontrib\.app\/([^/?]+)/);
    if (kontribDirectMatch) {
      const identifier = kontribDirectMatch[1];
      if (!["join", "register", "dashboard", "login", "admin"].includes(identifier.toLowerCase())) {
        return { value: identifier, type: "slug" };
      }
    }
    
    try {
      const url = new URL(trimmedInput);
      const registerMatch = url.pathname.match(/\/register\/([^/?]+)/);
      if (registerMatch) return { value: registerMatch[1], type: "registration" };
      
      const joinMatch = url.pathname.match(/\/join\/([^/?]+)/);
      if (joinMatch) {
        const identifier = joinMatch[1];
        return { value: identifier, type: identifier.match(/^[a-f0-9-]{36}$/) ? "registration" : "slug" };
      }
      
      const pathSegments = url.pathname.split("/").filter((s) => s.length > 0);
      if (pathSegments.length === 1) {
        const identifier = pathSegments[0];
        if (!["join", "register", "dashboard", "login", "admin"].includes(identifier.toLowerCase())) {
          return { value: identifier, type: "slug" };
        }
      }
    } catch {}
    
    if (trimmedInput.match(/^[a-zA-Z0-9_-]+$/)) return { value: trimmedInput, type: "slug" };
    return null;
  };

  const { data: groupPreview, isLoading: isLoadingPreview, error: previewError } = useQuery<GroupData>({
    queryKey: extractedIdentifier
      ? extractedIdentifier.type === "slug"
        ? ["/api/groups/slug", extractedIdentifier.value, user?.id]
        : ["/api/groups/registration", extractedIdentifier.value, user?.id]
      : ["/api/groups/none"],
    queryFn: async () => {
      if (!extractedIdentifier) return null;
      const endpoint = extractedIdentifier.type === "slug"
        ? `/api/groups/slug/${extractedIdentifier.value}`
        : `/api/groups/registration/${extractedIdentifier.value}`;
      const url = user ? `${endpoint}?userId=${user.id}` : endpoint;
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) throw new Error("Group not found");
      return response.json();
    },
    enabled: !!extractedIdentifier,
  });

  const joinGroupMutation = useMutation({
    mutationFn: async () => {
      if (!extractedIdentifier || !user || !groupPreview) throw new Error("Missing data");
      return apiRequest("POST", `/api/groups/${groupPreview.group.id}/join`, { userId: user.id });
    },
    onSuccess: () => {
      toast({ title: "You're in!", description: `Welcome to ${groupPreview?.group.name}` });
      queryClient.invalidateQueries({ queryKey: ["/api/groups/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/user"] });
      setLocation("/dashboard");
    },
    onError: (error: any) => {
      toast({ title: "Couldn't join", description: error.message || "Please try again", variant: "destructive" });
    },
  });

  const handleLinkInput = (value: string) => {
    setGroupLink(value);
    setExtractedIdentifier(extractGroupIdentifier(value));
  };

  const progressPercentage = groupPreview ? calculateProgress(groupPreview.totalCollected, groupPreview.totalTarget) : 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-24 sm:pb-8">
      <Navigation />

      <main className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Back Button */}
        <button
          onClick={() => setLocation("/dashboard")}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm"
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>

        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Join a Group</h1>
          <p className="text-gray-600 mt-1">Paste the link your admin shared with you</p>
        </div>

        {/* Link Input */}
        <CardKontrib>
          <div className="flex items-center gap-3 mb-3">
            <Link2 className="h-5 w-5 text-gray-400" />
            <span className="font-medium text-gray-700">Group Link</span>
          </div>
          <Input
            placeholder="Paste link here..."
            value={groupLink}
            onChange={(e) => handleLinkInput(e.target.value)}
            className="h-14 text-lg rounded-xl border-2"
            data-testid="input-group-link"
          />
          {groupLink && !extractedIdentifier && (
            <div className="flex items-center gap-2 mt-3 text-amber-600 text-sm">
              <AlertCircle className="h-4 w-4" />
              This doesn't look like a valid link
            </div>
          )}
        </CardKontrib>

        {/* Loading State */}
        {isLoadingPreview && extractedIdentifier && (
          <CardKontrib className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
            <p className="text-gray-600">Finding group...</p>
          </CardKontrib>
        )}

        {/* Error State */}
        {previewError && extractedIdentifier && (
          <CardKontrib className="text-center py-8 bg-red-50 border-red-200">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
            <h3 className="font-bold text-red-900 mb-1">Group Not Found</h3>
            <p className="text-red-600 text-sm">Check the link and try again</p>
          </CardKontrib>
        )}

        {/* Group Preview */}
        {groupPreview && !previewError && (
          <CardKontrib className="space-y-6">
            {/* Group Header */}
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-900">{groupPreview.group.name}</h2>
              {groupPreview.group.description && (
                <p className="text-gray-600 text-sm mt-1">{groupPreview.group.description}</p>
              )}
            </div>

            {/* Progress */}
            <div className="flex flex-col items-center">
              <ProgressCircle 
                percentage={progressPercentage} 
                size={100} 
                strokeWidth={8}
              />
              <div className="mt-3 text-center">
                <p className="text-sm text-gray-500">
                  <span className="font-semibold text-primary">{formatNaira(groupPreview.totalCollected)}</span>
                  {" "}of{" "}
                  <span className="font-medium">{formatNaira(groupPreview.totalTarget)}</span>
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-primary/5 rounded-xl p-4 text-center">
                <Users className="h-5 w-5 text-primary mx-auto mb-1" />
                <p className="text-xl font-bold text-gray-900">{groupPreview.memberCount}</p>
                <p className="text-xs text-gray-500">Members</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <Target className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                <p className="text-xl font-bold text-gray-900">{groupPreview.projects.length}</p>
                <p className="text-xs text-gray-500">Projects</p>
              </div>
            </div>

            {/* Projects Preview */}
            {groupPreview.projects.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-700">Active Projects</h3>
                {groupPreview.projects.slice(0, 3).map((project) => (
                  <div key={project.id} className="bg-gray-50 rounded-xl p-3">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-900 text-sm">{project.name}</span>
                      {project.targetAmount && parseFloat(project.targetAmount) > 0 && (
                        <span className="text-primary font-semibold text-sm">
                          {formatNaira(project.targetAmount)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {groupPreview.projects.length > 3 && (
                  <p className="text-center text-xs text-gray-500">
                    +{groupPreview.projects.length - 3} more projects
                  </p>
                )}
              </div>
            )}

            {/* Join Button */}
            {user ? (
              groupPreview.isMember ? (
                <div className="space-y-3">
                  <div className="bg-primary/5 border-2 border-primary rounded-xl p-4 text-center">
                    <CheckCircle className="h-6 w-6 text-primary mx-auto mb-2" />
                    <p className="font-semibold text-primary">You're already a member!</p>
                  </div>
                  <BigButton
                    onClick={() => setLocation("/dashboard")}
                    variant="outline"
                    data-testid="button-go-to-dashboard"
                  >
                    Go to Dashboard
                  </BigButton>
                </div>
              ) : (
                <BigButton
                  onClick={() => joinGroupMutation.mutate()}
                  loading={joinGroupMutation.isPending}
                  icon={<CheckCircle className="h-5 w-5" />}
                  data-testid="button-join-group"
                >
                  Join This Group
                </BigButton>
              )
            ) : (
              <div className="space-y-3">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                  <AlertCircle className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                  <p className="font-medium text-blue-900">Login to join this group</p>
                  <p className="text-sm text-blue-600 mt-1">You need an account to contribute</p>
                </div>
                <BigButton
                  onClick={() => {
                    localStorage.setItem(REDIRECT_KEY, window.location.pathname);
                    setLocation("/");
                  }}
                  data-testid="button-login-to-join"
                >
                  Continue with WhatsApp
                </BigButton>
              </div>
            )}
          </CardKontrib>
        )}
      </main>
    </div>
  );
}
