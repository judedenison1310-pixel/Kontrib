import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Navigation } from "@/components/navigation";
import { CreateGroupModal } from "@/components/create-group-modal";
import { CreateProjectModal } from "@/components/create-project-modal";
import { GroupCard } from "@/components/group-card";
import { ProjectCard } from "@/components/project-card";
import { ShareableLinkDisplay, CopyLinkButton } from "@/components/copy-link-button";
import { 
  Users, 
  Plus, 
  Search,
  FolderPlus,
  ChevronDown,
  ChevronUp,
  Settings,
  Target,
  Calendar,
  MessageCircle,
  UserPlus,
  Eye,
  UserCheck
} from "lucide-react";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { formatNaira } from "@/lib/currency";
import { useToast } from "@/hooks/use-toast";
import type { Group, Project } from "@shared/schema";

export default function Groups() {
  const user = getCurrentUser();
  const userIsAdmin = isAdmin();
  const { toast } = useToast();
  const [createGroupModalOpen, setCreateGroupModalOpen] = useState(false);
  const [createProjectModalOpen, setCreateProjectModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch groups based on user role
  const { data: groups = [], isLoading } = useQuery<any[]>({
    queryKey: userIsAdmin ? ["/api/groups", "admin", user?.id] : ["/api/groups", "user", user?.id],
    enabled: !!user,
  });

  // Extract groups for member data structure
  const actualGroups = userIsAdmin ? groups : groups.map(membership => membership.group);

  // Filter groups based on search
  const filteredGroups = actualGroups.filter((group) =>
    group.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Hook to fetch projects for a specific group
  const useGroupProjects = (groupId: string) => {
    return useQuery<Project[]>({
      queryKey: ["/api/groups", groupId, "projects"],
      enabled: !!groupId && expandedGroups.has(groupId),
    });
  };

  // Hook to fetch members for a specific group
  const useGroupMembers = (groupId: string) => {
    return useQuery<any[]>({
      queryKey: ["/api/groups", groupId, "members"],
      enabled: !!groupId && expandedGroups.has(groupId),
    });
  };

  const toggleGroupExpansion = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  const handleCreateProject = (group: Group) => {
    setSelectedGroup(group);
    setCreateProjectModalOpen(true);
  };

  const handleManageGroup = (group: Group) => {
    // TODO: Implement group management
    toast({
      title: "Group Management",
      description: "Group management features coming soon!",
    });
  };

  const handleContributeToProject = (project: Project) => {
    // Navigate to make payment page with project pre-selected
    window.location.href = "/make-payment";
  };

  const handleViewMembers = (group: Group) => {
    // Toggle group expansion to show members
    toggleGroupExpansion(group.id);
  };

  const handleShareGroup = (group: any) => {
    const shareUrl = `${window.location.origin}/join/${group.registrationLink}`;
    
    if (navigator.share) {
      navigator.share({
        title: `Join ${group.name}`,
        text: `You're invited to contribute to ${group.name}`,
        url: shareUrl,
      });
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link Copied!",
        description: "Group registration link copied to clipboard.",
      });
    } else {
      // Fallback: Generate WhatsApp message
      const whatsappMessage = encodeURIComponent(
        `🎯 You're invited to join our contribution group "${group.name}"!\n\n💰 Manage contributions with transparency and ease.\n\n👥 Join here: ${shareUrl}\n\n#Kontrib #GroupContribution`
      );
      window.open(`https://wa.me/?text=${whatsappMessage}`, '_blank');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navigation />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="animate-pulse space-y-6">
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 sm:pb-0">
      <Navigation />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {userIsAdmin ? "My Groups" : "Groups"}
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                {userIsAdmin 
                  ? "Manage your contribution groups and track member progress."
                  : "View and contribute to your active groups."
                }
              </p>
            </div>
            {userIsAdmin && (
              <Button 
                onClick={() => setCreateGroupModalOpen(true)}
                className="mt-4 sm:mt-0 bg-nigerian-green hover:bg-forest-green"
                data-testid="create-group-button"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Group
              </Button>
            )}
          </div>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search groups by name or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="search-groups"
              />
            </div>
          </CardContent>
        </Card>

        {/* Groups Grid */}
        {filteredGroups.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              {actualGroups.length === 0 ? (
                <>
                  <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
                    {userIsAdmin ? "No Groups Created" : "No Groups Joined"}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-6">
                    {userIsAdmin 
                      ? "Create your first group to start collecting contributions from members."
                      : "You haven't joined any contribution groups yet. Ask a group admin for an invitation link."
                    }
                  </p>
                  {userIsAdmin && (
                    <Button 
                      onClick={() => setCreateGroupModalOpen(true)}
                      className="bg-nigerian-green hover:bg-forest-green"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Group
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">No Results Found</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    No groups match your search criteria.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setSearchTerm("")}
                    className="mt-4"
                  >
                    Clear Search
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {filteredGroups.map((group) => {
              // Handle different data structures for admin vs member groups
              const userContribution = userIsAdmin ? undefined : 
                groups.find(membership => membership.group?.id === group.id)?.contributedAmount;
              const isExpanded = expandedGroups.has(group.id);
              
              return (
                <GroupWithProjects 
                  key={group.id} 
                  group={group} 
                  isExpanded={isExpanded}
                  userContribution={userContribution}
                />
              );
            })}
          </div>
        )}

        {/* Quick Stats Summary */}
        {actualGroups.length > 0 && (
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-nigerian-green">
                      {actualGroups.length}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {userIsAdmin ? "Groups Created" : "Groups Joined"}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {actualGroups.reduce((sum, group) => sum + (group.memberCount || 0), 0)}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Members</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {actualGroups.reduce((sum, group) => sum + (group.projectCount || 0), 0)}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Projects</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      <CreateGroupModal
        open={createGroupModalOpen}
        onOpenChange={setCreateGroupModalOpen}
      />

      {/* Create Project Modal */}
      {selectedGroup && (
        <CreateProjectModal
          open={createProjectModalOpen}
          onOpenChange={setCreateProjectModalOpen}
          groupId={selectedGroup.id}
          groupName={selectedGroup.name}
        />
      )}
    </div>
  );

  // Component to display group with its projects
  function GroupWithProjects({ 
    group, 
    isExpanded, 
    userContribution 
  }: { 
    group: Group; 
    isExpanded: boolean; 
    userContribution?: string;
  }) {
    const { data: projects = [], isLoading: projectsLoading } = useGroupProjects(group.id);
    const { data: members = [], isLoading: membersLoading } = useGroupMembers(group.id);

    return (
      <Card className="hover:shadow-lg transition-shadow">
        <CardContent className="p-6">
          {/* Group Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <GroupCard
                group={group}
                isAdmin={userIsAdmin}
                onManage={handleManageGroup}
                onShare={handleShareGroup}
                onMakePayment={!userIsAdmin ? () => {} : undefined}
                userContribution={userContribution}
              />
            </div>
          </div>

          {/* Shareable Link Display for Admins */}
          {userIsAdmin && (
            <div className="mb-6">
              <ShareableLinkDisplay
                link={`${window.location.origin}/join/${group.registrationLink}`}
                title="Share Group Link"
                description="Share this easy-to-remember link with people you want to invite"
              />
            </div>
          )}

          {/* Group Action Buttons */}
          <div className="flex flex-wrap gap-2 mb-4">
            {userIsAdmin && (
              <Button
                onClick={() => handleCreateProject(group)}
                variant="outline"
                size="sm"
                className="flex-1 min-w-[120px]"
                data-testid={`create-project-${group.id}`}
              >
                <FolderPlus className="h-4 w-4 mr-1" />
                Add Project
              </Button>
            )}
            
            <Button
              onClick={() => toggleGroupExpansion(group.id)}
              variant="outline"
              size="sm"
              className="flex-1 min-w-[120px]"
              data-testid={`toggle-projects-${group.id}`}
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Hide Projects
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  View Projects ({(group as any).projectCount || 0})
                </>
              )}
            </Button>

            {userIsAdmin && (
              <Button
                onClick={() => handleViewMembers(group)}
                variant="outline"
                size="sm"
                className="flex-1 min-w-[120px]"
                data-testid={`view-members-${group.id}`}
              >
                <UserCheck className="h-4 w-4 mr-1" />
                View Members ({(group as any).memberCount || 0})
              </Button>
            )}

            <Button
              onClick={() => handleShareGroup(group)}
              variant="outline"
              size="sm"
              className="flex-1 min-w-[120px]"
              data-testid={`share-group-${group.id}`}
            >
              <MessageCircle className="h-4 w-4 mr-1" />
              Share Group
            </Button>
          </div>

          {/* Expanded Content - Members and Projects */}
          {isExpanded && (
            <div className="border-t pt-4 space-y-6">
              {/* Members Section */}
              {userIsAdmin && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-gray-900 dark:text-white flex items-center">
                      <Users className="h-5 w-5 mr-2 text-nigerian-green" />
                      Members in {group.name}
                    </h4>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {members.length} member{members.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {membersLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-nigerian-green"></div>
                      <span className="ml-2 text-sm text-gray-600">Loading members...</span>
                    </div>
                  ) : members.length === 0 ? (
                    <div className="text-center py-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <UserPlus className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        No members have joined this group yet. Share the group link to invite members.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {members.map((member) => (
                        <Card key={member.id} className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-nigerian-green rounded-full flex items-center justify-center">
                              <Users className="h-5 w-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 dark:text-white truncate">
                                {member.user?.fullName || 'Unknown Member'}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                                @{member.user?.username || 'unknown'}
                              </p>
                              <p className="text-xs text-gray-500">
                                Joined {new Date(member.joinedAt).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-nigerian-green">
                                {formatNaira(member.contributedAmount || "0")}
                              </p>
                              <p className="text-xs text-gray-500">contributed</p>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Projects Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white flex items-center">
                    <Target className="h-5 w-5 mr-2 text-nigerian-green" />
                    Projects in {group.name}
                  </h4>
                  {userIsAdmin && (
                    <Button
                      onClick={() => handleCreateProject(group)}
                      size="sm"
                      className="bg-nigerian-green hover:bg-forest-green"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      New Project
                    </Button>
                  )}
                </div>

                {projectsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nigerian-green"></div>
                  <span className="ml-2 text-gray-600">Loading projects...</span>
                </div>
              ) : projects.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <FolderPlus className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <h5 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No projects yet
                  </h5>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    {userIsAdmin 
                      ? "Create your first project to start collecting contributions for specific goals."
                      : "No projects have been created in this group yet."
                    }
                  </p>
                  {userIsAdmin && (
                    <Button
                      onClick={() => handleCreateProject(group)}
                      className="bg-nigerian-green hover:bg-forest-green"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Project
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {projects.map((project) => (
                    <div key={project.id} className="relative">
                      <ProjectCard
                        project={project}
                        isAdmin={userIsAdmin}
                        onContribute={handleContributeToProject}
                      />
                      {userIsAdmin && (
                        <div className="absolute top-2 right-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              // TODO: Implement project management
                              toast({
                                title: "Project Management",
                                description: "Project management features coming soon!",
                              });
                            }}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
}