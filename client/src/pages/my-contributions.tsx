import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Navigation } from "@/components/navigation";
import {
  History,
  Search,
  Filter,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  Calendar,
  CreditCard,
  TrendingUp,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { formatNaira } from "@/lib/currency";
import { Link } from "wouter";

export default function MyContributions() {
  const user = getCurrentUser();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedContribution, setSelectedContribution] = useState<any>(null);

  // Fetch user's contributions
  const { data: contributions = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/contributions", "user", user?.id],
    enabled: !!user,
  });

  // Fetch user's stats
  const { data: userStats = {} } = useQuery<any>({
    queryKey: ["/api/stats", "user", user?.id],
    enabled: !!user,
  });

  // Filter contributions based on search and status
  const filteredContributions = contributions.filter((contribution) => {
    const matchesSearch =
      contribution.groupName
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      contribution.projectName
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      contribution.reference?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || contribution.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Group contributions by status for summary
  const contributionSummary = {
    confirmed: contributions.filter((c) => c.status === "confirmed").length,
    pending: contributions.filter((c) => c.status === "pending").length,
    rejected: contributions.filter((c) => c.status === "rejected").length,
    total: contributions.length,
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "confirmed":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "pending":
        return <Clock className="h-5 w-5 text-orange-600" />;
      case "rejected":
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800 border-green-200";
      case "pending":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "rejected":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="animate-pulse space-y-6">
            <div className="h-32 bg-gray-200 rounded-xl"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
              ))}
            </div>
            <div className="h-96 bg-gray-200 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 sm:pb-0">
      <Navigation />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            My Contributions
          </h1>
          <p className="text-gray-600">
            Track your payment history and status across all groups.
          </p>
        </div>

        {/* Summary Stats */}
        {/* <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Contributed
                  </p>
                  <p className="text-2xl font-bold text-nigerian-green">
                    {formatNaira(userStats.totalContributed || 0)}
                  </p>
                  <p className="text-xs text-green-600">All groups</p>
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
                  <p className="text-sm font-medium text-gray-600">Confirmed</p>
                  <p className="text-2xl font-bold text-green-600">
                    {contributionSummary.confirmed}
                  </p>
                  <p className="text-xs text-green-600">Approved payments</p>
                </div>
                <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center">
                  <CheckCircle className="text-green-500 h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {contributionSummary.pending}
                  </p>
                  <p className="text-xs text-orange-600">Awaiting approval</p>
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
                  <p className="text-sm font-medium text-gray-600">
                    Total Payments
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {contributionSummary.total}
                  </p>
                  <p className="text-xs text-gray-600">All time</p>
                </div>
                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center">
                  <History className="text-gray-500 h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div> */}

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by group, purse, or reference..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    data-testid="search-contributions"
                  />
                </div>
              </div>
              <div className="sm:w-48">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contributions List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <History className="h-5 w-5 mr-2 text-nigerian-green" />
                Payment History
              </CardTitle>
              <Link href="/make-payment">
                <Button className="bg-nigerian-green hover:bg-forest-green">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Make Payment
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {filteredContributions.length === 0 ? (
              <div className="text-center py-12">
                {contributions.length === 0 ? (
                  <>
                    <CreditCard className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-medium text-gray-900 mb-2">
                      No Contributions Yet
                    </h3>
                    <p className="text-gray-600 mb-6">
                      You haven't made any contributions yet. Start by making
                      your first payment.
                    </p>
                    <Link href="/make-payment">
                      <Button className="bg-nigerian-green hover:bg-forest-green">
                        <CreditCard className="h-4 w-4 mr-2" />
                        Make Your First Payment
                      </Button>
                    </Link>
                  </>
                ) : (
                  <>
                    <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-medium text-gray-900 mb-2">
                      No Results Found
                    </h3>
                    <p className="text-gray-600">
                      No contributions match your current search and filter
                      criteria.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchTerm("");
                        setStatusFilter("all");
                      }}
                      className="mt-4"
                    >
                      Clear Filters
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredContributions.map((contribution) => (
                  <div
                    key={contribution.id}
                    className={`p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors ${
                      contribution.status === "pending"
                        ? "border-orange-200 bg-orange-50/30"
                        : contribution.status === "confirmed"
                          ? "border-green-200 bg-green-50/30"
                          : contribution.status === "rejected"
                            ? "border-red-200 bg-red-50/30"
                            : "border-gray-200"
                    }`}
                    onClick={() => setSelectedContribution(contribution)}
                    data-testid={`contribution-${contribution.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          {getStatusIcon(contribution.status)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="text-lg font-medium text-gray-900 truncate">
                              {contribution.groupName}
                            </h4>
                            <Badge
                              className={`text-xs ${getStatusColor(contribution.status)}`}
                            >
                              {contribution.status.toUpperCase()}
                            </Badge>
                          </div>
                          {contribution.projectName && (
                            <p className="text-sm text-gray-600 mb-1">
                              Project: {contribution.projectName}
                            </p>
                          )}
                          <div className="flex items-center text-sm text-gray-500 space-x-4">
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1" />
                              {new Date(
                                contribution.createdAt,
                              ).toLocaleDateString()}
                            </div>
                            {contribution.reference && (
                              <div>Ref: {contribution.reference}</div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-gray-900">
                          {formatNaira(Number(contribution.amount))}
                        </p>
                        <Button variant="ghost" size="sm" className="mt-1">
                          <Eye className="h-4 w-4 mr-1" />
                          Details
                        </Button>
                      </div>
                    </div>

                    {contribution.notes && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Notes:</span>{" "}
                          {contribution.notes}
                        </p>
                      </div>
                    )}

                    {contribution.adminNotes && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Admin Notes:</span>{" "}
                          {contribution.adminNotes}
                        </p>
                      </div>
                    )}
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
