import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Bell, 
  DollarSign, 
  CheckCircle, 
  XCircle, 
  Clock,
  X
} from "lucide-react";
import { formatNaira } from "@/lib/currency";
import { apiRequest } from "@/lib/queryClient";
import type { Notification, ContributionWithDetails } from "@shared/schema";

interface NotificationBellProps {
  userId: string;
  onContributionClick?: (contribution: ContributionWithDetails) => void;
}

export function NotificationBell({ userId, onContributionClick }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications", userId],
    enabled: !!userId,
  });

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

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      markReadMutation.mutate(notification.id);
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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative"
          data-testid="notification-bell"
        >
          <Bell className="h-5 w-5 text-gray-600" />
          {totalUnreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="border-b px-4 py-3">
          <h3 className="font-semibold text-gray-900">Notifications</h3>
          <p className="text-sm text-gray-600">
            {totalUnreadCount > 0 ? `${totalUnreadCount} unread notifications` : 'All caught up!'}
          </p>
        </div>

        <ScrollArea className="max-h-96">
          <div className="p-2">
            {notifications.length === 0 ? (
              <div className="text-center py-8 px-4">
                <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No notifications yet</p>
              </div>
            ) : (
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
            )}
            
            {pendingContributions.length > 0 && (
              <>
                <div className="border-t pt-3 mt-3">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-orange-600" />
                    Pending Approvals ({pendingContributions.length})
                  </h4>
                  <div className="space-y-2">
                    {pendingContributions.slice(0, 3).map((contribution) => (
                      <div
                        key={contribution.id}
                        className="p-2 bg-orange-50 rounded border-l-4 border-l-orange-500 cursor-pointer hover:bg-orange-100 transition-colors"
                        onClick={() => {
                          setLocation(`/group/${contribution.groupId}/pending`);
                          setOpen(false);
                        }}
                        data-testid={`pending-contribution-${contribution.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {contribution.userName}
                            </p>
                            <p className="text-xs text-gray-600">
                              {contribution.groupName}
                              {contribution.projectName && (
                                <span> → {contribution.projectName}</span>
                              )}
                            </p>
                          </div>
                          <p className="text-sm font-semibold text-orange-600">
                            {formatNaira(Number(contribution.amount))}
                          </p>
                        </div>
                      </div>
                    ))}
                    {pendingContributions.length > 3 && (
                      <p className="text-xs text-gray-500 text-center">
                        +{pendingContributions.length - 3} more pending...
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        {notifications.length > 10 && (
          <div className="border-t p-3 text-center">
            <Button variant="ghost" size="sm" className="text-sm">
              View all notifications
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}