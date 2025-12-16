import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Navigation } from "@/components/navigation";
import { ArrowLeft, Users, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, CurrencyCode } from "@/lib/currency";
import { getCurrentUser } from "@/lib/auth";
import type { Project, ContributionWithDetails, Group } from "@shared/schema";

export default function ProjectContributors() {
  const { projectId } = useParams();
  const [, setLocation] = useLocation();
  const user = getCurrentUser();

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: [`/api/projects/${projectId}`],
    enabled: !!projectId,
  });

  const { data: group, isLoading: groupLoading } = useQuery<Group>({
    queryKey: [`/api/groups/${project?.groupId}`],
    enabled: !!project?.groupId,
  });

  const { data: contributions = [], isLoading: contributionsLoading } =
    useQuery<ContributionWithDetails[]>({
      queryKey: [`/api/contributions/project/${projectId}`],
      enabled: !!projectId,
    });

  const isLoading = projectLoading || contributionsLoading || groupLoading;
  const isAdmin = user?.id === group?.adminId;
  const projectCurrency = (project?.currency as CurrencyCode) || "NGN";
  const isPrivate = group?.privacyMode === "private";

  const confirmedContributions = contributions.filter((c) => c.status === "confirmed");

  const aggregatedContributors = confirmedContributions.reduce((acc, contribution) => {
    const userId = contribution.userId;
    if (!acc[userId]) {
      acc[userId] = {
        userId,
        userName: contribution.userName,
        totalAmount: 0,
        paymentCount: 0,
      };
    }
    acc[userId].totalAmount += parseFloat(contribution.amount);
    acc[userId].paymentCount += 1;
    return acc;
  }, {} as Record<string, { userId: string; userName: string; totalAmount: number; paymentCount: number }>);

  const sortedContributors = Object.values(aggregatedContributors).sort(
    (a, b) => b.totalAmount - a.totalAmount
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-lg mx-auto px-4 py-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (isPrivate && !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
          <Button
            variant="ghost"
            className="mb-2 -ml-2 text-gray-600 hover:text-gray-900"
            onClick={() => setLocation(`/project/${projectId}`)}
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to {project?.name}
          </Button>

          <Card className="rounded-2xl border-0 shadow-sm bg-gray-50">
            <CardContent className="py-8">
              <div className="text-center">
                <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Lock className="w-7 h-7 text-amber-600" />
                </div>
                <p className="font-medium text-gray-900 mb-1">Private Group</p>
                <p className="text-sm text-gray-500">
                  Contributor details are only visible to the admin.
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  <span className="font-medium">{confirmedContributions.length}</span>{" "}
                  contribution{confirmedContributions.length !== 1 ? "s" : ""} received
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <Button
          variant="ghost"
          className="mb-2 -ml-2 text-gray-600 hover:text-gray-900"
          onClick={() => setLocation(`/project/${projectId}`)}
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to {project?.name}
        </Button>

        <Card className="rounded-2xl border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="w-5 h-5 text-primary" />
                Contributors
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                {sortedContributors.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {sortedContributors.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Users className="w-7 h-7 text-gray-400" />
                </div>
                <p className="font-medium text-gray-900 mb-1">No Contributors Yet</p>
                <p className="text-sm text-gray-500">Be the first to contribute!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sortedContributors.map((contributor, index) => (
                  <div
                    key={contributor.userId}
                    className="flex items-center justify-between py-3 px-3 bg-gray-50 rounded-xl"
                    data-testid={`contributor-row-${index}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="font-semibold text-primary">
                          {contributor.userName?.charAt(0)?.toUpperCase() || "?"}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-900">{contributor.userName}</span>
                        {contributor.paymentCount > 1 && (
                          <p className="text-xs text-gray-500">
                            {contributor.paymentCount} payments
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="font-bold text-gray-900">
                      {formatCurrency(contributor.totalAmount.toString(), projectCurrency)}
                    </span>
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
