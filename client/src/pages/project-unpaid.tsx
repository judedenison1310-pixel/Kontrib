import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Navigation } from "@/components/navigation";
import { ArrowLeft, UserX, Loader2, MessageCircle, Send, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getCurrentUser } from "@/lib/auth";
import {
  generateIndividualReminderMessage,
  generateBulkReminderMessage,
  generateWhatsAppLink,
  generateWhatsAppShareLink,
} from "@/lib/reminders";
import type { Project, ContributionWithDetails, Group } from "@shared/schema";

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

export default function ProjectUnpaid() {
  const { projectId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
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

  const { data: groupMembers = [], isLoading: membersLoading } = useQuery<GroupMemberWithUser[]>({
    queryKey: ["/api/groups", project?.groupId, "members"],
    enabled: !!project?.groupId,
  });

  const isLoading = projectLoading || contributionsLoading || groupLoading || membersLoading;
  const isAdmin = user?.id === group?.adminId;

  const confirmedContributions = contributions.filter((c) => c.status === "confirmed");
  const paidUserIds = new Set(confirmedContributions.map((c) => c.userId));
  const unpaidMembers = groupMembers.filter((member) => !paidUserIds.has(member.userId));
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

    const whatsappUrl = generateWhatsAppLink(phoneNumber, message);
    window.open(whatsappUrl, "_blank");
  };

  const sendBulkReminder = () => {
    if (!project || !group || unpaidMembersWithPhone.length === 0) return;

    const message = generateBulkReminderMessage(
      unpaidMembersWithPhone.map((m) => ({
        fullName: m.user.fullName,
        phoneNumber: m.user.phoneNumber || m.user.phone_number || "",
      })),
      { name: project.name, targetAmount: project.targetAmount, deadline: project.deadline },
      { name: group.name, customSlug: group.customSlug, registrationLink: group.registrationLink }
    );

    const whatsappUrl = generateWhatsAppShareLink(message);
    window.open(whatsappUrl, "_blank");
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

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-lg mx-auto px-4 py-12 text-center">
          <p className="text-gray-600">Only admins can view unpaid members.</p>
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

        <Card className="rounded-2xl border-0 shadow-sm border-l-4 border-l-orange-400">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <UserX className="w-5 h-5 text-orange-600" />
                Unpaid Members
              </CardTitle>
              <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700">
                {unpaidMembers.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {unpaidMembers.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-7 h-7 text-green-600" />
                </div>
                <p className="font-medium text-gray-900 mb-1">All Paid!</p>
                <p className="text-sm text-gray-500">
                  Everyone in this group has contributed to this project.
                </p>
              </div>
            ) : (
              <>
                {unpaidMembersWithPhone.length > 0 && (
                  <Button
                    variant="outline"
                    className="w-full border-green-200 text-green-700 hover:bg-green-50"
                    onClick={sendBulkReminder}
                    data-testid="button-remind-all"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Remind All via WhatsApp ({unpaidMembersWithPhone.length})
                  </Button>
                )}

                <div className="space-y-2">
                  {unpaidMembers.map((member, index) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between py-3 px-3 bg-orange-50 rounded-xl"
                      data-testid={`unpaid-member-${index}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                          <span className="font-semibold text-orange-700">
                            {member.user.fullName?.charAt(0)?.toUpperCase() || "?"}
                          </span>
                        </div>
                        <span className="font-medium text-gray-900">{member.user.fullName}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`text-green-600 hover:text-green-700 hover:bg-green-50 ${
                          !hasPhoneNumber(member) ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                        onClick={() => sendIndividualReminder(member)}
                        disabled={!hasPhoneNumber(member)}
                        data-testid={`button-remind-${index}`}
                      >
                        <MessageCircle className="w-4 h-4 mr-1" />
                        Remind
                      </Button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
