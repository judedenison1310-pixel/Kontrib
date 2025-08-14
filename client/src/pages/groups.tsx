import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Navigation } from "@/components/navigation";
import { CreateGroupModal } from "@/components/create-group-modal";
import { 
  Users, 
  Plus, 
  Search,
  Target,
  Calendar,
  Share2,
  Settings,
  TrendingUp,
  MessageCircle,
  FolderPlus
} from "lucide-react";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { formatNaira } from "@/lib/currency";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export default function Groups() {
  const user = getCurrentUser();
  const userIsAdmin = isAdmin();
  const { toast } = useToast();
  const [createGroupModalOpen, setCreateGroupModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch groups based on user role
  const { data: groups = [], isLoading } = useQuery<any[]>({
    queryKey: userIsAdmin ? ["/api/groups", "admin", user?.id] : ["/api/groups", "user", user?.id],
    enabled: !!user,
  });

  // Filter groups based on search
  const filteredGroups = groups.filter((group) =>
    group.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleShareGroup = (group: any) => {
    const shareUrl = `${window.location.origin}/register/${group.registrationLink}`;
    
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
        `🎯 You're invited to join our contribution group "${group.name}"!\n\n💰 Target: ${formatNaira(group.targetAmount || 0)}\n📅 Deadline: ${group.deadline ? new Date(group.deadline).toLocaleDateString() : 'No deadline'}\n\n👥 Join here: ${shareUrl}\n\n#Kontrib #GroupContribution`
      );
      window.open(`https://wa.me/?text=${whatsappMessage}`, '_blank');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="animate-pulse space-y-6">
            <div className="h-32 bg-gray-200 rounded-xl"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-48 bg-gray-200 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 sm:pb-0">
      <Navigation />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {userIsAdmin ? "My Groups" : "Groups"}
              </h1>
              <p className="text-gray-600">
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
              {groups.length === 0 ? (
                <>
                  <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-gray-900 mb-2">
                    {userIsAdmin ? "No Groups Created" : "No Groups Joined"}
                  </h3>
                  <p className="text-gray-600 mb-6">
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
                  <h3 className="text-xl font-medium text-gray-900 mb-2">No Results Found</h3>
                  <p className="text-gray-600">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGroups.map((group) => (
              <Card key={group.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{group.name}</CardTitle>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {group.description}
                      </p>
                    </div>
                    <div className="flex-shrink-0 ml-4">
                      <Badge variant="secondary">
                        {group.memberCount || 0} members
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  {/* Financial Progress */}
                  {group.targetAmount && (
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600">Progress</span>
                        <span className="font-medium">
                          {formatNaira(group.collectedAmount || 0)} / {formatNaira(group.targetAmount)}
                        </span>
                      </div>
                      <Progress 
                        value={((group.collectedAmount || 0) / group.targetAmount) * 100} 
                        className="h-2 mb-2"
                      />
                      <div className="text-xs text-gray-500">
                        {Math.round(((group.collectedAmount || 0) / group.targetAmount) * 100)}% completed
                      </div>
                    </div>
                  )}

                  {/* Group Stats */}
                  <div className="space-y-2 mb-4">
                    {group.deadline && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="h-4 w-4 mr-2" />
                        Due: {new Date(group.deadline).toLocaleDateString()}
                      </div>
                    )}
                    <div className="flex items-center text-sm text-gray-600">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      {group.contributionCount || 0} contributions
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    {userIsAdmin ? (
                      // Admin Actions
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleShareGroup(group)}
                          className="w-full"
                          data-testid={`share-group-${group.id}`}
                        >
                          <Share2 className="h-4 w-4 mr-1" />
                          Share
                        </Button>
                        <Link href={`/admin/groups/${group.id}`}>
                          <Button variant="outline" size="sm" className="w-full">
                            <Settings className="h-4 w-4 mr-1" />
                            Manage
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      // Member Actions
                      <div className="grid grid-cols-2 gap-2">
                        <Link href="/make-payment">
                          <Button 
                            size="sm" 
                            className="w-full bg-nigerian-green hover:bg-forest-green"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Contribute
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleShareGroup(group)}
                          className="w-full"
                        >
                          <MessageCircle className="h-4 w-4 mr-1" />
                          Invite
                        </Button>
                      </div>
                    )}

                    {/* WhatsApp Share Link */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const whatsappMessage = encodeURIComponent(
                          `🎯 Join our contribution group "${group.name}"!\n\n💰 Target: ${formatNaira(group.targetAmount || 0)}\n📅 Deadline: ${group.deadline ? new Date(group.deadline).toLocaleDateString() : 'No deadline'}\n\n👥 Join here: ${window.location.origin}/register/${group.registrationLink}\n\n#Kontrib #GroupContribution`
                        );
                        window.open(`https://wa.me/?text=${whatsappMessage}`, '_blank');
                      }}
                      className="w-full text-green-600 hover:text-green-700 hover:bg-green-50"
                      data-testid={`whatsapp-share-${group.id}`}
                    >
                      <MessageCircle className="h-4 w-4 mr-1" />
                      Share on WhatsApp
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Quick Stats Summary */}
        {groups.length > 0 && (
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-nigerian-green">
                      {groups.length}
                    </p>
                    <p className="text-sm text-gray-600">
                      {userIsAdmin ? "Groups Created" : "Groups Joined"}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">
                      {groups.reduce((sum, group) => sum + (group.memberCount || 0), 0)}
                    </p>
                    <p className="text-sm text-gray-600">Total Members</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">
                      {formatNaira(groups.reduce((sum, group) => sum + (group.collectedAmount || 0), 0))}
                    </p>
                    <p className="text-sm text-gray-600">Total Collected</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={createGroupModalOpen}
        onClose={() => setCreateGroupModalOpen(false)}
      />
    </div>
  );
}