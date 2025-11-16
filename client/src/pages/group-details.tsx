import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Navigation } from "@/components/navigation";
import {
  ArrowLeft,
  Users,
  Target,
  TrendingUp,
  Calendar,
  DollarSign,
  CheckCircle,
  Clock,
  User,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { formatNaira } from "@/lib/currency";
import { Group, Project, ContributionWithDetails } from "@shared/schema";
import { format } from "date-fns";

interface GroupMemberWithUser {
  id: string;
  groupId: string;
  userId: string;
  contributedAmount: string;
  status: string;
  joinedAt: Date;
  userName: string;
  userFullName: string;
}

export default function GroupDetails() {
  const { groupId } = useParams();
  const [, setLocation] = useLocation();
  const user = getCurrentUser();

  const { data: group, isLoading: groupLoading } = useQuery<Group>({
    queryKey: ["/api/groups", groupId],
    enabled: !!groupId,
  });

  const { data: projects = [], isLoading: projectsLoading } = useQuery<
    Project[]
  >({
    queryKey: ["/api/groups", groupId, "projects"],
    enabled: !!groupId,
  });

  const { data: members = [], isLoading: membersLoading } = useQuery<
    GroupMemberWithUser[]
  >({
    queryKey: ["/api/groups", groupId, "members"],
    enabled: !!groupId,
  });

  const { data: contributions = [], isLoading: contributionsLoading } =
    useQuery<ContributionWithDetails[]>({
      queryKey: ["/api/contributions/group", groupId],
      enabled: !!groupId,
    });

  const isLoading =
    groupLoading || projectsLoading || membersLoading || contributionsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="animate-pulse space-y-6">
            <div className="h-32 bg-gray-200 rounded-xl"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-48 bg-gray-200 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Group Not Found
            </h2>
            <p className="text-gray-600 mb-6">
              The group you're looking for doesn't exist.
            </p>
            <Button onClick={() => setLocation("/dashboard")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const totalTarget = projects.reduce(
    (sum, project) => sum + Number(project.targetAmount),
    0,
  );
  const totalCollected = projects.reduce(
    (sum, project) => sum + Number(project.collectedAmount),
    0,
  );
  const completionRate =
    totalTarget > 0 ? Math.round((totalCollected / totalTarget) * 100) : 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "active":
        return "bg-blue-100 text-blue-800";
      case "paused":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const approvedContributions = contributions.filter(
    (c) => c.status === "confirmed",
  );
  const pendingContributions = contributions.filter(
    (c) => c.status === "pending",
  );
  const totalContributions = contributions.length;

  return (
    <div className="min-h-screen bg-gray-50 pb-20 sm:pb-0">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => setLocation("/dashboard")}
          className="mb-6"
          data-testid="back-to-dashboard"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        {/* Group Header */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-6 text-white">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold" data-testid="group-name">
                    {group.name}
                  </h1>
                  <Badge className={getStatusColor(group.status)}>
                    {group.status}
                  </Badge>
                </div>
                {group.description && (
                  <p
                    className="text-green-100 mb-4"
                    data-testid="group-description"
                  >
                    {group.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>{members.length} Members</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    <span>{projects.length} Projects</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Target
                  </p>
                  <p
                    className="text-2xl font-bold text-blue-600"
                    data-testid="total-target"
                  >
                    {formatNaira(totalTarget.toString())}
                  </p>
                  <p className="text-xs text-gray-500">Across all projects</p>
                </div>
                <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center">
                  <Target className="text-blue-500 h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Amount Collected
                  </p>
                  <p
                    className="text-2xl font-bold text-green-600"
                    data-testid="total-collected"
                  >
                    {formatNaira(totalCollected.toString())}
                  </p>
                  <p className="text-xs text-green-600">
                    {completionRate}% of target
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center">
                  <TrendingUp className="text-green-500 h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Contributions
                  </p>
                  <p
                    className="text-2xl font-bold text-gray-900"
                    data-testid="total-contributions"
                  >
                    {totalContributions}
                  </p>
                  <p className="text-xs text-gray-500">
                    {approvedContributions.length} approved,{" "}
                    {pendingContributions.length} pending
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center">
                  <DollarSign className="text-purple-500 h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Bar */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Overall Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">
                  Group Goal Progress
                </span>
                <span className="text-sm font-bold text-green-600">
                  {completionRate}%
                </span>
              </div>
              <Progress value={completionRate} className="h-3" />
              <div className="flex justify-between text-sm text-gray-500">
                <span>Collected: {formatNaira(totalCollected.toString())}</span>
                <span>
                  Remaining:{" "}
                  {formatNaira((totalTarget - totalCollected).toString())}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Projects Section */}
          <Card>
            <CardHeader>
              <CardTitle>Projects ({projects.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {projects.length === 0 ? (
                <div className="text-center py-8">
                  <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No projects yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {projects.map((project) => {
                    const progress =
                      totalTarget > 0
                        ? Math.round(
                            (Number(project.collectedAmount) /
                              Number(project.targetAmount)) *
                              100,
                          )
                        : 0;
                    return (
                      <div
                        key={project.id}
                        className="border rounded-lg p-4"
                        data-testid={`project-${project.id}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold text-gray-900">
                              {project.name}
                            </h4>
                            {project.description && (
                              <p className="text-sm text-gray-600 mt-1">
                                {project.description}
                              </p>
                            )}
                          </div>
                          {project.deadline && (
                            <div className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(project.deadline), "MMM dd")}
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Progress value={progress} className="h-2" />
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>{formatNaira(project.collectedAmount)}</span>
                            <span>{formatNaira(project.targetAmount)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Members Section */}
          <Card>
            <CardHeader>
              <CardTitle>Members ({members.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {members.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No members yet</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      data-testid={`member-${member.userId}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {member.userFullName}
                          </p>
                          <p className="text-xs text-gray-500">
                            @{member.userName}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600 text-sm">
                          {formatNaira(member.contributedAmount)}
                        </p>
                        <p className="text-xs text-gray-500">contributed</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Contributions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Recent Contributions</CardTitle>
          </CardHeader>
          <CardContent>
            {contributions.length === 0 ? (
              <div className="text-center py-8">
                <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No contributions yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {contributions.slice(0, 10).map((contribution) => (
                  <div
                    key={contribution.id}
                    className="flex items-center justify-between p-3 border-b last:border-b-0"
                    data-testid={`contribution-${contribution.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          contribution.status === "confirmed"
                            ? "bg-green-100"
                            : "bg-orange-100"
                        }`}
                      >
                        {contribution.status === "confirmed" ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <Clock className="w-5 h-5 text-orange-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {contribution.userName}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>
                            {contribution.projectName || "General contribution"}
                          </span>
                          <span>•</span>
                          <span>
                            {format(
                              new Date(contribution.createdAt),
                              "MMM dd, yyyy",
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {formatNaira(contribution.amount)}
                      </p>
                      <Badge
                        variant={
                          contribution.status === "confirmed"
                            ? "default"
                            : "secondary"
                        }
                        className="text-xs"
                      >
                        {contribution.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
