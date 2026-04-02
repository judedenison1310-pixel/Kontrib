import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation, useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Navigation } from "@/components/navigation";
import { PaymentModal } from "@/components/payment-modal";
import { EditProjectModal } from "@/components/edit-project-modal";
import { AddDisbursementModal } from "@/components/add-disbursement-modal";
import {
  ArrowLeft,
  Target,
  Calendar,
  Users,
  Loader2,
  Building2,
  Copy,
  Check,
  CreditCard,
  Share2,
  FileImage,
  ChevronRight,
  Eye,
  Trash2,
  Pencil,
  MessageCircle,
  Send,
  UserX,
  Lock,
  PlusCircle,
  Banknote,
  Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, CurrencyCode } from "@/lib/currency";
import { getCurrentUser } from "@/lib/auth";
import { 
  generateIndividualReminderMessage, 
  generateBulkReminderMessage, 
  generateWhatsAppLink,
  generateWhatsAppShareLink 
} from "@/lib/reminders";
import type { Project, ContributionWithDetails, Group, Disbursement } from "@shared/schema";

interface GroupMemberWithUser {
  id: string;
  userId: string;
  user: {
    id: string;
    fullName: string;
    phoneNumber?: string;
    phone_number?: string;
  };
}

export default function ProjectDetails() {
  const { projectId } = useParams();
  const [, setLocation] = useLocation();
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [editProjectModalOpen, setEditProjectModalOpen] = useState(false);
  const [disbursementModalOpen, setDisbursementModalOpen] = useState(false);
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);
  const { toast } = useToast();
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

  const { data: groupMembers = [] } = useQuery<GroupMemberWithUser[]>({
    queryKey: ["/api/groups", project?.groupId, "members"],
    enabled: !!project?.groupId,
  });

  const { data: disbursements = [] } = useQuery<Disbursement[]>({
    queryKey: [`/api/projects/${projectId}/disbursements`],
    enabled: !!projectId,
  });

  const deleteDisbursementMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/disbursements/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/projects/${projectId}/disbursements`],
      });
      toast({ title: "Disbursement removed" });
    },
    onError: () => {
      toast({ title: "Failed to remove disbursement", variant: "destructive" });
    },
  });

  const isLoading = projectLoading || contributionsLoading;
  const isAdmin = user?.id === group?.adminId;

  const confirmedContributions = contributions.filter(
    (c) => c.status === "confirmed",
  );

  const paidUserIds = new Set(
    confirmedContributions.map((c) => c.userId)
  );

  const unpaidMembers = groupMembers.filter(
    (member) => !paidUserIds.has(member.userId)
  );

  const unpaidMembersWithPhone = unpaidMembers.filter(
    (member) => member.user.phoneNumber || member.user.phone_number
  );

  const hasPhoneNumber = (member: GroupMemberWithUser) => {
    return !!(member.user.phoneNumber || member.user.phone_number);
  };

  const sendIndividualReminder = (member: GroupMemberWithUser) => {
    if (!project || !group) return;
    
    const phoneNumber = member.user.phoneNumber || member.user.phone_number || "";
    if (!phoneNumber) {
      toast({
        title: "No phone number",
        description: `${member.user.fullName} doesn't have a phone number on file.`,
        variant: "destructive",
      });
      return;
    }

    const message = generateIndividualReminderMessage(
      { fullName: member.user.fullName, phoneNumber },
      { name: project.name, targetAmount: project.targetAmount, deadline: project.deadline },
      { name: group.name, customSlug: group.customSlug, registrationLink: group.registrationLink }
    );

    window.open(generateWhatsAppLink(phoneNumber, message), "_blank");
  };

  const sendBulkReminder = () => {
    if (!project || !group || unpaidMembersWithPhone.length === 0) {
      toast({
        title: "No reachable members",
        description: "None of the unpaid members have phone numbers on file.",
        variant: "destructive",
      });
      return;
    }

    const membersWithPhone = unpaidMembersWithPhone.map((m) => ({
      fullName: m.user.fullName,
      phoneNumber: m.user.phoneNumber || m.user.phone_number || "",
    }));

    const message = generateBulkReminderMessage(
      membersWithPhone,
      { name: project.name, targetAmount: project.targetAmount, deadline: project.deadline },
      { name: group.name, customSlug: group.customSlug, registrationLink: group.registrationLink }
    );

    window.open(generateWhatsAppShareLink(message), "_blank");
  };
  const totalContributed = confirmedContributions.reduce(
    (sum, contribution) => sum + parseFloat(contribution.amount || "0"),
    0,
  );

  const hasTarget = project?.targetAmount && parseFloat(project.targetAmount) > 0;
  const progress = project && hasTarget
    ? Math.min(
        Math.round(
          (parseFloat(project.collectedAmount) /
            parseFloat(project.targetAmount!)) *
            100,
        ),
        100,
      )
    : 0;

  const totalDisbursed = disbursements.reduce(
    (sum, d) => sum + parseFloat(d.amount || "0"),
    0
  );

  const availableBalance = totalContributed - totalDisbursed;

  const disbursedPercent =
    totalContributed > 0
      ? Math.min(Math.round((totalDisbursed / totalContributed) * 100), 100)
      : 0;

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

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

  const getProjectTypeLabel = (type: string | undefined) => {
    switch (type) {
      case "monthly": return "Monthly Contributions/Savings";
      case "yearly": return "Dues and Levies";
      case "event": return "Event Collection";
      case "emergency": return "Emergency Fund";
      default: return "Target Goal";
    }
  };

  const formatDeadline = (deadline: string | Date | null) => {
    if (!deadline) return null;
    const date = new Date(deadline);
    return date.toLocaleDateString("en-NG", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // Aggregate contributions by user (show each contributor once with total)
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
    (a, b) => b.totalAmount - a.totalAmount,
  );

  const generateProjectSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '')
      .slice(0, 50);
  };

  const getReadableProjectUrl = () => {
    if (!project || !group) return `${window.location.origin}/project/${projectId}`;
    const groupSlug = group.customSlug || group.registrationLink;
    const projectSlug = generateProjectSlug(project.name);
    return `https://kontrib.app/join/${groupSlug}/${projectSlug}`;
  };

  const handleCopyLink = async () => {
    try {
      const readableUrl = getReadableProjectUrl();
      await navigator.clipboard.writeText(readableUrl);
      setLinkCopied(true);
      toast({ title: "Link copied!", description: "Share it with group members" });
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  const handleShareWhatsApp = () => {
    if (!project || !group) return;
    
    const joinLink = getReadableProjectUrl();
    const groupName = group.name;
    
    const shareText = `${joinLink}\n\nYou have been invited to join ${groupName} on Kontrib!\n\nLogin to submit your contributions to ${project.name}\n\nLet's keep it transparent\n\nKontrib.app`;
    
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(whatsappUrl, '_blank');
  };

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

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-lg mx-auto px-4 py-12 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Project Not Found
          </h2>
          <p className="text-gray-500 mb-6">
            This project doesn't exist or has been removed.
          </p>
          <button
            onClick={() => setLocation("/dashboard")}
            className="text-primary font-medium"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const hasPaymentDetails = project.accountNumber || project.bankName || project.paymentInstructions;
  const projectCurrency = (project.currency as CurrencyCode) || "NGN";

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <Navigation />

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Back Button */}
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          data-testid="button-back"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>

        {/* Project Header - admin view */}
        {isAdmin && (
          <div className="bg-primary rounded-2xl p-5 text-white">
            <div className="flex items-start justify-between mb-2">
              {group ? (
                <button
                  onClick={() => setLocation(`/group/${group.id}`)}
                  className="flex items-center gap-1 text-green-200 text-sm hover:text-white transition-colors"
                >
                  <Building2 className="h-4 w-4" />
                  <span>{group.name}</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : <span />}
              <button
                onClick={() => setEditProjectModalOpen(true)}
                className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-medium px-3 py-1.5 rounded-full transition-colors"
                data-testid="button-edit-project"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit Details
              </button>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-white/20 text-white border-0 text-xs">
                {getProjectTypeLabel(project.projectType)}
              </Badge>
              <Badge className={`${getStatusColor(project.status)} text-xs`}>
                {project.status}
              </Badge>
            </div>
            <h1 className="text-2xl font-bold mb-2">{project.name}</h1>
            {project.description && (
              <p className="text-green-100 text-sm mb-3">{project.description}</p>
            )}
            <div className="grid grid-cols-2 gap-3 mt-3">
              {hasTarget && (
                <div className="bg-white/10 rounded-xl p-3">
                  <p className="text-green-200 text-xs flex items-center gap-1">
                    <Target className="h-3 w-3" />
                    Target
                  </p>
                  <p className="font-bold text-lg">{formatCurrency(project.targetAmount!, projectCurrency)}</p>
                </div>
              )}
              <div className={`bg-white/10 rounded-xl p-3 ${!hasTarget ? 'col-span-2' : ''}`}>
                <p className="text-green-200 text-xs">Collected</p>
                <p className="font-bold text-lg">{formatCurrency(project.collectedAmount, projectCurrency)}</p>
              </div>
            </div>
            {hasTarget && (
              <div className="mt-3">
                <Progress value={progress} className="h-2 bg-white/20 [&>div]:bg-white" />
                <p className="text-green-200 text-xs mt-1">{progress}% of goal reached</p>
              </div>
            )}
            {project.deadline && (
              <div className="flex items-center gap-2 mt-3 text-sm text-green-100">
                <Calendar className="h-4 w-4" />
                <span>Due: {formatDeadline(project.deadline)}</span>
              </div>
            )}
          </div>
        )}

        {/* Project Header - member view */}
        {!isAdmin && (
        <div className="bg-primary rounded-2xl p-5 text-white">
          {/* Top row: group name */}
          <div className="flex items-start justify-between mb-2">
            {group ? (
              <button
                onClick={() => setLocation(`/group/${group.id}`)}
                className="flex items-center gap-1 text-green-200 text-sm hover:text-white transition-colors"
                data-testid="link-group"
              >
                <Building2 className="h-4 w-4" />
                <span>{group.name}</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : <span />}
          </div>
          <div className="flex items-center gap-2 mb-2">
            <Badge className="bg-white/20 text-white border-0 text-xs">
              {getProjectTypeLabel(project.projectType)}
            </Badge>
            <Badge className={`${getStatusColor(project.status)} text-xs`}>
              {project.status}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold mb-2" data-testid="text-project-name">
            {project.name}
          </h1>
          {project.description && (
            <p className="text-green-100 text-sm mb-4">
              {project.description}
            </p>
          )}
          
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            {hasTarget && (
              <div className="bg-white/10 rounded-xl p-3">
                <p className="text-green-200 text-xs flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  Target
                </p>
                <p className="font-bold text-lg">{formatCurrency(project.targetAmount!, projectCurrency)}</p>
              </div>
            )}
            <div className={`bg-white/10 rounded-xl p-3 ${!hasTarget ? 'col-span-2' : ''}`}>
              <p className="text-green-200 text-xs">Collected</p>
              <p className="font-bold text-lg">{formatCurrency(project.collectedAmount, projectCurrency)}</p>
            </div>
          </div>

          {project.deadline && (
            <div className="flex items-center gap-2 mt-4 text-sm text-green-100">
              <Calendar className="h-4 w-4" />
              <span>Due: {formatDeadline(project.deadline)}</span>
            </div>
          )}
        </div>
        )}

        {/* Progress Card - hidden for admins */}
        {!isAdmin && hasTarget && (
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-600">
                  Progress
                </span>
                <span className="text-lg font-bold text-primary">
                  {progress}%
                </span>
              </div>
              <Progress value={progress} className="h-3 mb-3" />
              <div className="flex justify-between text-sm text-gray-500">
                <span>Collected: {formatCurrency(project.collectedAmount, projectCurrency)}</span>
                <span>
                  Remaining: {formatCurrency(
                    Math.max(0, parseFloat(project.targetAmount!) - parseFloat(project.collectedAmount)),
                    projectCurrency
                  )}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Primary CTA - hidden for admins */}
        {!isAdmin && (
          <div className="bg-white rounded-2xl p-5 text-center shadow-sm">
            <h3 className="text-gray-900 font-bold text-lg mb-4">Ready to Contribute?</h3>
            <button
              onClick={() => setPaymentOpen(true)}
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold text-lg py-4 rounded-full shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              data-testid="button-submit-proof-primary"
            >
              <CreditCard className="h-5 w-5" />
              Post Receipt
            </button>
          </div>
        )}

        {/* Payment Details */}
        {hasPaymentDetails && (
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-blue-700 font-medium">
              <Building2 className="h-5 w-5" />
              <span>Payment Details</span>
            </div>
            
            {project.bankName && (
              <div className="flex items-center justify-between bg-white rounded-xl p-3">
                <div>
                  <p className="text-xs text-gray-500">Bank</p>
                  <p className="font-medium text-gray-900">{project.bankName}</p>
                </div>
                <button
                  onClick={() => copyToClipboard(project.bankName!, "bank")}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  {copiedField === "bank" ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            )}

            {project.accountNumber && (
              <div className="flex items-center justify-between bg-white rounded-xl p-3">
                <div>
                  <p className="text-xs text-gray-500">Account Number</p>
                  <p className="font-bold text-gray-900 text-lg tracking-wider">{project.accountNumber}</p>
                </div>
                <button
                  onClick={() => copyToClipboard(project.accountNumber!, "account")}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  {copiedField === "account" ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            )}

            {project.accountName && (
              <div className="flex items-center justify-between bg-white rounded-xl p-3">
                <div>
                  <p className="text-xs text-gray-500">Account Name</p>
                  <p className="font-medium text-gray-900">{project.accountName}</p>
                </div>
                <button
                  onClick={() => copyToClipboard(project.accountName!, "name")}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  {copiedField === "name" ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            )}

            {project.paymentInstructions && (
              <div className="bg-white rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-1">Additional Instructions</p>
                <p className="text-gray-700 text-sm">{project.paymentInstructions}</p>
              </div>
            )}
          </div>
        )}

        {/* Funds Transparency */}
        {(isAdmin || (group?.privacyMode !== "private" && disbursements.length > 0)) && (
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Banknote className="w-5 h-5 text-primary" />
                  <span className="font-semibold text-gray-900">Funds Disbursed</span>
                </div>
                {isAdmin && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs gap-1"
                    onClick={() => setDisbursementModalOpen(true)}
                    data-testid="button-add-disbursement"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    Record
                  </Button>
                )}
              </div>

              {/* Mini stats */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-0.5">Collected</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {formatCurrency(totalContributed, projectCurrency)}
                  </p>
                </div>
                <div className="bg-orange-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-0.5">Disbursed</p>
                  <p className="text-sm font-semibold text-orange-700">
                    {formatCurrency(totalDisbursed, projectCurrency)}
                  </p>
                </div>
                <div className={`rounded-xl p-3 ${availableBalance < 0 ? "bg-red-50" : "bg-green-50"}`}>
                  <p className="text-xs text-gray-500 mb-0.5">Balance</p>
                  <p className={`text-sm font-semibold ${availableBalance < 0 ? "text-red-700" : "text-green-700"}`}>
                    {availableBalance < 0 ? "-" : ""}{formatCurrency(Math.abs(availableBalance), projectCurrency)}
                  </p>
                </div>
              </div>

              {disbursedPercent > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Disbursed</span>
                    <span>{disbursedPercent}%</span>
                  </div>
                  <Progress
                    value={disbursedPercent}
                    className={`h-2 ${disbursedPercent > 80 ? "[&>div]:bg-red-500" : disbursedPercent > 50 ? "[&>div]:bg-orange-500" : "[&>div]:bg-primary"}`}
                  />
                </div>
              )}

              {/* Disbursement list */}
              {disbursements.length > 0 && (
                <div className="space-y-2 pt-1">
                  {disbursements.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-start justify-between gap-3 p-3 bg-gray-50 rounded-xl"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{d.recipient}</p>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{d.purpose}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(d.disbursementDate).toLocaleDateString("en-NG", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-sm font-semibold text-orange-700">
                          {formatCurrency(parseFloat(d.amount), projectCurrency)}
                        </span>
                        {d.receipt && (
                          <button
                            onClick={() => setViewingReceipt(d.receipt!)}
                            className="text-gray-400 hover:text-primary transition-colors p-1"
                            title="View receipt"
                            data-testid={`button-view-receipt-${d.id}`}
                          >
                            <Receipt className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => deleteDisbursementMutation.mutate(d.id)}
                            disabled={deleteDisbursementMutation.isPending}
                            className="text-gray-400 hover:text-red-500 transition-colors p-1"
                            data-testid={`button-delete-disbursement-${d.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {disbursements.length === 0 && isAdmin && (
                <p className="text-sm text-gray-400 text-center py-2">
                  No disbursements recorded yet. Tap "Record" to add one.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Share Project */}
        <Card className="rounded-2xl border-0 shadow-sm bg-green-50 border-green-100">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-green-800 mb-3">Share with members</p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-green-200 hover:bg-green-100"
                onClick={handleCopyLink}
                data-testid="button-copy-project-link"
              >
                {linkCopied ? (
                  <>
                    <Check className="h-4 w-4 mr-2 text-green-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Link
                  </>
                )}
              </Button>
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={handleShareWhatsApp}
                data-testid="button-share-whatsapp"
              >
                <Share2 className="h-4 w-4 mr-2" />
                WhatsApp
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardContent className="p-4 space-y-2">
            {/* Payment Proofs - Admin Only */}
            {isAdmin && (
              <button
                onClick={() => setLocation(`/project/${projectId}/proofs`)}
                className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                data-testid="link-payment-proofs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                    <FileImage className="w-5 h-5 text-orange-600" />
                  </div>
                  <span className="font-medium text-gray-900">Payment Proofs</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {contributions.filter(c => c.proofOfPayment).length}
                  </Badge>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </button>
            )}

            {/* Contributors - Hidden for non-admins in private groups */}
            {(group?.privacyMode !== "private" || isAdmin) && (
              <button
                onClick={() => setLocation(`/project/${projectId}/contributors`)}
                className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                data-testid="link-contributors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <span className="font-medium text-gray-900">Contributors</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {sortedContributors.length}
                  </Badge>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </button>
            )}

            {/* Unpaid Members - Admin Only */}
            {isAdmin && unpaidMembers.length > 0 && (
              <button
                onClick={() => setLocation(`/project/${projectId}/unpaid`)}
                className="w-full flex items-center justify-between p-3 bg-orange-50 rounded-xl hover:bg-orange-100 transition-colors"
                data-testid="link-unpaid-members"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                    <UserX className="w-5 h-5 text-orange-600" />
                  </div>
                  <span className="font-medium text-gray-900">Unpaid Members</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700">
                    {unpaidMembers.length}
                  </Badge>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </button>
            )}

            {/* Public Report Link */}
            <button
              onClick={() => window.open(`/report/${projectId}`, "_blank")}
              className="w-full flex items-center justify-between p-3 bg-green-50 rounded-xl hover:bg-green-100 transition-colors"
              data-testid="link-public-report"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Share2 className="w-5 h-5 text-green-600" />
                </div>
                <div className="text-left">
                  <span className="font-medium text-gray-900 block">Shareable Report</span>
                  <span className="text-xs text-gray-500">Share progress publicly on WhatsApp</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
            </button>
          </CardContent>
        </Card>

        {/* Submit Proof Button - hidden for admins */}
        {!isAdmin && (
          <div className="fixed bottom-6 left-4 right-4 max-w-lg mx-auto">
            <button
              onClick={() => setPaymentOpen(true)}
              className="w-full bg-primary hover:bg-primary/90 text-white font-semibold text-lg py-4 rounded-full shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              data-testid="button-submit-proof"
            >
              <CreditCard className="h-5 w-5" />
              Post Receipt
            </button>
          </div>
        )}
      </div>

      <PaymentModal
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        project={project}
      />

      {project && (
        <EditProjectModal
          open={editProjectModalOpen}
          onOpenChange={setEditProjectModalOpen}
          project={project}
        />
      )}

      {projectId && user && (
        <AddDisbursementModal
          open={disbursementModalOpen}
          onOpenChange={setDisbursementModalOpen}
          projectId={projectId}
          createdBy={user.id}
        />
      )}

      {/* Receipt Viewer */}
      <Dialog open={!!viewingReceipt} onOpenChange={(o) => !o && setViewingReceipt(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Disbursement Receipt</DialogTitle>
          </DialogHeader>
          {viewingReceipt && (
            <img
              src={viewingReceipt}
              alt="Disbursement receipt"
              className="w-full rounded-xl object-contain max-h-[60vh]"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
