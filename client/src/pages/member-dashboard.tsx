import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Navigation } from "@/components/navigation";
import { PaymentModal } from "@/components/payment-modal";
import { ProjectSelectionModal } from "@/components/project-selection-modal";
import { ProgressCircle, StatusBadge, DashboardSkeleton } from "@/components/ui/kontrib-ui";
import { Users, CreditCard, ChevronRight, Clock, CheckCircle, Plus, History, Wallet } from "lucide-react";
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

type UserGroupMembership = GroupMember & { group: GroupWithStats };

export default function MemberDashboard() {
  const user = getCurrentUser();
  const [, setLocation] = useLocation();
  const [projectSelectionOpen, setProjectSelectionOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const { data: userGroups = [], isLoading: groupsLoading } = useQuery<UserGroupMembership[]>({
    queryKey: ["/api/groups", "user", user?.id],
    enabled: !!user,
  });

  const { data: userStats, isLoading: statsLoading } = useQuery<MemberWithContributions>({
    queryKey: ["/api/stats", "user", user?.id],
    enabled: !!user,
  });

  const { data: paymentHistory = [], isLoading: historyLoading } = useQuery<ContributionWithDetails[]>({
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
    if (!open) setSelectedProject(null);
  };

  const pendingPayments = paymentHistory.filter((p) => p.status === "pending");

  if (groupsLoading || statsLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24 sm:pb-8">
      <Navigation />

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Welcome Header */}
        <div className="bg-primary rounded-2xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Welcome back,</p>
              <h1 className="text-xl font-bold">{user?.fullName?.split(" ")[0] || "Member"}</h1>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Wallet className="h-6 w-6" />
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-green-200 text-xs">Total Contributed</p>
              <p className="text-lg font-bold">{userStats ? formatNaira(userStats.totalContributions) : "₦0"}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-green-200 text-xs">Active Groups</p>
              <p className="text-lg font-bold">{userGroups.length}</p>
            </div>
          </div>
        </div>

        {/* Pending Approvals Alert */}
        {pendingPayments.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-amber-900">Pending Approval</p>
              <p className="text-sm text-amber-700">{pendingPayments.length} payment{pendingPayments.length > 1 ? "s" : ""} waiting for admin</p>
            </div>
            <ChevronRight className="h-5 w-5 text-amber-400" />
          </div>
        )}

        {/* My Groups Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">My Groups</h2>
            <button
              onClick={() => setLocation("/join-group")}
              className="text-primary text-sm font-medium flex items-center gap-1"
              data-testid="button-join-group-header"
            >
              <Plus className="h-4 w-4" />
              Join Group
            </button>
          </div>

          {userGroups.length === 0 ? (
            <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">No Groups Yet</h3>
              <p className="text-gray-500 mb-6">
                Ask your group admin for an invitation link or join an existing group
              </p>
              <button
                onClick={() => setLocation("/join-group")}
                className="bg-primary hover:bg-primary/90 text-white font-semibold px-6 py-3 rounded-full transition-colors"
                data-testid="button-join-group"
              >
                Join a Group
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {userGroups.map((membership) => {
                const group = membership.group;
                const progress = group.completionRate || 0;
                const contributedAmount = parseFloat(membership.contributedAmount || "0");
                
                return (
                  <div 
                    key={group.id}
                    className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm active:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => handleViewDetails(group)}
                  >
                    <div className="flex items-start gap-4">
                      {/* Progress Circle */}
                      <ProgressCircle 
                        percentage={progress} 
                        size={56} 
                        strokeWidth={5}
                        showLabel={false}
                      />
                      
                      {/* Group Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 truncate">{group.name}</h3>
                        <p className="text-sm text-gray-500">{group.memberCount || 0} members</p>
                        
                        <div className="mt-2 flex items-center gap-3 text-sm">
                          <span className="text-primary font-medium">{progress}% complete</span>
                          {contributedAmount > 0 && (
                            <>
                              <span className="text-gray-300">•</span>
                              <span className="text-gray-500">{formatNaira(contributedAmount)} paid</span>
                            </>
                          )}
                        </div>
                      </div>

                      <ChevronRight className="h-5 w-5 text-gray-300 shrink-0 mt-1" />
                    </div>

                    {/* Action Button */}
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMakePayment(group);
                        }}
                        className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-3 rounded-full flex items-center justify-center gap-2 transition-colors"
                        data-testid={`button-submit-proof-${group.id}`}
                      >
                        <CreditCard className="h-4 w-4" />
                        Submit Payment Proof
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Recent Payments Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Recent Payments</h2>
            {paymentHistory.length > 3 && (
              <button
                onClick={() => setLocation("/my-contributions")}
                className="text-primary text-sm font-medium"
                data-testid="button-view-all-payments"
              >
                View All
              </button>
            )}
          </div>

          {paymentHistory.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 border border-gray-100 text-center">
              <History className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">No payments yet</p>
              <p className="text-sm text-gray-400">Your payment history will appear here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {paymentHistory.slice(0, 5).map((payment) => (
                <div key={payment.id} className="bg-white rounded-2xl p-4 border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        payment.status === "confirmed" 
                          ? "bg-green-100" 
                          : payment.status === "pending" 
                          ? "bg-amber-100" 
                          : "bg-red-100"
                      }`}>
                        {payment.status === "confirmed" ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : payment.status === "pending" ? (
                          <Clock className="h-5 w-5 text-amber-600" />
                        ) : (
                          <Clock className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{payment.groupName}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(payment.createdAt).toLocaleDateString("en-NG", {
                            day: "numeric",
                            month: "short",
                            year: "numeric"
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{formatNaira(payment.amount)}</p>
                      <StatusBadge 
                        status={payment.status as "confirmed" | "pending" | "rejected"} 
                        size="sm" 
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Modals */}
      <ProjectSelectionModal
        open={projectSelectionOpen}
        onOpenChange={setProjectSelectionOpen}
        group={selectedGroup}
        onSelectProject={handleSelectProject}
      />
      <PaymentModal
        open={paymentModalOpen}
        onOpenChange={handlePaymentModalClose}
        project={selectedProject}
      />
    </div>
  );
}
