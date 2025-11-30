import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Navigation } from "@/components/navigation";
import { CreateGroupModal } from "@/components/create-group-modal";
import { 
  Users, 
  Plus, 
  Search,
  ChevronRight,
  FolderKanban,
  Shield,
  UserCheck,
  CreditCard,
  Bell,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import type { GroupWithRole } from "@shared/schema";

type FilterType = 'all' | 'admin' | 'member';

export default function Groups() {
  const user = getCurrentUser();
  const [, setLocation] = useLocation();
  const [createGroupModalOpen, setCreateGroupModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const { data: groups = [], isLoading } = useQuery<GroupWithRole[]>({
    queryKey: ["/api/groups", "all", user?.id],
    enabled: !!user,
  });

  const filteredGroups = groups
    .filter((group) => group.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .filter((group) => {
      if (activeFilter === 'all') return true;
      if (activeFilter === 'admin') return group.role === 'admin' || group.role === 'both';
      if (activeFilter === 'member') return group.role === 'member' || group.role === 'both';
      return true;
    });

  const adminCount = groups.filter(g => g.role === 'admin' || g.role === 'both').length;
  const memberCount = groups.filter(g => g.role === 'member' || g.role === 'both').length;

  const getRoleBadges = (role: 'admin' | 'member' | 'both') => {
    if (role === 'both') {
      return (
        <div className="flex gap-1">
          <Badge className="bg-green-100 text-green-700 text-xs px-2 py-0.5">
            <Shield className="h-3 w-3 mr-1" />
            Admin
          </Badge>
          <Badge className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5">
            <UserCheck className="h-3 w-3 mr-1" />
            Member
          </Badge>
        </div>
      );
    }
    if (role === 'admin') {
      return (
        <Badge className="bg-green-100 text-green-700 text-xs px-2 py-0.5">
          <Shield className="h-3 w-3 mr-1" />
          Admin
        </Badge>
      );
    }
    return (
      <Badge className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5">
        <UserCheck className="h-3 w-3 mr-1" />
        Member
      </Badge>
    );
  };

  const getActionButton = (group: GroupWithRole) => {
    if (group.role === 'admin' || group.role === 'both') {
      if (group.pendingApprovals && group.pendingApprovals > 0) {
        return (
          <div className="flex items-center gap-1 text-orange-600 text-sm font-medium">
            <Bell className="h-4 w-4" />
            {group.pendingApprovals} pending
          </div>
        );
      }
      return (
        <span className="text-sm text-gray-500">Manage</span>
      );
    }
    return (
      <div className="flex items-center gap-1 text-primary text-sm font-medium">
        <CreditCard className="h-4 w-4" />
        Submit a Payment
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-lg mx-auto px-4 py-6">
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-green-600 border-r-transparent"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24 sm:pb-8">
      <Navigation />

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900" data-testid="text-page-title">
              My Groups
            </h1>
            <p className="text-gray-500">All your groups in one place</p>
          </div>
          <button
            onClick={() => setCreateGroupModalOpen(true)}
            className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white shadow-lg hover:bg-primary/90 transition-colors"
            data-testid="button-create-group-fab"
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>

        {groups.length > 0 && (
          <>
            <div className="flex gap-2 overflow-x-auto pb-2">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  activeFilter === 'all'
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-600 border border-gray-200'
                }`}
                data-testid="filter-all"
              >
                All ({groups.length})
              </button>
              <button
                onClick={() => setActiveFilter('admin')}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  activeFilter === 'admin'
                    ? 'bg-green-600 text-white'
                    : 'bg-white text-gray-600 border border-gray-200'
                }`}
                data-testid="filter-admin"
              >
                <Shield className="h-3 w-3 inline mr-1" />
                Admin ({adminCount})
              </button>
              <button
                onClick={() => setActiveFilter('member')}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  activeFilter === 'member'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 border border-gray-200'
                }`}
                data-testid="filter-member"
              >
                <UserCheck className="h-3 w-3 inline mr-1" />
                Member ({memberCount})
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search groups..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white"
                data-testid="input-search-groups"
              />
            </div>
          </>
        )}

        {filteredGroups.length === 0 ? (
          <Card className="border-2 border-dashed border-gray-300">
            <CardContent className="py-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-gray-400" />
              </div>
              {groups.length === 0 ? (
                <>
                  <h3 className="text-lg font-bold text-gray-900 mb-2" data-testid="text-empty-state">
                    No groups yet
                  </h3>
                  <p className="text-gray-500 mb-6">
                    Create a group to manage contributions, or ask someone to invite you to theirs
                  </p>
                  <Button
                    onClick={() => setCreateGroupModalOpen(true)}
                    className="bg-primary hover:bg-primary/90"
                    data-testid="button-create-first-group"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Group
                  </Button>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">No results found</h3>
                  <p className="text-gray-500">No groups match your search</p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm("");
                      setActiveFilter('all');
                    }}
                    className="mt-4"
                    data-testid="button-clear-search"
                  >
                    Clear Filters
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredGroups.map((group) => (
              <Card
                key={group.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-[0.99]"
                onClick={() => setLocation(`/group/${group.id}`)}
                data-testid={`group-card-${group.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                        group.role === 'admin' || group.role === 'both'
                          ? 'bg-green-100'
                          : 'bg-blue-100'
                      }`}>
                        <Users className={`h-6 w-6 ${
                          group.role === 'admin' || group.role === 'both'
                            ? 'text-green-600'
                            : 'text-blue-600'
                        }`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-gray-900 truncate" data-testid={`text-group-name-${group.id}`}>
                          {group.name}
                        </h3>
                        {getRoleBadges(group.role)}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-300 shrink-0 mt-2" />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {group.memberCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <FolderKanban className="h-3 w-3" />
                        {group.projectCount}
                      </span>
                    </div>
                    {getActionButton(group)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {groups.length > 0 && (
          <div className="text-center text-sm text-gray-500 pt-4">
            {filteredGroups.length} of {groups.length} {groups.length === 1 ? "group" : "groups"}
          </div>
        )}
      </main>

      <CreateGroupModal
        open={createGroupModalOpen}
        onOpenChange={setCreateGroupModalOpen}
      />
    </div>
  );
}
