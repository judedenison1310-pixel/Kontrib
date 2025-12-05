import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Navigation } from "@/components/navigation";
import { PaymentModal } from "@/components/payment-modal";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { formatNaira } from "@/lib/currency";
import { getCurrentUser } from "@/lib/auth";
import type { Project, ContributionWithDetails, Group } from "@shared/schema";

export default function ProjectDetails() {
  const { projectId } = useParams();
  const [, setLocation] = useLocation();
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [selectedProof, setSelectedProof] = useState<string | null>(null);
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

  const isLoading = projectLoading || contributionsLoading;
  const isAdmin = user?.id === group?.adminId;

  const confirmedContributions = contributions.filter(
    (c) => c.status === "confirmed",
  );
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
      case "monthly": return "Monthly Dues";
      case "yearly": return "Yearly Dues";
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

  const sortedContributions = [...confirmedContributions].sort(
    (a, b) => parseFloat(b.amount) - parseFloat(a.amount),
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

        {/* Project Header */}
        <div className="bg-primary rounded-2xl p-5 text-white">
          {/* Group Name */}
          {group && (
            <button
              onClick={() => setLocation(`/group/${group.id}`)}
              className="flex items-center gap-1 text-green-200 text-sm mb-2 hover:text-white transition-colors"
              data-testid="link-group"
            >
              <Building2 className="h-4 w-4" />
              <span>{group.name}</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
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
                <p className="font-bold text-lg">{formatNaira(project.targetAmount!)}</p>
              </div>
            )}
            <div className={`bg-white/10 rounded-xl p-3 ${!hasTarget ? 'col-span-2' : ''}`}>
              <p className="text-green-200 text-xs">Collected</p>
              <p className="font-bold text-lg">{formatNaira(project.collectedAmount)}</p>
            </div>
          </div>

          {project.deadline && (
            <div className="flex items-center gap-2 mt-4 text-sm text-green-100">
              <Calendar className="h-4 w-4" />
              <span>Due: {formatDeadline(project.deadline)}</span>
            </div>
          )}
        </div>

        {/* Progress Card - only for target-based projects */}
        {hasTarget && (
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
                <span>Collected: {formatNaira(project.collectedAmount)}</span>
                <span>
                  Remaining: {formatNaira(
                    Math.max(0, parseFloat(project.targetAmount!) - parseFloat(project.collectedAmount))
                  )}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Primary CTA - Submit Payment Proof */}
        <div className="bg-primary rounded-2xl p-5 text-center">
          <h3 className="text-white font-bold text-lg mb-2">Ready to Contribute?</h3>
          <p className="text-green-100 text-sm mb-4">
            Make your payment using the account details below, then submit your proof
          </p>
          <button
            onClick={() => setPaymentOpen(true)}
            className="w-full bg-white hover:bg-gray-100 text-primary font-bold text-lg py-4 rounded-full shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            data-testid="button-submit-proof-primary"
          >
            <CreditCard className="h-5 w-5" />
            Submit Payment Proof
          </button>
        </div>

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

        {/* Share Project */}
        <Card className="rounded-2xl border-0 shadow-sm bg-green-50 border-green-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Share2 className="h-5 w-5 text-green-700" />
              <h3 className="font-bold text-green-900">Share This Project</h3>
            </div>
            <p className="text-sm text-green-700 mb-4">
              Invite group members to contribute by sharing the project details on WhatsApp
            </p>
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

        {/* Payment Proofs - Admin Only */}
        {isAdmin && (
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileImage className="w-5 h-5 text-orange-600" />
                  Payment Proofs
                </CardTitle>
                <Badge variant="secondary" className="text-xs">
                  {contributions.filter(c => c.proofOfPayment).length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {contributions.filter(c => c.proofOfPayment).length === 0 ? (
                <div className="text-center py-6">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <FileImage className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500">No payment proofs uploaded yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {contributions
                    .filter(c => c.proofOfPayment)
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((contribution) => (
                      <div
                        key={contribution.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 cursor-pointer transition-colors"
                        onClick={() => setSelectedProof(contribution.proofOfPayment!)}
                        data-testid={`payment-proof-${contribution.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            contribution.status === 'confirmed' 
                              ? 'bg-green-100' 
                              : contribution.status === 'pending'
                              ? 'bg-yellow-100'
                              : 'bg-red-100'
                          }`}>
                            <FileImage className={`w-5 h-5 ${
                              contribution.status === 'confirmed' 
                                ? 'text-green-600' 
                                : contribution.status === 'pending'
                                ? 'text-yellow-600'
                                : 'text-red-600'
                            }`} />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{contribution.userName}</p>
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-gray-500">
                                {new Date(contribution.createdAt).toLocaleDateString("en-NG", { 
                                  day: "numeric", month: "short" 
                                })}
                              </p>
                              <Badge className={`text-xs ${
                                contribution.status === 'confirmed' 
                                  ? 'bg-green-100 text-green-700' 
                                  : contribution.status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-red-100 text-red-700'
                              }`}>
                                {contribution.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900">{formatNaira(contribution.amount)}</span>
                          <Eye className="w-4 h-4 text-gray-400" />
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Payment Proof Viewer Modal */}
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

        {/* Contributors Section */}
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="w-5 h-5 text-primary" />
                Contributors
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                {confirmedContributions.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {sortedContributions.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Users className="w-7 h-7 text-gray-400" />
                </div>
                <p className="font-medium text-gray-900 mb-1">No Contributors Yet</p>
                <p className="text-sm text-gray-500">
                  Be the first to contribute!
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {sortedContributions.map((contribution, index) => (
                  <div
                    key={contribution.id}
                    className="flex items-center justify-between py-3 px-3 bg-gray-50 rounded-xl"
                    data-testid={`contributor-row-${index}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="font-semibold text-primary">
                          {contribution.userName?.charAt(0)?.toUpperCase() || "?"}
                        </span>
                      </div>
                      <span className="font-medium text-gray-900">
                        {contribution.userName}
                      </span>
                    </div>
                    <span className="font-bold text-gray-900">
                      {formatNaira(contribution.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit Proof Button */}
        <div className="fixed bottom-6 left-4 right-4 max-w-lg mx-auto">
          <button
            onClick={() => setPaymentOpen(true)}
            className="w-full bg-primary hover:bg-primary/90 text-white font-semibold text-lg py-4 rounded-full shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            data-testid="button-submit-proof"
          >
            <CreditCard className="h-5 w-5" />
            Submit Payment Proof
          </button>
        </div>
      </div>

      <PaymentModal
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        project={project}
      />
    </div>
  );
}
