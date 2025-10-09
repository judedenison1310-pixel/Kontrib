import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  CheckCircle, 
  XCircle, 
  User, 
  DollarSign, 
  Calendar, 
  FileText, 
  CreditCard,
  ImageIcon
} from "lucide-react";
import { formatNaira } from "@/lib/currency";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { ContributionWithDetails } from "@shared/schema";

interface PaymentApprovalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contribution: ContributionWithDetails | null;
}

export function PaymentApprovalModal({
  open,
  onOpenChange,
  contribution,
}: PaymentApprovalModalProps) {
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectionForm, setShowRejectionForm] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const confirmMutation = useMutation({
    mutationFn: async (contributionId: string) => {
      const response = await apiRequest("PATCH", `/api/contributions/${contributionId}/confirm`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contributions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({
        title: "Payment Confirmed",
        description: "Payment has been confirmed and added to the total.",
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to confirm payment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ contributionId, reason }: { contributionId: string; reason?: string }) => {
      const response = await apiRequest("PATCH", `/api/contributions/${contributionId}/reject`, {
        reason: reason || undefined
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contributions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({
        title: "Payment Rejected",
        description: "Payment has been rejected and contributor has been notified.",
      });
      onOpenChange(false);
      setShowRejectionForm(false);
      setRejectionReason("");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to reject payment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleConfirm = () => {
    if (contribution) {
      confirmMutation.mutate(contribution.id);
    }
  };

  const handleReject = () => {
    if (contribution) {
      rejectMutation.mutate({
        contributionId: contribution.id,
        reason: rejectionReason.trim() || undefined
      });
    }
  };

  if (!contribution) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Review Payment Submission
          </DialogTitle>
          <DialogDescription>
            Review and approve or reject this payment contribution
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Payment Status */}
          <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                {contribution.status.toUpperCase()}
              </Badge>
              <span className="text-sm text-orange-700">Awaiting admin approval</span>
            </div>
            <div className="text-sm text-orange-600">
              Submitted {new Date(contribution.createdAt).toLocaleDateString()}
            </div>
          </div>

          {/* Payment Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <Label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <User className="h-4 w-4" />
                  Contributor
                </Label>
                <p className="mt-1 text-sm font-medium text-gray-900">
                  {contribution.userName}
                </p>
              </div>

              <div>
                <Label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <DollarSign className="h-4 w-4" />
                  Amount
                </Label>
                <p className="mt-1 text-lg font-bold text-green-600">
                  {formatNaira(Number(contribution.amount))}
                </p>
              </div>

              <div>
                <Label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Calendar className="h-4 w-4" />
                  Date Submitted
                </Label>
                <p className="mt-1 text-sm text-gray-900">
                  {new Date(contribution.createdAt).toLocaleDateString('en-NG', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <FileText className="h-4 w-4" />
                  Group/Project
                </Label>
                <p className="mt-1 text-sm font-medium text-gray-900">
                  {contribution.groupName}
                  {contribution.projectName && (
                    <span className="text-gray-600"> → {contribution.projectName}</span>
                  )}
                </p>
              </div>

              {contribution.transactionRef && (
                <div>
                  <Label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <CreditCard className="h-4 w-4" />
                    Transaction Reference
                  </Label>
                  <p className="mt-1 text-sm font-mono text-gray-900">
                    {contribution.transactionRef}
                  </p>
                </div>
              )}

              {contribution.description && (
                <div>
                  <Label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <FileText className="h-4 w-4" />
                    Description
                  </Label>
                  <p className="mt-1 text-sm text-gray-900">
                    {contribution.description}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Proof of Payment */}
          {contribution.proofOfPayment && (
            <div>
              <Label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <ImageIcon className="h-4 w-4" />
                Proof of Payment
              </Label>
              <div className="border rounded-lg p-2 bg-gray-50">
                <img
                  src={contribution.proofOfPayment}
                  alt="Proof of payment"
                  className="max-w-full max-h-96 object-contain rounded mx-auto"
                />
              </div>
            </div>
          )}

          {/* Rejection Form */}
          {showRejectionForm && (
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <Label htmlFor="rejectionReason" className="text-sm font-medium text-red-800">
                Rejection Reason (Optional)
              </Label>
              <Textarea
                id="rejectionReason"
                placeholder="Provide a reason for rejection (optional)"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="mt-2"
                rows={3}
              />
              <p className="text-xs text-red-600 mt-1">
                The contributor will be notified with this reason.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          
          {contribution.status === "pending" && (
            <>
              {showRejectionForm ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowRejectionForm(false);
                      setRejectionReason("");
                    }}
                  >
                    Cancel Rejection
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleReject}
                    disabled={rejectMutation.isPending}
                    data-testid="confirm-reject-button"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    {rejectMutation.isPending ? "Rejecting..." : "Confirm Rejection"}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="destructive"
                    onClick={() => setShowRejectionForm(true)}
                    data-testid="reject-button"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    onClick={handleConfirm}
                    disabled={confirmMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                    data-testid="confirm-button"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {confirmMutation.isPending ? "Confirming..." : "Confirm Payment"}
                  </Button>
                </>
              )}
            </>
          )}

          {contribution.status === "confirmed" && (
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              <CheckCircle className="h-4 w-4 mr-1" />
              Already Confirmed
            </Badge>
          )}

          {contribution.status === "rejected" && (
            <Badge variant="secondary" className="bg-red-100 text-red-800">
              <XCircle className="h-4 w-4 mr-1" />
              Rejected
            </Badge>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}