import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  MessageCircle, 
  Share2, 
  Copy, 
  ExternalLink,
  Users,
  Target,
  Calendar,
  CheckCircle2,
  Clock,
  TrendingUp
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getCurrentUser } from "@/lib/auth";
import { formatNaira } from "@/lib/currency";
import { Group, Project, ContributionWithDetails } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function WhatsAppIntegration() {
  const user = getCurrentUser();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const { data: groups = [] } = useQuery<Group[]>({
    queryKey: ["/api/groups", user?.role === "admin" ? "admin" : "user", user?.id],
    enabled: !!user,
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/groups", selectedGroup?.id, "projects"],
    enabled: !!selectedGroup,
  });

  const { data: contributions = [] } = useQuery<ContributionWithDetails[]>({
    queryKey: ["/api/contributions", user?.role === "admin" ? "admin" : "user", user?.id],
    enabled: !!user,
  });

  const generateWhatsAppLink = (group: Group, project?: Project) => {
    const baseUrl = window.location.origin;
    const groupUrl = project 
      ? `${baseUrl}/${group.customSlug}/${project.customSlug?.split('/')[1] || project.name.toLowerCase().replace(/\s+/g, '')}`
      : `${baseUrl}/register/${group.registrationLink}`;
    
    const message = project 
      ? `🎯 *${project.name}* - Kontrib\n\n💰 Target: ${formatNaira(Number(project.targetAmount))}\n📈 Progress: ${project.collectedAmount ? Math.round((Number(project.collectedAmount) / Number(project.targetAmount)) * 100) : 0}%\n📅 Deadline: ${new Date(project.deadline || '').toLocaleDateString()}\n\n👥 Join our contribution group and track progress together!\n\n🔗 ${groupUrl}\n\n#Kontrib #GroupContributions #${group.name.replace(/\s+/g, '')}`
      : `🎉 Join "${group.name}" on Kontrib!\n\nManage group contributions with transparency and ease.\n\n👉 Register here: ${groupUrl}\n\n#Kontrib #GroupContributions`;
    
    return `https://wa.me/?text=${encodeURIComponent(message)}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Link copied to clipboard",
    });
  };

  const openWhatsApp = (whatsappUrl: string) => {
    window.open(whatsappUrl, '_blank');
  };

  const getContributionStatus = () => {
    if (!user) return null;
    
    const userContributions = contributions.filter(c => c.userId === user.id);
    const pendingCount = userContributions.filter(c => c.status === 'pending').length;
    const confirmedCount = userContributions.filter(c => c.status === 'confirmed').length;
    const totalAmount = userContributions
      .filter(c => c.status === 'confirmed')
      .reduce((sum, c) => sum + Number(c.amount), 0);

    return { pendingCount, confirmedCount, totalAmount };
  };

  const status = getContributionStatus();

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Required</CardTitle>
            <CardDescription>Please log in to access WhatsApp integration</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/")}>Go to Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">WhatsApp Integration</h1>
          <p className="text-gray-600 dark:text-gray-300">
            Share your contribution groups and track status through WhatsApp
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Link Preview Card */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Share Groups</h2>
            
            {/* Group Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Select Group</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {groups.length === 0 ? (
                  <p className="text-gray-500 text-sm">No groups available</p>
                ) : (
                  groups.map((group) => (
                    <div
                      key={group.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${
                        selectedGroup?.id === group.id ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-gray-700'
                      }`}
                      onClick={() => {
                        setSelectedGroup(group);
                        setSelectedProject(null);
                      }}
                      data-testid={`group-select-${group.id}`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white">{group.name}</h3>
                          <p className="text-sm text-gray-500">{group.description}</p>
                        </div>
                        <Badge variant="secondary">{group.status}</Badge>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Project Selection */}
            {selectedGroup && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Select Project (Optional)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {projects.length === 0 ? (
                    <p className="text-gray-500 text-sm">No projects in this group</p>
                  ) : (
                    projects.map((project) => (
                      <div
                        key={project.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${
                          selectedProject?.id === project.id ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-gray-700'
                        }`}
                        onClick={() => setSelectedProject(project)}
                        data-testid={`project-select-${project.id}`}
                      >
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <h3 className="font-medium text-gray-900 dark:text-white">{project.name}</h3>
                            <Badge variant="outline">
                              {Math.round((Number(project.collectedAmount) / Number(project.targetAmount)) * 100)}%
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <div className="flex items-center gap-1">
                              <Target className="h-3 w-3" />
                              {formatNaira(Number(project.targetAmount))}
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(project.deadline || '').toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            )}

            {/* WhatsApp Preview Card */}
            {selectedGroup && (
              <Card className="border-2 border-green-200 dark:border-green-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <MessageCircle className="h-5 w-5" />
                    WhatsApp Preview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Preview of the message */}
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="space-y-2 text-sm">
                      {selectedProject ? (
                        <>
                          <div className="font-semibold">🎯 {selectedProject.name} - Kontrib</div>
                          <div>💰 Target: {formatNaira(Number(selectedProject.targetAmount))}</div>
                          <div>📈 Progress: {Math.round((Number(selectedProject.collectedAmount) / Number(selectedProject.targetAmount)) * 100)}%</div>
                          <div>📅 Deadline: {new Date(selectedProject.deadline || '').toLocaleDateString()}</div>
                          <div className="pt-2">👥 Join our contribution group and track progress together!</div>
                          <div className="text-blue-600 dark:text-blue-400">
                            🔗 {window.location.origin}/{selectedGroup.customSlug}/{selectedProject.customSlug?.split('/')[1] || selectedProject.name.toLowerCase().replace(/\s+/g, '')}
                          </div>
                          <div className="text-gray-500 text-xs">
                            #Kontrib #GroupContributions #{selectedGroup.name.replace(/\s+/g, '')}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="font-semibold">🎉 Join "{selectedGroup.name}" on Kontrib!</div>
                          <div className="pt-2">Manage group contributions with transparency and ease.</div>
                          <div className="text-blue-600 dark:text-blue-400">
                            🔗 {window.location.origin}/register/{selectedGroup.registrationLink}
                          </div>
                          <div className="text-gray-500 text-xs">
                            #Kontrib #GroupContributions
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => openWhatsApp(generateWhatsAppLink(selectedGroup, selectedProject || undefined))}
                      className="bg-green-600 hover:bg-green-700 text-white"
                      data-testid="share-whatsapp"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Share on WhatsApp
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const url = selectedProject 
                          ? `${window.location.origin}/${selectedGroup.customSlug}/${selectedProject.customSlug?.split('/')[1] || selectedProject.name.toLowerCase().replace(/\s+/g, '')}`
                          : `${window.location.origin}/register/${selectedGroup.registrationLink}`;
                        copyToClipboard(url);
                      }}
                      data-testid="copy-link"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Link
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const url = selectedProject 
                          ? `${window.location.origin}/${selectedGroup.customSlug}/${selectedProject.customSlug?.split('/')[1] || selectedProject.name.toLowerCase().replace(/\s+/g, '')}`
                          : `${window.location.origin}/register/${selectedGroup.registrationLink}`;
                        window.open(url, '_blank');
                      }}
                      data-testid="open-link"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open Link
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Contribution Status Panel */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Your Contribution Status</h2>
            
            {status && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                      <div className="flex items-center justify-center mb-2">
                        <Clock className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                        {status.pendingCount}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Pending</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="flex items-center justify-center mb-2">
                        <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {status.confirmedCount}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Confirmed</div>
                    </div>
                    <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="flex items-center justify-center mb-2">
                        <Target className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {formatNaira(status.totalAmount)}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Total Paid</div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <h3 className="font-medium text-gray-900 dark:text-white">Recent Contributions</h3>
                    {contributions.slice(0, 5).map((contribution) => (
                      <div key={contribution.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${
                            contribution.status === 'pending' ? 'bg-orange-400' :
                            contribution.status === 'confirmed' ? 'bg-green-400' : 'bg-red-400'
                          }`}></div>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {contribution.groupName}
                              {contribution.projectName && (
                                <span className="text-gray-500"> → {contribution.projectName}</span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">
                              {new Date(contribution.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {formatNaira(Number(contribution.amount))}
                          </div>
                          <Badge 
                            variant={contribution.status === 'confirmed' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {contribution.status.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    
                    {contributions.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <Users className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                        <p>No contributions yet</p>
                      </div>
                    )}
                  </div>

                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setLocation(user.role === 'admin' ? '/admin' : '/dashboard')}
                    data-testid="view-dashboard"
                  >
                    View Full Dashboard
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setLocation('/')}
                  data-testid="create-contribution"
                >
                  <Target className="h-4 w-4 mr-2" />
                  Make a Contribution
                </Button>
                {user.role === 'admin' && (
                  <>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => setLocation('/admin')}
                      data-testid="manage-groups"
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Manage Groups
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => setLocation('/admin')}
                      data-testid="approve-payments"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Approve Payments
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}