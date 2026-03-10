import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Navigation } from "@/components/navigation";
import { CreateGroupModal } from "@/components/create-group-modal";
import { EditNameModal } from "@/components/edit-name-modal";
import { 
  Users, 
  Plus, 
  Search,
  FolderKanban,
  Shield,
  UserCheck,
  Bell,
  Crown,
  Pencil,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { formatNaira } from "@/lib/currency";
import type { GroupWithRole } from "@shared/schema";

type FilterType = 'all' | 'admin' | 'member';

export default function Groups() {
  const user = getCurrentUser();
  const [, setLocation] = useLocation();
  const [createGroupModalOpen, setCreateGroupModalOpen] = useState(false);
  const [editGroupModalOpen, setEditGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<GroupWithRole | null>(null);
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

  const isGroupAdmin = (group: GroupWithRole) => group.role === 'admin' || group.role === 'both';

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
                onClick={() => setLocation(`/group/${group.id}/projects`)}
                data-testid={`group-card-${group.id}`}
              >
                <CardContent className="p-4">
                  {/* Top row: name + pending bell */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 truncate" data-testid={`text-group-name-${group.id}`}>
                        {group.name}
                      </h3>
                      {isGroupAdmin(group) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingGroup(group);
                            setEditGroupModalOpen(true);
                          }}
                          className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors shrink-0"
                          data-testid={`button-edit-group-name-${group.id}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    {isGroupAdmin(group) && group.pendingApprovals && group.pendingApprovals > 0 ? (
                      <div className="flex items-center gap-1 text-orange-500 text-xs font-medium shrink-0 ml-2">
                        <Bell className="h-3.5 w-3.5" />
                        {group.pendingApprovals}
                      </div>
                    ) : null}
                  </div>

                  {/* Total Generated */}
                  <div className="mb-3">
                    <p className="text-xs text-gray-400 mb-0.5">Total Generated</p>
                    <p className="font-bold text-primary text-lg" data-testid={`text-total-collected-${group.id}`}>
                      {formatNaira(group.totalCollected)}
                    </p>
                  </div>

                  {/* Members + Projects as links */}
                  <div className="flex items-center gap-3 border-t border-gray-50 pt-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setLocation(`/group/${group.id}/members`);
                      }}
                      className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary transition-colors"
                      data-testid={`button-members-${group.id}`}
                    >
                      <Users className="h-3.5 w-3.5" />
                      Members {group.memberCount}
                    </button>
                    <span className="text-gray-200">|</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setLocation(`/group/${group.id}/projects`);
                      }}
                      className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary transition-colors"
                      data-testid={`button-projects-${group.id}`}
                    >
                      <FolderKanban className="h-3.5 w-3.5" />
                      Projects {group.projectCount}
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Prompt member-only users to start their own group */}
        {groups.length > 0 && adminCount === 0 && (
          <div
            className="rounded-2xl border-2 border-dashed border-green-200 bg-green-50 p-5 flex items-start gap-4 cursor-pointer hover:bg-green-100 transition-colors"
            onClick={() => setCreateGroupModalOpen(true)}
            data-testid="banner-create-own-group"
          >
            <div className="w-11 h-11 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
              <Crown className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 mb-0.5">Start your own group</p>
              <p className="text-sm text-gray-500">
                Collect dues, funds, or Ajo contributions from your own members.
              </p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setCreateGroupModalOpen(true); }}
              className="shrink-0 bg-primary text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-primary/90 transition-colors"
              data-testid="button-create-own-group"
            >
              Create
            </button>
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

      {editingGroup && (
        <EditNameModal
          open={editGroupModalOpen}
          onOpenChange={setEditGroupModalOpen}
          type="group"
          currentName={editingGroup.name}
          entityId={editingGroup.id}
        />
      )}
    </div>
  );
}
