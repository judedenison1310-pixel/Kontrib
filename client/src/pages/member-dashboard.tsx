import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Navigation } from "@/components/navigation";
import { GroupCard } from "@/components/group-card";
import { PaymentModal } from "@/components/payment-modal";
import { ProjectSelectionModal } from "@/components/project-selection-modal";
import {
  DollarSign,
  Users,
  CheckCircle,
  ArrowDown,
  Download,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { formatNaira } from "@/lib/currency";
import {
  Group,
  GroupMember,
  GroupWithStats,
  Project,
  MemberWithContributions,
  ContributionWithDetails,
} from "@shared/schema";
import { Button } from "@/components/ui/button";

type UserGroupMembership = GroupMember & { group: GroupWithStats };

export default function MemberDashboard() {
  const user = getCurrentUser();
  const [, setLocation] = useLocation();
  const [projectSelectionOpen, setProjectSelectionOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const { data: userGroups = [], isLoading: groupsLoading } = useQuery<
    UserGroupMembership[]
  >({
    queryKey: ["/api/groups", "user", user?.id],
    enabled: !!user,
  });

  const { data: userStats, isLoading: statsLoading } =
    useQuery<MemberWithContributions>({
      queryKey: ["/api/stats", "user", user?.id],
      enabled: !!user,
    });

  const { data: paymentHistory = [], isLoading: historyLoading } = useQuery<
    ContributionWithDetails[]
  >({
    queryKey: ["/api/contributions", "user", user?.id],
    enabled: !!user,
  });

  const handleMakePayment = (group: Group) => {
    setSelectedGroup(group);
    setProjectSelectionOpen(true);
  };

  const handleViewDetails = (group: Group) => {
    setLocation(`/group/${group.id}`);
  };

  const handleSelectProject = (project: Project) => {
    setSelectedProject(project);
    setPaymentModalOpen(true);
  };

  const handlePaymentModalClose = (open: boolean) => {
    setPaymentModalOpen(open);
    if (!open) {
      setSelectedProject(null);
    }
  };

  if (groupsLoading || statsLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="animate-pulse space-y-6">
            <div className="h-32 bg-gray-200 rounded-xl"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
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
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-blue-100">Welcome, {user?.fullName}</p>
                <p className="text-blue-200 text-sm">
                  Member of {userGroups.length} active groups
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Member Stats */}
        {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Contributions</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {userStats ? formatNaira(userStats.totalContributions) : "₦0"}
                  </p>
                  <p className="text-xs text-green-600">All groups combined</p>
                </div>
                <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center overflow-hidden">
                  <img 
                    src="/kontrib-logo.jpg?v=3" 
                    alt="Kontrib Logo" 
                    className="w-8 h-8 object-contain"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Groups</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {userStats?.groupCount || 0}
                  </p>
                  <p className="text-xs text-blue-600">Contributing regularly</p>
                </div>
                <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center">
                  <Users className="text-green-500 h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Payment Status</p>
                  <p className="text-2xl font-bold text-green-600">Up to Date</p>
                  <p className="text-xs text-green-600">No pending payments</p>
                </div>
                <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center">
                  <CheckCircle className="text-green-500 h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div> */}

        {/* My Groups */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>My Groups</CardTitle>
              <Button
                onClick={() => setLocation("/join-group")}
                variant="outline"
                size="sm"
                data-testid="button-join-group-header"
              >
                <Users className="h-4 w-4 mr-2" />
                Join Group
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {userGroups.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Ready to Join a Group?
                </h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Get started by joining a contribution group. Paste your group
                  invitation link below or ask your admin for one.
                </p>
                <Button
                  onClick={() => setLocation("/join-group")}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 text-lg"
                  data-testid="button-join-group"
                >
                  <Users className="mr-2 h-5 w-5" />
                  Join a Group
                </Button>
                <p className="text-sm text-gray-500 mt-4">
                  Or browse available groups and request to join
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {userGroups.map((membership) => (
                  <GroupCard
                    key={membership.group.id}
                    group={membership.group}
                    isAdmin={false}
                    onMakePayment={handleMakePayment}
                    onViewDetails={handleViewDetails}
                    userContribution={membership.contributedAmount}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment History */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Payment History</CardTitle>
              {paymentHistory.length > 0 && (
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {paymentHistory.length === 0 ? (
              <div className="text-center py-8">
                <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No payments yet
                </h3>
                <p className="text-gray-600">
                  Your payment history will appear here once you make
                  contributions.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {paymentHistory.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <ArrowDown className="text-green-600 h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {payment.groupName}
                        </p>
                        <p className="text-sm text-gray-600">
                          {payment.description || "Contribution"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(payment.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {formatNaira(payment.amount)}
                      </p>
                      <Badge className="bg-green-100 text-green-800">
                        {payment.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Project Selection Modal */}
      <ProjectSelectionModal
        open={projectSelectionOpen}
        onOpenChange={setProjectSelectionOpen}
        group={selectedGroup}
        onSelectProject={handleSelectProject}
      />

      {/* Payment Modal */}
      <PaymentModal
        open={paymentModalOpen}
        onOpenChange={handlePaymentModalClose}
        project={selectedProject}
      />
    </div>
  );
}
