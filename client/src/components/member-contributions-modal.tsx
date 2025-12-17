import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, CheckCircle2, Clock, XCircle, Receipt, Lock } from "lucide-react";
import { formatCurrency, CurrencyCode } from "@/lib/currency";
import { getCurrentUser } from "@/lib/auth";

interface MemberContributionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  groupId: string;
  memberName: string;
}

interface ContributionDetail {
  id: string;
  amount: string;
  status: string;
  projectName: string;
  projectCurrency: CurrencyCode;
  createdAt: string;
  paymentType: string;
}

interface MemberContributionsData {
  user: {
    id: string;
    fullName: string;
    phoneNumber: string;
  };
  totalConfirmed: string;
  totalPending: string;
  contributionCount: number;
  contributions: ContributionDetail[];
}

export function MemberContributionsModal({
  open,
  onOpenChange,
  userId,
  groupId,
  memberName,
}: MemberContributionsModalProps) {
  const currentUser = getCurrentUser();
  
  const { data, isLoading, isError, error } = useQuery<MemberContributionsData>({
    queryKey: ["/api/contributions/member", userId, "group", groupId, currentUser?.id],
    queryFn: async () => {
      const response = await fetch(
        `/api/contributions/member/${userId}/group/${groupId}?viewerId=${currentUser?.id}`,
        { credentials: "include" }
      );
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: open && !!userId && !!groupId && !!currentUser?.id,
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-NG", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Confirmed
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatPaymentType = (type: string) => {
    const types: Record<string, string> = {
      bank_transfer: "Bank Transfer",
      zelle: "Zelle",
      cashapp: "Cash App",
      venmo: "Venmo",
      paypal: "PayPal",
      wire_transfer: "Wire Transfer",
    };
    return types[type] || type;
  };

  const calculateTotalsByCurrency = (contributions: ContributionDetail[], status: string) => {
    const filtered = contributions.filter(c => c.status === status);
    const byCurrency: Record<CurrencyCode, number> = {} as Record<CurrencyCode, number>;
    
    filtered.forEach(c => {
      const currency = c.projectCurrency || "NGN";
      byCurrency[currency] = (byCurrency[currency] || 0) + Number(c.amount);
    });
    
    return Object.entries(byCurrency).map(([currency, amount]) => ({
      currency: currency as CurrencyCode,
      amount: amount.toString()
    }));
  };

  const renderTotals = () => {
    if (!data?.contributions.length) return null;
    
    const confirmedTotals = calculateTotalsByCurrency(data.contributions, "confirmed");
    const pendingTotals = calculateTotalsByCurrency(data.contributions, "pending");
    
    return (
      <div className="px-6 py-4 bg-gray-50 border-b">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-1">Total Confirmed</p>
            {confirmedTotals.length > 0 ? (
              <div className="space-y-1" data-testid="text-total-confirmed">
                {confirmedTotals.map(({ currency, amount }) => (
                  <p key={currency} className="text-xl font-bold text-green-600">
                    {formatCurrency(amount, currency)}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-xl font-bold text-gray-400">--</p>
            )}
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-1">Pending</p>
            {pendingTotals.length > 0 ? (
              <div className="space-y-1" data-testid="text-total-pending">
                {pendingTotals.map(({ currency, amount }) => (
                  <p key={currency} className="text-xl font-bold text-amber-600">
                    {formatCurrency(amount, currency)}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-xl font-bold text-gray-400">--</p>
            )}
          </div>
        </div>
        <p className="text-center text-sm text-gray-500 mt-3">
          {data.contributionCount} confirmed payment{data.contributionCount !== 1 ? "s" : ""}
        </p>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-xl font-bold" data-testid="modal-title">
            {memberName}'s Contributions
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : isError ? (
          <div className="text-center py-8 px-6">
            <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Lock className="w-7 h-7 text-amber-600" />
            </div>
            <p className="font-medium text-gray-900 mb-1">Access Restricted</p>
            <p className="text-sm text-gray-500">
              {(error as any)?.message?.includes("403") 
                ? "This information is only available to group admins."
                : "Could not load contribution data."}
            </p>
          </div>
        ) : data ? (
          <div className="flex flex-col">
            {renderTotals()}

            <ScrollArea className="flex-1 max-h-[400px]">
              <div className="px-6 py-4 space-y-3">
                {data.contributions.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Receipt className="w-7 h-7 text-gray-400" />
                    </div>
                    <p className="font-medium text-gray-900 mb-1">No Payments Yet</p>
                    <p className="text-sm text-gray-500">
                      This member hasn't made any payments.
                    </p>
                  </div>
                ) : (
                  data.contributions.map((contribution, index) => (
                    <div
                      key={contribution.id}
                      className="bg-white border rounded-xl p-4"
                      data-testid={`contribution-row-${index}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {formatCurrency(contribution.amount, contribution.projectCurrency)}
                          </p>
                          <p className="text-sm text-gray-500">{contribution.projectName}</p>
                        </div>
                        {getStatusBadge(contribution.status)}
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{formatPaymentType(contribution.paymentType)}</span>
                        <span>{formatDate(contribution.createdAt)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        ) : (
          <div className="text-center py-8 px-6">
            <p className="text-gray-500">Could not load contribution data.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
