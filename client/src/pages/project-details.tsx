import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Navigation } from "@/components/navigation";
import {
  ArrowLeft,
  Target,
  Calendar,
  TrendingUp,
  Users,
  Loader2,
} from "lucide-react";
import { formatNaira } from "@/lib/currency";
import type { Project, ContributionWithDetails } from "@shared/schema";

export default function ProjectDetails() {
  const { projectId } = useParams();
  const [, setLocation] = useLocation();

  // Fetch project details
  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: [`/api/projects/${projectId}`],
    enabled: !!projectId,
  });

  // Fetch project contributions
  const { data: contributions = [], isLoading: contributionsLoading } =
    useQuery<ContributionWithDetails[]>({
      queryKey: [`/api/contributions/project/${projectId}`],
      enabled: !!projectId,
    });

  const isLoading = projectLoading || contributionsLoading;

  // Calculate total contributions (only confirmed)
  const confirmedContributions = contributions.filter(
    (c) => c.status === "confirmed",
  );
  const totalContributed = confirmedContributions.reduce(
    (sum, contribution) => sum + parseFloat(contribution.amount || "0"),
    0,
  );

  // Calculate progress
  const progress = project
    ? Math.min(
        Math.round(
          (parseFloat(project.collectedAmount) /
            parseFloat(project.targetAmount)) *
            100,
        ),
        100,
      )
    : 0;

  // Get status color
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

  // Format deadline
  const formatDeadline = (deadline: string | Date | null) => {
    if (!deadline) return "No deadline";
    const date = new Date(deadline);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Sort contributors by amount (highest first)
  const sortedContributions = [...confirmedContributions].sort(
    (a, b) => parseFloat(b.amount) - parseFloat(a.amount),
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Project Not Found
            </h2>
            <p className="text-gray-600 mb-6">
              The project you're looking for doesn't exist.
            </p>
            <Button onClick={() => setLocation("/dashboard")}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 sm:pb-0">
      <Navigation />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => window.history.back()}
          className="mb-6"
          data-testid="back-button"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {/* Project Header */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-6 text-white">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold" data-testid="project-name">
                {project.name}
              </h1>
              <Badge className={getStatusColor(project.status)}>
                {project.status}
              </Badge>
            </div>
            {project.description && (
              <p
                className="text-green-100 mb-4"
                data-testid="project-description"
              >
                {project.description}
              </p>
            )}
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                <span>Target: {formatNaira(project.targetAmount)}</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                <span>Collected: {formatNaira(project.collectedAmount)}</span>
              </div>
              {project.deadline && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDeadline(project.deadline)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Progress Card */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-600">
                Overall Progress
              </span>
              <span className="text-lg font-bold text-green-600">
                {progress}%
              </span>
            </div>
            <Progress value={progress} className="h-3 mb-2" />
            <div className="flex justify-between text-sm text-gray-600">
              <span>Collected: {formatNaira(project.collectedAmount)}</span>
              <span>
                Remaining:{" "}
                {formatNaira(
                  parseFloat(project.targetAmount) -
                    parseFloat(project.collectedAmount),
                )}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Contributors Section */}
        <Card>
          <CardHeader className="border-b bg-gray-50">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-green-600" />
                Project Contributors
              </CardTitle>
              <Badge variant="secondary" className="text-sm">
                {confirmedContributions.length}{" "}
                {confirmedContributions.length === 1
                  ? "Contributor"
                  : "Contributors"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {/* Invite Contributors */}
            {sortedContributions.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <h3 className="font-medium text-gray-900 mb-2">
                  No Contributors Yet
                </h3>
                {/* <p className="text-gray-600 text-sm mb-4">
                  Be the first to contribute to this project!
                </p> */}
                <p className="text-sm text-gray-700 font-medium">
                  Invite contributors with special sharing link
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                {/* Desktop Table View */}
                <div className="hidden md:block">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">
                          Name
                        </th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-900">
                          Donation
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedContributions.map((contribution, index) => (
                        <tr
                          key={contribution.id}
                          className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                          data-testid={`contributor-row-${index}`}
                        >
                          <td
                            className="py-3 px-4 text-gray-900"
                            data-testid={`contributor-name-${index}`}
                          >
                            {contribution.userName}
                          </td>
                          <td
                            className="py-3 px-4 text-right font-semibold text-gray-900"
                            data-testid={`contributor-amount-${index}`}
                          >
                            {formatNaira(contribution.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-3">
                  <div className="flex justify-between py-2 px-3 bg-gray-100 rounded-t-lg font-semibold text-sm">
                    <span>Name</span>
                    <span>Donation</span>
                  </div>
                  {sortedContributions.map((contribution, index) => (
                    <div
                      key={contribution.id}
                      className="flex justify-between py-3 px-3 border-b border-gray-100"
                      data-testid={`contributor-card-${index}`}
                    >
                      <span
                        className="text-gray-900"
                        data-testid={`contributor-name-mobile-${index}`}
                      >
                        {contribution.userName}
                      </span>
                      <span
                        className="font-semibold text-gray-900"
                        data-testid={`contributor-amount-mobile-${index}`}
                      >
                        {formatNaira(contribution.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
