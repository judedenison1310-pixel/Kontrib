import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Navigation } from "@/components/navigation";
import { 
  TrendingUp, 
  Users, 
  Target, 
  Calendar, 
  CreditCard, 
  CheckCircle,
  Clock,
  AlertCircle
} from "lucide-react";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { formatNaira } from "@/lib/currency";
import { Link } from "wouter";

export default function Dashboard() {
  const user = getCurrentUser();
  const userIsAdmin = isAdmin();

  // Fetch user-specific data for members or admin data for admins
  const { data: userStats = {}, isLoading: statsLoading } = useQuery<any>({
    queryKey: userIsAdmin ? ["/api/stats", "admin", user?.id] : ["/api/stats", "user", user?.id],
    enabled: !!user,
  });

  const { data: userGroups = [], isLoading: groupsLoading } = useQuery<any[]>({
    queryKey: userIsAdmin ? ["/api/groups", "admin", user?.id] : ["/api/groups", "user", user?.id],
    enabled: !!user,
  });

  const { data: recentContributions = [], isLoading: contributionsLoading } = useQuery<any[]>({
    queryKey: userIsAdmin ? ["/api/contributions/admin", user?.id] : ["/api/contributions/user", user?.id],
    enabled: !!user,
  });

  if (statsLoading || groupsLoading) {
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
          <div className="bg-gradient-to-r from-nigerian-green to-forest-green rounded-xl p-6 text-white">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">
                  {userIsAdmin ? "Admin Dashboard" : "My Dashboard"}
                </h2>
                <p className="text-green-100">Welcome back, {user?.fullName}</p>
                <p className="text-green-200 text-sm">
                  {userIsAdmin 
                    ? `Managing ${userGroups.length} active groups`
                    : `Member of ${userGroups.length} groups`
                  }
                </p>
              </div>
              <div className="mt-4 sm:mt-0">
                <div className="text-right">
                  <p className="text-green-100 text-sm">Your Role</p>
                  <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                    {userIsAdmin ? "Group Admin" : "Group Member"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>

        {userIsAdmin ? (
          // Admin Dashboard Content
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Collections</p>
                    <p className="text-2xl font-bold text-nigerian-green">
                      {formatNaira(userStats.totalCollections || 0)}
                    </p>
                    <p className="text-xs text-green-600">All groups combined</p>
                  </div>
                  <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center">
                    <TrendingUp className="text-nigerian-green h-6 w-6" />
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
                      {userStats.activeMembers || 0}
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
                    <p className="text-sm font-medium text-gray-600">Pending Approvals</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {userStats.pendingPayments || 0}
                    </p>
                    <p className="text-xs text-orange-600">Need attention</p>
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
                    <p className="text-sm font-medium text-gray-600">Success Rate</p>
                    <p className="text-2xl font-bold text-green-600">
                      {userStats.completionRate || 0}%
                    </p>
                    <p className="text-xs text-green-600">Collection rate</p>
                  </div>
                  <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center">
                    <Target className="text-green-500 h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          // Member Dashboard Content
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">My Total Contributions</p>
                    <p className="text-2xl font-bold text-nigerian-green">
                      {formatNaira(userStats.totalContributed || 0)}
                    </p>
                    <p className="text-xs text-green-600">Across all groups</p>
                  </div>
                  <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center">
                    <CreditCard className="text-nigerian-green h-6 w-6" />
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
                      {userGroups.length}
                    </p>
                    <p className="text-xs text-blue-600">Currently joined</p>
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
                      {userStats.pendingContributions || 0}
                    </p>
                    <p className="text-xs text-orange-600">Awaiting approval</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center">
                    <Clock className="text-orange-500 h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Groups Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {userIsAdmin ? "My Groups" : "Groups I've Joined"}
                </CardTitle>
                {userIsAdmin && (
                  <Link href="/groups">
                    <Button variant="outline" size="sm">
                      Manage All
                    </Button>
                  </Link>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {userGroups.length === 0 ? (
                <div className="text-center py-6">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {userIsAdmin ? "No groups created" : "No groups joined"}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {userIsAdmin 
                      ? "Create your first group to start collecting contributions."
                      : "Join a group to start contributing and track your progress."
                    }
                  </p>
                  {userIsAdmin && (
                    <Link href="/groups">
                      <Button className="bg-nigerian-green hover:bg-forest-green">
                        Create Group
                      </Button>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {userGroups.slice(0, 3).map((group: any) => (
                    <div key={group.id} className="p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{group.name}</h4>
                        <Badge variant="secondary" className="text-xs">
                          {group.memberCount || 0} members
                        </Badge>
                      </div>
                      {!userIsAdmin && group.targetAmount && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Progress</span>
                            <span className="font-medium">
                              {formatNaira(group.collectedAmount || 0)} / {formatNaira(group.targetAmount)}
                            </span>
                          </div>
                          <Progress 
                            value={((group.collectedAmount || 0) / group.targetAmount) * 100} 
                            className="h-2"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                  {userGroups.length > 3 && (
                    <div className="text-center pt-2">
                      <Link href="/groups">
                        <Button variant="ghost" size="sm">
                          View All Groups ({userGroups.length})
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Activity</CardTitle>
                <Link href={userIsAdmin ? "/groups" : "/my-contributions"}>
                  <Button variant="outline" size="sm">
                    View All
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {recentContributions.length === 0 ? (
                <div className="text-center py-6">
                  <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No recent activity</h3>
                  <p className="text-gray-600 mb-4">
                    {userIsAdmin 
                      ? "Contributions will appear here when members start making payments."
                      : "Your contributions and updates will appear here."
                    }
                  </p>
                  {!userIsAdmin && (
                    <Link href="/make-payment">
                      <Button className="bg-nigerian-green hover:bg-forest-green">
                        Make Payment
                      </Button>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {recentContributions.slice(0, 5).map((contribution: any) => (
                    <div key={contribution.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        contribution.status === 'confirmed' ? 'bg-green-100' :
                        contribution.status === 'pending' ? 'bg-orange-100' : 'bg-red-100'
                      }`}>
                        {contribution.status === 'confirmed' ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : contribution.status === 'pending' ? (
                          <Clock className="h-4 w-4 text-orange-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {userIsAdmin ? contribution.userName : contribution.groupName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(contribution.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-sm font-medium text-gray-900">
                        {formatNaira(Number(contribution.amount))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}