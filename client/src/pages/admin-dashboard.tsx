import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Navigation } from "@/components/navigation";
import { GroupCard } from "@/components/group-card";
import { CreateGroupModal } from "@/components/create-group-modal";
import { CreatePurseModal } from "@/components/create-project-modal";
import { ManageAccountabilityPartnersModal } from "@/components/manage-accountability-partners-modal";
import { PurseCard } from "@/components/project-card";
import { PaymentModal } from "@/components/payment-modal";
import { PaymentApprovalModal } from "@/components/payment-approval-modal";
import { NotificationsPanel } from "@/components/notifications-panel";
import { 
  Plus, 
  DollarSign, 
  Users, 
  Clock, 
  TrendingUp, 
  Bell, 
  FileText,
  MessageCircle,
  ArrowDown,
  Settings,
  FolderPlus,
  UserCheck,
  CheckCircle,
  XCircle
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { formatNaira } from "@/lib/currency";
import { Group, Purse, ContributionWithDetails } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export default function AdminDashboard() {
  const user = getCurrentUser();
  const { toast } = useToast();
  const [createGroupModalOpen, setCreateGroupModalOpen] = useState(false);
  const [createPurseModalOpen, setCreatePurseModalOpen] = useState(false);
  const [managePartnersModalOpen, setManagePartnersModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [selectedPurse, setSelectedPurse] = useState<Purse | null>(null);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [selectedContribution, setSelectedContribution] = useState<ContributionWithDetails | null>(null);

  const { data: groups = [], isLoading: groupsLoading } = useQuery<Group[]>({
    queryKey: ["/api/groups", "admin", user?.id],
    enabled: !!user,
  });

  const { data: adminStats = {}, isLoading: statsLoading } = useQuery<any>({
    queryKey: ["/api/stats", "admin", user?.id],
    enabled: !!user,
  });

  const { data: recentContributions = [], isLoading: contributionsLoading } = useQuery<ContributionWithDetails[]>({
    queryKey: ["/api/contributions/admin", user?.id],
    enabled: !!user,
  });

  const handleShareGroup = (group: Group) => {
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
      // Fallback for older browsers
      const whatsappMessage = encodeURIComponent(
        `You're invited to join our contribution group "${group.name}"! Click here to join: ${shareUrl}`
      );
      window.open(`https://wa.me/?text=${whatsappMessage}`, '_blank');
    }
  };

  const handleManageGroup = (group: Group) => {
    toast({
      title: "Feature Coming Soon",
      description: "Group management features will be available soon.",
    });
  };

  const handleCreatePurse = (group: Group) => {
    setSelectedGroup(group);
    setCreatePurseModalOpen(true);
  };

  const handleManagePartners = (group: Group) => {
    setSelectedGroup(group);
    setManagePartnersModalOpen(true);
  };

  const toggleGroupExpansion = (groupId: string) => {
    setExpandedGroupId(expandedGroupId === groupId ? null : groupId);
  };

  const handleContributeToPurse = (purse: Purse) => {
    setSelectedPurse(purse);
    setPaymentModalOpen(true);
  };

  // Hook to fetch purses for a specific group
  const useGroupPurses = (groupId: string) => {
    return useQuery<Purse[]>({
      queryKey: ["/api/groups", groupId, "purses"],
      enabled: !!groupId,
    });
  };

  // Component to display group with its purses
  function GroupWithPurses({ group }: { group: Group }) {
    const { data: purses = [], isLoading: pursesLoading } = useGroupPurses(group.id);
    const isExpanded = expandedGroupId === group.id;

    return (
      <div className="space-y-3">
        <GroupCard
          group={group}
          isAdmin={true}
          onManage={handleManageGroup}
          onShare={handleShareGroup}
        />
        
        {/* Quick Actions for Group */}
        <div className="flex space-x-2">
          <Button
            onClick={() => handleCreatePurse(group)}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            <FolderPlus className="h-4 w-4 mr-1" />
            Add Purse
          </Button>
          <Button
            onClick={() => toggleGroupExpansion(group.id)}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            <Settings className="h-4 w-4 mr-1" />
            {isExpanded ? 'Hide' : 'View'} Purses ({purses.length})
          </Button>
          <Button
            onClick={() => handleManagePartners(group)}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            <UserCheck className="h-4 w-4 mr-1" />
            Partners
          </Button>
        </div>

        {/* Purses List */}
        {isExpanded && (
          <div className="ml-4 pl-4 border-l-2 border-gray-200 space-y-3">
            {pursesLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nigerian-green mx-auto"></div>
                <p className="text-sm text-gray-600 mt-2">Loading purses...</p>
              </div>
            ) : purses.length === 0 ? (
              <div className="text-center py-6 bg-gray-50 rounded-lg">
                <FolderPlus className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-3">No purses yet in this group</p>
                <Button
                  onClick={() => handleCreatePurse(group)}
                  size="sm"
                  className="bg-nigerian-green hover:bg-forest-green"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Create First Purse
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Active Purses ({purses.length})</h4>
                {purses.map((purse) => (
                  <PurseCard 
                    key={purse.id} 
                    purse={purse} 
                    isAdmin={true}
                    onContribute={handleContributeToPurse}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  if (groupsLoading || statsLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="animate-pulse space-y-6">
            <div className="h-32 bg-gray-200 rounded-xl"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
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
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Dashboard Header */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-nigerian-green to-forest-green rounded-xl p-6 text-white">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">Admin Dashboard</h2>
                <p className="text-green-100">Welcome back, {user?.fullName}</p>
                <p className="text-green-200 text-sm">Managing {groups.length} active groups</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Collections</p>
                  <p className="text-2xl font-bold text-nigerian-green">
                    {adminStats ? formatNaira(adminStats.totalCollections) : "₦0"}
                  </p>
                  <p className="text-xs text-green-600">All groups combined</p>
                </div>
                <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center">
                  <DollarSign className="text-nigerian-green h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Members</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {adminStats?.activeMembers || 0}
                  </p>
                  <p className="text-xs text-blue-600">Across all groups</p>
                </div>
                <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center">
                  <Users className="text-blue-500 h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Payments</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {adminStats?.pendingPayments || 0}
                  </p>
                  <p className="text-xs text-orange-600">Need follow-up</p>
                </div>
                <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center">
                  <Clock className="text-orange-500 h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                  <p className="text-2xl font-bold text-green-600">
                    {adminStats?.completionRate || 0}%
                  </p>
                  <p className="text-xs text-green-600">Above average</p>
                </div>
                <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center">
                  <TrendingUp className="text-green-500 h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Groups Management */}
          <div className="lg:col-span-2 space-y-6">
            {/* Active Groups */}
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle>Active Groups</CardTitle>
                  <Button 
                    onClick={() => setCreateGroupModalOpen(true)}
                    className="mt-3 sm:mt-0 bg-nigerian-green hover:bg-forest-green"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Group
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {groups.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No groups yet</h3>
                    <p className="text-gray-600 mb-4">Create your first group to start collecting contributions.</p>
                    <Button 
                      onClick={() => setCreateGroupModalOpen(true)}
                      className="bg-nigerian-green hover:bg-forest-green"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Group
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {groups.map((group) => (
                      <GroupWithPurses key={group.id} group={group} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Transactions */}
            <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Recent Transactions</CardTitle>
                    <Button variant="ghost" size="sm">View All</Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentContributions.slice(0, 5).map((contribution) => (
                      <div 
                        key={contribution.id} 
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors ${
                          contribution.status === 'pending' ? 'border-orange-200 bg-orange-50' : 
                          contribution.status === 'confirmed' ? 'border-green-200 bg-green-50' : 
                          'border-red-200 bg-red-50'
                        }`}
                        onClick={() => {
                          setSelectedContribution(contribution);
                          setApprovalModalOpen(true);
                        }}
                        data-testid={`contribution-${contribution.id}`}
                      >
                        <div className="flex items-center space-x-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            contribution.status === 'pending' ? 'bg-orange-100' :
                            contribution.status === 'confirmed' ? 'bg-green-100' :
                            'bg-red-100'
                          }`}>
                            {contribution.status === 'pending' ? (
                              <Clock className={`h-5 w-5 text-orange-600`} />
                            ) : contribution.status === 'confirmed' ? (
                              <CheckCircle className={`h-5 w-5 text-green-600`} />
                            ) : (
                              <XCircle className={`h-5 w-5 text-red-600`} />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900">{contribution.userName}</p>
                              <Badge 
                                variant="secondary" 
                                className={
                                  contribution.status === 'pending' ? 'bg-orange-100 text-orange-800' :
                                  contribution.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                  'bg-red-100 text-red-800'
                                }
                              >
                                {contribution.status.toUpperCase()}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600">{contribution.groupName}
                              {contribution.purseName && (
                                <span className="text-gray-500"> → {contribution.purseName}</span>
                              )}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(contribution.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            {formatNaira(Number(contribution.amount))}
                          </p>
                          <p className={`text-xs ${
                            contribution.status === 'pending' ? 'text-orange-600' :
                            contribution.status === 'confirmed' ? 'text-green-600' :
                            'text-red-600'
                          }`}>
                            {contribution.status === 'pending' ? 'Awaiting Review' :
                             contribution.status === 'confirmed' ? 'Confirmed' :
                             'Rejected'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {recentContributions.length === 0 && (
                    <div className="text-center py-8">
                      <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions yet</h3>
                      <p className="text-gray-600">Transaction history will appear here once members start contributing.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button 
                    onClick={() => setCreateGroupModalOpen(true)}
                    className="w-full bg-nigerian-green hover:bg-forest-green"
                  >
                    <Plus className="h-4 w-4 mr-3" />
                    Create New Group
                  </Button>
                  <Button variant="outline" className="w-full">
                    <Bell className="h-4 w-4 mr-3" />
                    Send Reminders
                  </Button>
                  <Button variant="outline" className="w-full">
                    <FileText className="h-4 w-4 mr-3" />
                    Generate Report
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* WhatsApp Integration */}
            <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <MessageCircle className="h-6 w-6" />
                  <h3 className="font-semibold">WhatsApp Integration</h3>
                </div>
                <p className="text-green-100 text-sm mb-4">
                  Share group links and send automated reminders directly to WhatsApp groups.
                </p>
                <Button variant="secondary" size="sm" className="w-full">
                  <Settings className="h-4 w-4 mr-2" />
                  Configure WhatsApp
                </Button>
              </CardContent>
            </Card>

            {/* Notifications Panel */}
            <NotificationsPanel currentUser={user} />

            {/* Pending Actions */}
            {adminStats && (adminStats.pendingPayments > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle>Pending Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Payment Reminders</p>
                        <p className="text-xs text-gray-600">{adminStats.pendingPayments} members need follow-up</p>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Bell className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Create Group Modal */}
      <CreateGroupModal
        open={createGroupModalOpen}
        onOpenChange={setCreateGroupModalOpen}
      />

      {/* Purse and Accountability Partner Modals */}
      {selectedGroup && (
        <>
          <CreatePurseModal
            open={createPurseModalOpen}
            onOpenChange={setCreatePurseModalOpen}
            groupId={selectedGroup.id}
            groupName={selectedGroup.name}
          />
          
          <ManageAccountabilityPartnersModal
            open={managePartnersModalOpen}
            onOpenChange={setManagePartnersModalOpen}
            groupId={selectedGroup.id}
            groupName={selectedGroup.name}
          />
        </>
      )}

      <PaymentModal 
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        purse={selectedPurse}
      />

      <PaymentApprovalModal
        open={approvalModalOpen}
        onOpenChange={setApprovalModalOpen}
        contribution={selectedContribution}
      />
    </div>
  );
}
