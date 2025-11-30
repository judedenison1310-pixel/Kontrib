import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Navigation } from "@/components/navigation";
import {
  TrendingUp,
  Users,
  CreditCard,
  Clock,
  Bell,
  ChevronRight,
  Shield,
  UserCheck,
  FolderKanban,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { formatNaira } from "@/lib/currency";
import { Link, useLocation } from "wouter";
import type { GroupWithRole, ContributionWithDetails } from "@shared/schema";

export default function Dashboard() {
  const user = getCurrentUser();
  const [, setLocation] = useLocation();

  const { data: allGroups = [], isLoading: groupsLoading } = useQuery<GroupWithRole[]>({
    queryKey: ["/api/groups", "all", user?.id],
    enabled: !!user,
  });

  const { data: adminStats = {} } = useQuery<any>({
    queryKey: ["/api/stats", "admin", user?.id],
    enabled: !!user,
  });

  const { data: userStats = {} } = useQuery<any>({
    queryKey: ["/api/stats", "user", user?.id],
    enabled: !!user,
  });

  const { data: recentContributions = [] } = useQuery<ContributionWithDetails[]>({
    queryKey: ["/api/contributions/user", user?.id],
    enabled: !!user,
  });

  const adminGroups = allGroups.filter(g => g.role === 'admin' || g.role === 'both');
  const memberGroups = allGroups.filter(g => g.role === 'member' || g.role === 'both');
  
  const totalPendingApprovals = adminGroups.reduce((sum, g) => sum + (g.pendingApprovals || 0), 0);
  const myPendingPayments = recentContributions.filter(c => c.status === 'pending').length;
  const myConfirmedTotal = recentContributions
    .filter(c => c.status === 'confirmed')
    .reduce((sum, c) => sum + parseFloat(c.amount), 0);

  if (groupsLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-lg mx-auto px-4 py-6">
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-green-600 border-r-transparent"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24 sm:pb-8">
      <Navigation />

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-2xl p-6 text-white">
          <h1 className="text-2xl font-bold mb-1" data-testid="text-welcome">
            Welcome back, {user?.fullName?.split(' ')[0] || 'there'}!
          </h1>
          <p className="text-green-100">
            {allGroups.length} {allGroups.length === 1 ? 'group' : 'groups'} connected
          </p>
          <div className="flex gap-2 mt-3">
            {adminGroups.length > 0 && (
              <Badge className="bg-white/20 text-white border-white/30">
                <Shield className="h-3 w-3 mr-1" />
                Admin of {adminGroups.length}
              </Badge>
            )}
            {memberGroups.length > 0 && (
              <Badge className="bg-white/20 text-white border-white/30">
                <UserCheck className="h-3 w-3 mr-1" />
                Member of {memberGroups.length}
              </Badge>
            )}
          </div>
        </div>

        {adminGroups.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-600" />
              <h2 className="text-lg font-bold text-gray-900">Groups You Manage</h2>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Card className="bg-white rounded-2xl">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Total Collected</p>
                      <p className="font-bold text-gray-900">{formatNaira(adminStats.totalCollections || "0")}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white rounded-2xl">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Total Members</p>
                      <p className="font-bold text-gray-900">{adminStats.activeMembers || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {totalPendingApprovals > 0 && (
              <Card className="bg-orange-50 border-orange-200 rounded-2xl cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setLocation('/admin/projects')}
                data-testid="card-pending-approvals"
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                        <Bell className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-orange-900">{totalPendingApprovals} Pending Approval{totalPendingApprovals > 1 ? 's' : ''}</h3>
                        <p className="text-sm text-orange-700">Payment proofs need review</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-orange-400" />
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-2">
              {adminGroups.slice(0, 3).map((group) => (
                <Card
                  key={group.id}
                  className="bg-white rounded-2xl border border-gray-100 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setLocation(`/group/${group.id}`)}
                  data-testid={`admin-group-${group.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                          <Users className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900">{group.name}</h3>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span>{group.memberCount} members</span>
                            <span>•</span>
                            <span>{group.projectCount} projects</span>
                          </div>
                        </div>
                      </div>
                      {group.pendingApprovals ? (
                        <Badge className="bg-orange-100 text-orange-700">
                          {group.pendingApprovals} pending
                        </Badge>
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-300" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {adminGroups.length > 3 && (
              <Button variant="outline" className="w-full" onClick={() => setLocation('/groups')} data-testid="button-view-all-admin">
                View all {adminGroups.length} groups
              </Button>
            )}
          </section>
        )}

        {memberGroups.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-bold text-gray-900">Your Contributions</h2>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Card className="bg-white rounded-2xl">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <CreditCard className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Total Paid</p>
                      <p className="font-bold text-gray-900">{formatNaira(myConfirmedTotal.toString())}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white rounded-2xl">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <FolderKanban className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Active Groups</p>
                      <p className="font-bold text-gray-900">{memberGroups.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {myPendingPayments > 0 && (
              <Card className="bg-yellow-50 border-yellow-200 rounded-2xl">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                      <Clock className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-yellow-900">{myPendingPayments} Pending Payment{myPendingPayments > 1 ? 's' : ''}</h3>
                      <p className="text-sm text-yellow-700">Awaiting admin approval</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-2">
              {memberGroups.slice(0, 3).map((group) => (
                <Card
                  key={group.id}
                  className="bg-white rounded-2xl border border-gray-100 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setLocation(`/group/${group.id}`)}
                  data-testid={`member-group-${group.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                          <Users className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900">{group.name}</h3>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span>{group.memberCount} members</span>
                            <span>•</span>
                            <span>{group.projectCount} projects</span>
                          </div>
                        </div>
                      </div>
                      <Button size="sm" className="bg-primary hover:bg-primary/90" data-testid={`button-pay-${group.id}`}>
                        Submit a Payment
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {memberGroups.length > 3 && (
              <Button variant="outline" className="w-full" onClick={() => setLocation('/groups')} data-testid="button-view-all-member">
                View all {memberGroups.length} groups
              </Button>
            )}
          </section>
        )}

        {allGroups.length === 0 && (
          <Card className="border-2 border-dashed border-gray-300 rounded-2xl">
            <CardContent className="py-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2" data-testid="text-empty-state">
                No groups yet
              </h3>
              <p className="text-gray-500 mb-6">
                Create a group to manage contributions, or ask someone to invite you to theirs
              </p>
              <Link href="/groups">
                <Button className="bg-primary hover:bg-primary/90" data-testid="button-get-started">
                  Get Started
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {recentContributions.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Recent Activity</h2>
            <Card className="bg-white rounded-2xl">
              <CardContent className="p-4">
                <div className="space-y-3">
                  {recentContributions.slice(0, 5).map((contribution) => (
                    <div key={contribution.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <div>
                        <p className="font-medium text-gray-900">{contribution.groupName}</p>
                        <p className="text-xs text-gray-500">
                          {contribution.projectName || "General"} • {new Date(contribution.createdAt).toLocaleDateString("en-NG", { 
                            day: "numeric", month: "short" 
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">{formatNaira(contribution.amount)}</p>
                        <Badge className={
                          contribution.status === "confirmed" 
                            ? "bg-green-100 text-green-700" 
                            : "bg-yellow-100 text-yellow-700"
                        }>
                          {contribution.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>
        )}
      </main>
    </div>
  );
}
