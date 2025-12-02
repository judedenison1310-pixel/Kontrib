import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Navigation } from "@/components/navigation";
import { PaymentApprovalModal } from "@/components/payment-approval-modal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Clock,
  User,
  CreditCard,
  CheckCircle,
  FileImage,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { formatNaira } from "@/lib/currency";
import type { Group, ContributionWithDetails } from "@shared/schema";

export default function PendingApprovals() {
  const params = useParams<{ groupId: string }>();
  const groupId = params.groupId;
  const user = getCurrentUser();
  const [, setLocation] = useLocation();
  const [selectedContribution, setSelectedContribution] = useState<ContributionWithDetails | null>(null);
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);

  const { data: group, isLoading: groupLoading } = useQuery<Group>({
    queryKey: ["/api/groups", groupId],
    enabled: !!groupId && !!user,
  });

  const { data: contributions = [], isLoading: contributionsLoading } = useQuery<ContributionWithDetails[]>({
    queryKey: ["/api/contributions", "group", groupId],
    enabled: !!groupId && !!user,
  });

  const isLoading = groupLoading || contributionsLoading;
  const isAdmin = user?.id === group?.adminId;

  const pendingContributions = contributions.filter(c => c.status === "pending");

  const handleReviewClick = (contribution: ContributionWithDetails) => {
    setSelectedContribution(contribution);
    setApprovalModalOpen(true);
  };

  if (isLoading) {
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

  if (!group || !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-lg mx-auto px-4 py-6">
          <Card className="bg-white rounded-2xl">
            <CardContent className="p-6 text-center">
              <p className="text-gray-500">You don't have access to this page.</p>
              <Button
                variant="link"
                className="text-green-600 mt-2"
                onClick={() => setLocation("/groups")}
              >
                Back to Groups
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24 sm:pb-8">
      <Navigation />

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => setLocation(`/group/${groupId}`)}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gray-900" data-testid="text-page-title">
              Pending Approvals
            </h1>
            <p className="text-sm text-gray-500">{group.name}</p>
          </div>
        </div>

        {pendingContributions.length === 0 ? (
          <Card className="bg-white rounded-2xl">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2" data-testid="text-empty-state">
                All caught up!
              </h3>
              <p className="text-gray-500 mb-4">
                There are no pending payment proofs to review.
              </p>
              <Button
                onClick={() => setLocation(`/group/${groupId}`)}
                className="bg-green-600 hover:bg-green-700"
                data-testid="button-back-to-group"
              >
                Back to Group
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">
              {pendingContributions.length} payment{pendingContributions.length > 1 ? 's' : ''} waiting for review
            </p>

            {pendingContributions.map((contribution) => (
              <Card
                key={contribution.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-[0.99]"
                onClick={() => handleReviewClick(contribution)}
                data-testid={`card-contribution-${contribution.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900" data-testid={`text-contributor-${contribution.id}`}>
                          {contribution.userName}
                        </p>
                        <p className="text-sm text-gray-500">
                          {contribution.projectName}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600" data-testid={`text-amount-${contribution.id}`}>
                        {formatNaira(Number(contribution.amount))}
                      </p>
                      <Badge variant="secondary" className="bg-orange-100 text-orange-800 text-xs mt-1">
                        <Clock className="h-3 w-3 mr-1" />
                        Pending
                      </Badge>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      {contribution.proofOfPayment && (
                        <span className="flex items-center gap-1">
                          <FileImage className="h-4 w-4" />
                          Has proof
                        </span>
                      )}
                      {contribution.transactionRef && (
                        <span className="flex items-center gap-1">
                          <CreditCard className="h-4 w-4" />
                          {contribution.transactionRef.slice(0, 8)}...
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(contribution.createdAt).toLocaleDateString("en-NG", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <PaymentApprovalModal
        open={approvalModalOpen}
        onOpenChange={setApprovalModalOpen}
        contribution={selectedContribution}
      />
    </div>
  );
}
