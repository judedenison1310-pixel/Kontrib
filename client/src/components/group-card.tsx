import { Group, GroupWithStats } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MessageCircle, Settings, Users, Target } from "lucide-react";
import { formatNaira } from "@/lib/currency";

interface GroupCardProps {
  group: Group | GroupWithStats;
  isAdmin?: boolean;
  onManage?: (group: Group) => void;
  onShare?: (group: Group) => void;
  onMakePayment?: (group: Group) => void;
  userContribution?: string;
}

export function GroupCard({ 
  group, 
  isAdmin = false, 
  onManage, 
  onShare, 
  onMakePayment,
  userContribution 
}: GroupCardProps) {
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

  // Check if this is a GroupWithStats object
  const hasStats = 'memberCount' in group;
  const groupWithStats = group as GroupWithStats;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h4 className="font-semibold text-gray-900 dark:text-white">{group.name}</h4>
              <Badge className={getStatusColor(group.status)}>
                {group.status}
              </Badge>
            </div>
            {group.description && (
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{group.description}</p>
            )}
          </div>
        </div>

        {hasStats && (
          <>
            {/* Member and Project counts */}
            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Members</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{groupWithStats.memberCount || 0}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Projects</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{groupWithStats.projectCount || 0}</p>
                </div>
              </div>
            </div>
            
            {/* User contribution (for members) */}
            {userContribution && !isAdmin && (
              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">My Contribution</p>
                <p className="font-semibold text-green-700 dark:text-green-400">{formatNaira(userContribution)}</p>
              </div>
            )}
            
            {/* Group progress */}
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Group Progress</span>
                <span className="font-medium text-gray-900 dark:text-white">{groupWithStats.completionRate || 0}%</span>
              </div>
              <Progress value={groupWithStats.completionRate || 0} className="h-2" />
            </div>
            
            {/* Pending payments alert (for admins) */}
            {isAdmin && groupWithStats.pendingPayments > 0 && (
              <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <p className="text-sm text-orange-800 dark:text-orange-200">
                  <Users className="inline h-4 w-4 mr-1" />
                  {groupWithStats.pendingPayments} pending payments
                </p>
              </div>
            )}
          </>
        )}

        {/* Custom URL display (for admins) */}
        {isAdmin && group.customSlug && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">Custom URL for sharing:</p>
            <p className="text-sm font-mono text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800 px-2 py-1 rounded">
              kontrib.app/{group.customSlug}
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex space-x-2">
          {isAdmin ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onShare?.(group)}
                className="flex-1"
                data-testid={`share-group-${group.id}`}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onManage?.(group)}
                className="flex-1"
                data-testid={`manage-group-${group.id}`}
              >
                <Settings className="h-4 w-4 mr-2" />
                Manage
              </Button>
            </>
          ) : (
            <Button
              onClick={() => onMakePayment?.(group)}
              className="flex-1 bg-nigerian-green hover:bg-forest-green"
              data-testid={`make-payment-${group.id}`}
            >
              Make Payment
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}