import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Navigation } from "@/components/navigation";
import { ArrowLeft, FileImage, Loader2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, CurrencyCode } from "@/lib/currency";
import { getCurrentUser } from "@/lib/auth";
import type { Project, ContributionWithDetails, Group } from "@shared/schema";

export default function ProjectProofs() {
  const { projectId } = useParams();
  const [, setLocation] = useLocation();
  const [selectedProof, setSelectedProof] = useState<string | null>(null);
  const user = getCurrentUser();

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: [`/api/projects/${projectId}`],
    enabled: !!projectId,
  });

  const { data: group } = useQuery<Group>({
    queryKey: [`/api/groups/${project?.groupId}`],
    enabled: !!project?.groupId,
  });

  const { data: contributions = [], isLoading: contributionsLoading } =
    useQuery<ContributionWithDetails[]>({
      queryKey: [`/api/contributions/project/${projectId}`],
      enabled: !!projectId,
    });

  const isLoading = projectLoading || contributionsLoading;
  const isAdmin = user?.id === group?.adminId;
  const projectCurrency = (project?.currency as CurrencyCode) || "NGN";

  const proofsWithPayment = contributions
    .filter((c) => c.proofOfPayment)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-lg mx-auto px-4 py-12 text-center">
          <p className="text-gray-600">Only admins can view payment proofs.</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => setLocation(`/project/${projectId}`)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Project
          </Button>
        </div>
      </div>
    );
  }

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
                <FileImage className="w-5 h-5 text-orange-600" />
                Payment Proofs
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                {proofsWithPayment.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {proofsWithPayment.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <FileImage className="w-7 h-7 text-gray-400" />
                </div>
                <p className="font-medium text-gray-900 mb-1">No Payment Proofs</p>
                <p className="text-sm text-gray-500">
                  No payment proofs have been uploaded yet.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {proofsWithPayment.map((contribution) => (
                  <div
                    key={contribution.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 cursor-pointer transition-colors"
                    onClick={() => setSelectedProof(contribution.proofOfPayment!)}
                    data-testid={`payment-proof-${contribution.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          contribution.status === "confirmed"
                            ? "bg-green-100"
                            : contribution.status === "pending"
                            ? "bg-yellow-100"
                            : "bg-red-100"
                        }`}
                      >
                        <FileImage
                          className={`w-5 h-5 ${
                            contribution.status === "confirmed"
                              ? "text-green-600"
                              : contribution.status === "pending"
                              ? "text-yellow-600"
                              : "text-red-600"
                          }`}
                        />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{contribution.userName}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-gray-500">
                            {new Date(contribution.createdAt).toLocaleDateString("en-NG", {
                              day: "numeric",
                              month: "short",
                            })}
                          </p>
                          <Badge
                            className={`text-xs ${
                              contribution.status === "confirmed"
                                ? "bg-green-100 text-green-700"
                                : contribution.status === "pending"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {contribution.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">
                        {formatCurrency(contribution.amount, projectCurrency)}
                      </span>
                      <Eye className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedProof && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedProof(null)}
        >
          <div className="relative max-w-lg w-full max-h-[80vh] overflow-auto bg-white rounded-2xl p-2">
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 z-10"
              onClick={() => setSelectedProof(null)}
            >
              ✕
            </Button>
            <img
              src={selectedProof}
              alt="Payment proof"
              className="w-full h-auto rounded-xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
