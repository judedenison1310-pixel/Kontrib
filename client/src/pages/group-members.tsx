import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Users, Trash2, Lock, Eye, ShieldCheck, ShieldOff } from "lucide-react";
import { MemberContributionsModal } from "@/components/member-contributions-modal";
import { Navigation } from "@/components/navigation";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getCurrentUser } from "@/lib/auth";

interface MemberWithUser {
  id: string;
  userId: string;
  groupId: string;
  status: string;
  user: {
    id: string;
    fullName: string;
    phoneNumber?: string;
    phone_number?: string;
    username: string | null;
  };
}

interface Group {
  id: string;
  name: string;
  adminId: string;
  coAdmins?: string[];
  privacyMode?: string;
}

export default function GroupMembers() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/group/:groupId/members");
  const groupId = params?.groupId;
  const { toast } = useToast();
  const [memberToDelete, setMemberToDelete] = useState<MemberWithUser | null>(null);
  const [selectedMember, setSelectedMember] = useState<MemberWithUser | null>(null);
  const [coAdminAction, setCoAdminAction] = useState<{ member: MemberWithUser; action: "add" | "remove" } | null>(null);
  const currentUser = getCurrentUser();

  const { data: group, isLoading: groupLoading } = useQuery<Group>({
    queryKey: ["/api/groups", groupId],
    enabled: !!groupId,
  });

  const { data: members = [], isLoading: membersLoading } = useQuery<MemberWithUser[]>({
    queryKey: ["/api/groups", groupId, "members"],
    enabled: !!groupId,
  });

  const isAdmin = currentUser?.id === group?.adminId;
  const coAdmins = group?.coAdmins ?? [];
  const canAddMoreCoAdmins = coAdmins.length < 2;

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      return apiRequest("DELETE", `/api/groups/${groupId}/members/${memberId}`, {
        adminId: currentUser?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups", groupId, "members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups", groupId] });
      toast({ title: "Member Removed", description: "The member has been removed and notified." });
      setMemberToDelete(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to remove member", variant: "destructive" });
    },
  });

  const coAdminMutation = useMutation({
    mutationFn: async ({ userId, action }: { userId: string; action: "add" | "remove" }) => {
      return apiRequest("PATCH", `/api/groups/${groupId}/co-admins`, {
        adminId: currentUser?.id,
        userId,
        action,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups", groupId] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups", groupId, "members"] });
      const msg = variables.action === "add"
        ? "Co-admin assigned successfully."
        : "Co-admin removed successfully.";
      toast({ title: "Co-Admin Updated", description: msg });
      setCoAdminAction(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update co-admin", variant: "destructive" });
      setCoAdminAction(null);
    },
  });

  const isLoading = groupLoading || membersLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-green-600 border-r-transparent"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Group Not Found</h2>
            <p className="text-gray-600 mb-6">The group you're looking for doesn't exist.</p>
            <Button onClick={() => setLocation("/dashboard")} data-testid="button-back-dashboard">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (group.privacyMode === "private" && !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20 sm:pb-0">
        <Navigation />
        <div className="max-w-2xl mx-auto px-4 py-6">
          <Button
            variant="ghost"
            onClick={() => setLocation(`/group/${groupId}`)}
            className="mb-6"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Group
          </Button>
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="h-8 w-8 text-amber-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Private Group</h2>
                <p className="text-gray-600">Member details are only visible to the group admin.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const formatPhone = (phone: string) => {
    if (!phone) return "";
    if (phone.startsWith("+234")) return phone.replace("+234", "0");
    return phone;
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 sm:pb-0">
      <Navigation />

      <div className="max-w-2xl mx-auto px-4 py-6">
        <Button
          variant="ghost"
          onClick={() => setLocation(`/group/${groupId}`)}
          className="mb-6"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Group
        </Button>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900" data-testid="text-page-title">
            Group Members
          </h1>
          <p className="text-gray-600">{group.name}</p>
          {isAdmin && (
            <p className="text-sm text-gray-500 mt-1">
              Co-admins: {coAdmins.length}/2 assigned
            </p>
          )}
        </div>

        {members.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No members yet</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {members.map((member) => {
              const isGroupAdmin = member.userId === group.adminId;
              const isCoAdmin = coAdmins.includes(member.userId);
              const initials = (member.user?.fullName || "M").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
              return (
                <div key={member.id} className="flex items-center justify-between px-4 py-3" data-testid={`member-card-${member.id}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-gray-900 truncate" data-testid={`text-member-name-${member.id}`}>
                          {member.user?.fullName || "Member"}
                        </p>
                        {isGroupAdmin && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                            Admin
                          </span>
                        )}
                        {isCoAdmin && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0" data-testid={`badge-co-admin-${member.id}`}>
                            Co-Admin
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500" data-testid={`text-member-phone-${member.id}`}>
                        {formatPhone(member.user?.phoneNumber || member.user?.phone_number || "")}
                      </p>
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        title="View contributions"
                        className="text-primary hover:text-primary hover:bg-primary/10"
                        onClick={() => setSelectedMember(member)}
                        data-testid={`button-view-payments-${member.id}`}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>

                      {!isGroupAdmin && (
                        <>
                          {isCoAdmin ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Remove co-admin"
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => setCoAdminAction({ member, action: "remove" })}
                              disabled={coAdminMutation.isPending}
                              data-testid={`button-remove-co-admin-${member.id}`}
                            >
                              <ShieldOff className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              title={canAddMoreCoAdmins ? "Make co-admin" : "Co-admin limit reached (max 2)"}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 disabled:opacity-40"
                              onClick={() => setCoAdminAction({ member, action: "add" })}
                              disabled={!canAddMoreCoAdmins || coAdminMutation.isPending}
                              data-testid={`button-add-co-admin-${member.id}`}
                            >
                              <ShieldCheck className="w-4 h-4" />
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="sm"
                            title="Remove member"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setMemberToDelete(member)}
                            data-testid={`button-delete-member-${member.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 text-center text-sm text-gray-500">
          {members.length} {members.length === 1 ? "member" : "members"} in this group
        </div>
      </div>

      <AlertDialog open={!!memberToDelete} onOpenChange={() => setMemberToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{" "}
              <span className="font-semibold">{memberToDelete?.user?.fullName}</span> from this
              group? They will be notified immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => memberToDelete && removeMemberMutation.mutate(memberToDelete.id)}
              className="bg-red-600 hover:bg-red-700"
              disabled={removeMemberMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {removeMemberMutation.isPending ? "Removing..." : "Remove Member"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!coAdminAction} onOpenChange={() => setCoAdminAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {coAdminAction?.action === "add" ? "Assign Co-Admin" : "Remove Co-Admin"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {coAdminAction?.action === "add" ? (
                <>
                  Are you sure you want to make{" "}
                  <span className="font-semibold">{coAdminAction?.member.user?.fullName}</span> a
                  co-admin? They will be able to help manage this group.
                </>
              ) : (
                <>
                  Are you sure you want to remove{" "}
                  <span className="font-semibold">{coAdminAction?.member.user?.fullName}</span> as
                  a co-admin? They will lose admin privileges.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-co-admin">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                coAdminAction &&
                coAdminMutation.mutate({
                  userId: coAdminAction.member.userId,
                  action: coAdminAction.action,
                })
              }
              className={coAdminAction?.action === "add" ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-700 hover:bg-gray-800"}
              disabled={coAdminMutation.isPending}
              data-testid="button-confirm-co-admin"
            >
              {coAdminMutation.isPending
                ? "Saving..."
                : coAdminAction?.action === "add"
                ? "Assign Co-Admin"
                : "Remove Co-Admin"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {groupId && selectedMember && (
        <MemberContributionsModal
          open={!!selectedMember}
          onOpenChange={(open) => !open && setSelectedMember(null)}
          userId={selectedMember.userId}
          groupId={groupId}
          memberName={selectedMember.user?.fullName || "Member"}
        />
      )}
    </div>
  );
}
