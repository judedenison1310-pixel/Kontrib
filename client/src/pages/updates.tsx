import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Navigation } from "@/components/navigation";
import { 
  Megaphone, 
  Bell, 
  Calendar,
  Users,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Info,
  MessageCircle
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { formatNaira } from "@/lib/currency";
import { Link } from "wouter";

export default function Updates() {
  const user = getCurrentUser();

  // Fetch user's notifications and updates
  const { data: notifications = [], isLoading: notificationsLoading } = useQuery<any[]>({
    queryKey: ["/api/notifications", user?.id],
    enabled: !!user,
  });

  // Fetch group updates and announcements
  const { data: groupUpdates = [], isLoading: updatesLoading } = useQuery<any[]>({
    queryKey: ["/api/group-updates", user?.id],
    enabled: !!user,
  });

  // Fetch user's groups for context
  const { data: userGroups = [] } = useQuery<any[]>({
    queryKey: ["/api/groups", "user", user?.id],
    enabled: !!user,
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'payment_approved':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'payment_rejected':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'group_update':
        return <Megaphone className="h-5 w-5 text-blue-600" />;
      case 'reminder':
        return <Bell className="h-5 w-5 text-orange-600" />;
      case 'milestone':
        return <TrendingUp className="h-5 w-5 text-purple-600" />;
      default:
        return <Info className="h-5 w-5 text-gray-600" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'payment_approved':
        return 'bg-green-50 border-green-200';
      case 'payment_rejected':
        return 'bg-red-50 border-red-200';
      case 'group_update':
        return 'bg-blue-50 border-blue-200';
      case 'reminder':
        return 'bg-orange-50 border-orange-200';
      case 'milestone':
        return 'bg-purple-50 border-purple-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  // Mock data for demonstration since we don't have real notifications yet
  const mockNotifications = [
    {
      id: '1',
      type: 'payment_approved',
      title: 'Payment Approved',
      message: 'Your contribution of ₦5,000 to "Wedding Fund" has been approved by the admin.',
      groupName: 'Wedding Fund',
      createdAt: new Date().toISOString(),
      read: false,
    },
    {
      id: '2',
      type: 'group_update',
      title: 'Group Milestone Reached',
      message: 'Congratulations! "Office Party Fund" has reached 75% of its target amount.',
      groupName: 'Office Party Fund',
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      read: false,
    },
    {
      id: '3',
      type: 'reminder',
      title: 'Payment Reminder',
      message: 'Don\'t forget to make your monthly contribution to "Savings Circle".',
      groupName: 'Savings Circle',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      read: true,
    },
  ];

  const mockGroupUpdates = [
    {
      id: '1',
      groupName: 'Wedding Fund',
      title: 'Updated Bank Account Details',
      message: 'Please note that we have updated our bank account details. Use the new account for all future contributions.',
      priority: 'high',
      createdAt: new Date().toISOString(),
    },
    {
      id: '2',
      groupName: 'Office Party Fund',
      title: 'Target Amount Adjusted',
      message: 'Based on the latest venue quotes, we have increased our target amount to ₦200,000.',
      priority: 'medium',
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  if (notificationsLoading || updatesLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="animate-pulse space-y-6">
            <div className="h-32 bg-gray-200 rounded-xl"></div>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const displayNotifications = notifications.length > 0 ? notifications : mockNotifications;
  const displayUpdates = groupUpdates.length > 0 ? groupUpdates : mockGroupUpdates;

  return (
    <div className="min-h-screen bg-gray-50 pb-20 sm:pb-0">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Updates & Notifications</h1>
          <p className="text-gray-600">Stay updated with your group activities and important announcements.</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Unread Notifications</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {displayNotifications.filter(n => !n.read).length}
                  </p>
                  <p className="text-xs text-orange-600">Need attention</p>
                </div>
                <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center">
                  <Bell className="text-orange-500 h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Groups</p>
                  <p className="text-2xl font-bold text-nigerian-green">
                    {userGroups.length}
                  </p>
                  <p className="text-xs text-green-600">Following updates</p>
                </div>
                <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center">
                  <Users className="text-nigerian-green h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Recent Updates</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {displayUpdates.length}
                  </p>
                  <p className="text-xs text-blue-600">This week</p>
                </div>
                <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center">
                  <Megaphone className="text-blue-500 h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Notifications */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bell className="h-5 w-5 mr-2 text-nigerian-green" />
              Recent Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            {displayNotifications.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications yet</h3>
                <p className="text-gray-600">
                  You'll receive notifications when admins approve payments or make announcements.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {displayNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 rounded-lg border transition-colors ${
                      !notification.read ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                    }`}
                    data-testid={`notification-${notification.id}`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-sm font-medium text-gray-900">
                            {notification.title}
                          </h4>
                          <div className="flex items-center space-x-2">
                            {!notification.read && (
                              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                New
                              </Badge>
                            )}
                            <span className="text-xs text-gray-500">
                              {new Date(notification.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">
                          {notification.message}
                        </p>
                        {notification.groupName && (
                          <div className="flex items-center text-xs text-gray-500">
                            <Users className="h-3 w-3 mr-1" />
                            {notification.groupName}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Group Announcements */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Megaphone className="h-5 w-5 mr-2 text-nigerian-green" />
              Group Announcements
            </CardTitle>
          </CardHeader>
          <CardContent>
            {displayUpdates.length === 0 ? (
              <div className="text-center py-8">
                <Megaphone className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No announcements</h3>
                <p className="text-gray-600">
                  Group admins will post important updates and announcements here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {displayUpdates.map((update) => (
                  <div
                    key={update.id}
                    className={`p-4 rounded-lg border ${
                      update.priority === 'high' ? 'bg-red-50 border-red-200' :
                      update.priority === 'medium' ? 'bg-yellow-50 border-yellow-200' :
                      'bg-gray-50 border-gray-200'
                    }`}
                    data-testid={`update-${update.id}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="text-lg font-medium text-gray-900">
                            {update.title}
                          </h4>
                          {update.priority === 'high' && (
                            <Badge variant="destructive">
                              High Priority
                            </Badge>
                          )}
                          {update.priority === 'medium' && (
                            <Badge className="bg-yellow-100 text-yellow-800">
                              Medium Priority
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 mb-3">
                          {update.message}
                        </p>
                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <div className="flex items-center">
                            <Users className="h-4 w-4 mr-1" />
                            {update.groupName}
                          </div>
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {new Date(update.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
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