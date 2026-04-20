import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Bell,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  Wallet,
  X,
} from "lucide-react";
import { formatNaira } from "@/lib/currency";
import { apiRequest } from "@/lib/queryClient";
import { useNotificationsWebSocket } from "@/hooks/use-notifications-ws";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import type { Notification, ContributionWithDetails } from "@shared/schema";

interface NotificationBellProps {
  userId: string;
  onContributionClick?: (contribution: ContributionWithDetails) => void;
}

export function NotificationBell({ userId, onContributionClick }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [disbursementToConfirm, setDisbursementToConfirm] = useState<Notification | null>(null);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { hasNewNotification, clearNewNotification } = useNotificationsWebSocket(userId);
  const { isSupported, isSubscribed, permission, isLoading: pushLoading, requestAndSubscribe } = usePushNotifications(userId);

  const confirmDisbursementMutation = useMutation({
    mutationFn: async (disbursementId: string) => {
      const response = await apiRequest("POST", `/api/disbursements/${disbursementId}/confirm`, { userId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications", userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/disbursements"] });
      toast({ title: "Receipt confirmed", description: "Thanks — your group admin has been notified." });
      setDisbursementToConfirm(null);
    },
    onError: (error: any) => {
      toast({ title: "Couldn't confirm", description: error?.message || "Please try again", variant: "destructive" });
    },
  });

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications", userId],
    enabled: !!userId,
  });

  useEffect(() => {
    if (open && hasNewNotification) {
      clearNewNotification();
    }
  }, [open, hasNewNotification, clearNewNotification]);

  const { data: contributions = [] } = useQuery<ContributionWithDetails[]>({
    queryKey: ["/api/contributions/admin", userId],
    enabled: !!userId,
  });

  const markReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await apiRequest("PATCH", `/api/notifications/${notificationId}/read`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications", userId] });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await apiRequest("DELETE", `/api/notifications/${notificationId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications", userId] });
    },
  });

  const handleDismiss = (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    dismissMutation.mutate(notificationId);
  };

  const unreadNotifications = notifications.filter(n => !n.read);
  const pendingContributions = contributions.filter(c => c.status === 'pending');
  const totalUnreadCount = unreadNotifications.length;
  const badgeCount = totalUnreadCount || pendingContributions.length;

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      markReadMutation.mutate(notification.id);
    }

    // Disbursement received → open confirm receipt dialog
    if (notification.type === "disbursement_received") {
      if (notification.disbursementId) {
        setOpen(false);
        // Defer opening the dialog one tick so the popover finishes closing first
        setTimeout(() => setDisbursementToConfirm(notification), 50);
      } else {
        toast({
          title: "Can't open this notification",
          description:
            "This is an older disbursement notification. Ask your admin to record a new disbursement so you can confirm receipt here.",
        });
      }
      return;
    }

    // If this is a payment notification and we have a contribution handler, open the contribution
    if (notification.contributionId && onContributionClick) {
      const contribution = contributions.find(c => c.id === notification.contributionId);
      if (contribution) {
        onContributionClick(contribution);
        setOpen(false);
      }
    }
  };

  const getNotificationIcon = (type: string, status?: string) => {
    switch (type) {
      case 'payment_submitted':
        return <DollarSign className="h-4 w-4 text-orange-600" />;
      case 'payment_confirmed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'payment_rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'disbursement_received':
        return <Wallet className="h-4 w-4 text-green-600" />;
      default:
        return <Bell className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatNotificationTime = (date: string) => {
    const now = new Date();
    const notificationDate = new Date(date);
    const diffInMs = now.getTime() - notificationDate.getTime();
    const diffInMins = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMins < 60) {
      return diffInMins === 0 ? 'Just now' : `${diffInMins}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      return `${diffInDays}d ago`;
    }
  };

  // Parse amount out of the disbursement message for the confirm dialog
  const disbursementAmountText =
    disbursementToConfirm?.message.match(/disbursement of ([0-9,.]+)/i)?.[1] || "";
  const disbursementGroupText =
    disbursementToConfirm?.message.match(/from "([^"]+)"/)?.[1] || "your group";

  return (
    <>
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative"
          data-testid="notification-bell"
        >
          <Bell className={`h-5 w-5 text-gray-600 ${hasNewNotification ? 'animate-bounce' : ''}`} />
          {(badgeCount > 0 || hasNewNotification) && (
            <Badge 
              variant="destructive" 
              className={`absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs ${hasNewNotification ? 'animate-pulse ring-2 ring-red-300' : ''}`}
            >
              {badgeCount > 9 ? '9+' : badgeCount || '!'}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="border-b px-4 py-3">
          <h3 className="font-semibold text-gray-900">Notifications</h3>
          <p className="text-sm text-gray-600">
            {pendingContributions.length > 0
              ? `${pendingContributions.length} pending review${totalUnreadCount > 0 ? `, ${totalUnreadCount} unread` : ''}`
              : totalUnreadCount > 0 ? `${totalUnreadCount} unread` : 'All caught up!'}
          </p>
        </div>

        <ScrollArea className="max-h-96">
          <div className="p-2 space-y-1">

            {/* Pending Approvals — shown first so admin can act immediately */}
            {pendingContributions.length > 0 && (
              <div className="mb-1">
                <div className="flex items-center justify-between px-1 pb-1">
                  <h4 className="text-xs font-semibold text-orange-700 uppercase tracking-wide flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Needs Review ({pendingContributions.length})
                  </h4>
                </div>
                <div className="space-y-1">
                  {pendingContributions.slice(0, 3).map((contribution) => (
                    <div
                      key={contribution.id}
                      className="p-3 bg-orange-50 rounded-lg border-l-4 border-l-orange-500 cursor-pointer hover:bg-orange-100 transition-colors"
                      onClick={() => {
                        setLocation(`/group/${contribution.groupId}/pending`);
                        setOpen(false);
                      }}
                      data-testid={`pending-contribution-${contribution.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {contribution.userName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {contribution.groupName}
                            {contribution.projectName && (
                              <span> · {contribution.projectName}</span>
                            )}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-orange-600">
                            {formatNaira(Number(contribution.amount))}
                          </p>
                          <p className="text-xs text-orange-500">Tap to review</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {pendingContributions.length > 3 && (
                    <p className="text-xs text-gray-500 text-center py-1">
                      +{pendingContributions.length - 3} more pending
                    </p>
                  )}
                </div>
                {notifications.length > 0 && <div className="border-t mt-2 mb-1" />}
              </div>
            )}

            {/* Notifications list */}
            {notifications.length === 0 && pendingContributions.length === 0 ? (
              <div className="text-center py-8 px-4">
                <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No notifications yet</p>
              </div>
            ) : notifications.length > 0 ? (
              <>
                {pendingContributions.length > 0 && (
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1 pb-1">Activity</p>
                )}
                <div className="space-y-1">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors relative group ${
                        !notification.read ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'bg-white'
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                      data-testid={`notification-${notification.id}`}
                    >
                      <button
                        onClick={(e) => handleDismiss(e, notification.id)}
                        className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-200 opacity-0 group-hover:opacity-100 transition-opacity"
                        data-testid={`dismiss-notification-${notification.id}`}
                      >
                        <X className="h-3 w-3 text-gray-500" />
                      </button>
                      <div className="flex items-start gap-3 pr-6">
                        <div className="flex-shrink-0">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <p className={`text-sm font-medium ${
                              !notification.read ? 'text-gray-900' : 'text-gray-700'
                            }`}>
                              {notification.title}
                            </p>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1"></div>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            {formatNotificationTime(notification.createdAt.toString())}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </ScrollArea>

        {/* Push notification opt-in / status */}
        {isSupported && isSubscribed && (
          <div className="border-t px-4 py-3 bg-green-50">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
              <p className="text-xs text-green-800 font-medium" data-testid="text-push-enabled">
                Push notifications enabled
              </p>
            </div>
          </div>
        )}
        {isSupported && !isSubscribed && permission === "denied" && (
          <div className="border-t px-4 py-3 bg-amber-50">
            <p className="text-xs text-amber-800">
              Push notifications are blocked. Enable them in your browser site settings, then reopen this menu.
            </p>
          </div>
        )}
        {isSupported && !isSubscribed && permission !== "denied" && (
          <div className="border-t px-4 py-3 bg-gray-50">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-green-600 shrink-0" />
                <p className="text-xs text-gray-600">Get instant push alerts even when the app is closed</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="text-xs border-green-600 text-green-700 hover:bg-green-50 shrink-0"
                onClick={async () => {
                  const ok = await requestAndSubscribe();
                  if (ok) {
                    toast({
                      title: "Push notifications enabled",
                      description: "You'll get instant alerts even when the app is closed.",
                    });
                  } else {
                    toast({
                      title: "Couldn't enable push notifications",
                      description:
                        Notification.permission === "denied"
                          ? "Permission was blocked. Allow notifications in your browser settings and try again."
                          : "Something went wrong setting up push. Please try again.",
                      variant: "destructive",
                    });
                  }
                }}
                disabled={pushLoading}
                data-testid="button-enable-push"
              >
                {pushLoading ? "Enabling..." : "Enable"}
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>

    <AlertDialog
      open={!!disbursementToConfirm}
      onOpenChange={(o) => !o && setDisbursementToConfirm(null)}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-green-600" />
            Confirm Receipt
          </AlertDialogTitle>
          <AlertDialogDescription>
            Did you receive{" "}
            <span className="font-semibold text-gray-900">
              {disbursementAmountText
                ? formatNaira(Number(disbursementAmountText.replace(/,/g, "")))
                : "the disbursement"}
            </span>{" "}
            from <span className="font-semibold text-gray-900">{disbursementGroupText}</span>?
            <br />
            <br />
            Confirming lets your admin know the funds reached you.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid="button-cancel-confirm-receipt">Not yet</AlertDialogCancel>
          <AlertDialogAction
            onClick={() =>
              disbursementToConfirm?.disbursementId &&
              confirmDisbursementMutation.mutate(disbursementToConfirm.disbursementId)
            }
            disabled={confirmDisbursementMutation.isPending}
            className="bg-green-600 hover:bg-green-700"
            data-testid="button-confirm-receipt"
          >
            {confirmDisbursementMutation.isPending ? "Confirming..." : "Yes, I received it"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}