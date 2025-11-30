import { Group, GroupWithStats } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Settings, Users, FolderKanban, ChevronRight, Bell } from "lucide-react";
import { formatNaira } from "@/lib/currency";

interface GroupCardProps {
  group: Group | GroupWithStats;
  isAdmin?: boolean;
  onManage?: (group: Group) => void;
  onShare?: (group: Group) => void;
  onMakePayment?: (group: Group) => void;
  onViewDetails?: (group: Group) => void;
  userContribution?: string;
}

export function GroupCard({
  group,
  isAdmin = false,
  onManage,
  onShare,
  onMakePayment,
  onViewDetails,
  userContribution,
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

  const hasStats = "memberCount" in group;
  const groupWithStats = group as GroupWithStats;

  return (
    <Card 
      className="hover:shadow-md transition-all cursor-pointer active:scale-[0.99] border border-gray-100"
      onClick={() => onViewDetails?.(group)}
      data-testid={`group-card-${group.id}`}
    >
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-bold text-gray-900 dark:text-white truncate">
                {group.name}
              </h4>
              <Badge className={`${getStatusColor(group.status)} text-xs`}>
                {group.status}
              </Badge>
            </div>
            {group.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                {group.description}
              </p>
            )}
          </div>
          <ChevronRight className="h-5 w-5 text-gray-300 flex-shrink-0 ml-2" />
        </div>

        {/* Stats Row */}
        {hasStats && (
          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              <span>{groupWithStats.memberCount || 0} members</span>
            </div>
            <div className="flex items-center gap-1.5">
              <FolderKanban className="h-4 w-4" />
              <span>{groupWithStats.projectCount || 0} projects</span>
            </div>
          </div>
        )}

        {/* Admin: Pending payments alert */}
        {isAdmin && hasStats && groupWithStats.pendingPayments > 0 && (
          <div className="flex items-center gap-2 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl mb-4">
            <Bell className="h-4 w-4 text-orange-600" />
            <span className="text-sm font-medium text-orange-800 dark:text-orange-200">
              {groupWithStats.pendingPayments} pending approval{groupWithStats.pendingPayments > 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Member: My contribution */}
        {!isAdmin && userContribution && parseFloat(userContribution) > 0 && (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl mb-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">My Contribution</p>
            <p className="font-bold text-green-700 dark:text-green-400">
              {formatNaira(userContribution)}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div 
          className="flex gap-2 pt-2"
          onClick={(e) => e.stopPropagation()}
        >
          {isAdmin ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onShare?.(group)}
                className="flex-1 h-10"
                data-testid={`share-group-${group.id}`}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onManage?.(group)}
                className="flex-1 h-10"
                data-testid={`manage-group-${group.id}`}
              >
                <Settings className="h-4 w-4 mr-2" />
                Manage
              </Button>
            </>
          ) : (
            <Button
              onClick={() => onMakePayment?.(group)}
              className="w-full h-11 bg-nigerian-green hover:bg-forest-green font-medium"
              data-testid={`submit-proof-${group.id}`}
            >
              Submit Payment Proof
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
