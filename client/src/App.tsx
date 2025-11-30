import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useState } from "react";
import { initializeAuth, getCurrentUser } from "./lib/auth";
import type { User } from "@shared/schema";

const REDIRECT_KEY = "kontrib_redirectTo";

// Pages
import Landing from "@/pages/landing";
import Groups from "@/pages/groups";
import SubmitProof from "@/pages/make-payment";
import MyContributions from "@/pages/my-contributions";
import Updates from "@/pages/updates";
import GroupRegistration from "@/pages/group-registration";
import NotFound from "@/pages/not-found";
import WhatsAppIntegration from "@/pages/whatsapp-integration";
import GroupLanding from "@/pages/group-landing";
import MemberPayment from "@/pages/member-payment";
import JoinGroup from "@/pages/join-group";
import GroupDetails from "@/pages/group-details";
import ProjectDetails from "@/pages/project-details";
import GroupMembers from "@/pages/group-members";
import GroupProjects from "@/pages/group-projects";
function Router() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [location] = useLocation();

  // Initialize auth on mount
  useEffect(() => {
    const handleAuthStateChange = (event: CustomEvent) => {
      setUser(event.detail);
    };

    const checkAuth = () => {
      const currentUser = getCurrentUser();
      setUser(currentUser);
    };

    // Initialize auth with backend validation
    const init = async () => {
      await initializeAuth();
      setUser(getCurrentUser());
      setIsAuthLoading(false);
    };
    
    init();
    
    // Listen for custom auth state changes
    window.addEventListener('authStateChanged', handleAuthStateChange as EventListener);
    window.addEventListener('storage', checkAuth);
    
    return () => {
      window.removeEventListener('authStateChanged', handleAuthStateChange as EventListener);
      window.removeEventListener('storage', checkAuth);
    };
  }, []);

  // Store intended destination for protected routes when user is not logged in
  useEffect(() => {
    if (!isAuthLoading && !user) {
      const protectedPaths = ['/groups', '/submit-proof', '/my-contributions', '/updates', '/whatsapp'];
      const isProjectPath = location.startsWith('/project/');
      const isGroupPath = location.startsWith('/group/');
      const isProtectedPath = protectedPaths.some(p => location === p) || isProjectPath || isGroupPath;
      
      if (isProtectedPath) {
        localStorage.setItem(REDIRECT_KEY, location);
      }
    }
  }, [location, user, isAuthLoading]);

  // Show loading state while auth is initializing
  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-green-600 border-r-transparent mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={user ? Groups : Landing} />
      <Route path="/register/:link" component={GroupRegistration} />
      <Route path="/join/:groupSlug/:projectSlug" component={GroupLanding} />
      <Route path="/join/:groupSlug" component={GroupLanding} />
      <Route path="/join-group" component={JoinGroup} />
      <Route path="/member-payment" component={MemberPayment} />
      
      {/* Redirect old dashboard routes to /groups */}
      <Route path="/dashboard">{user ? <Redirect to="/groups" /> : <Landing />}</Route>
      <Route path="/admin">{user ? <Redirect to="/groups" /> : <Landing />}</Route>
      <Route path="/member">{user ? <Redirect to="/groups" /> : <Landing />}</Route>
      
      {/* Protected routes - show Landing for unauthenticated users */}
      <Route path="/groups">{user ? <Groups /> : <Landing />}</Route>
      <Route path="/submit-proof">{user ? <SubmitProof /> : <Landing />}</Route>
      <Route path="/my-contributions">{user ? <MyContributions /> : <Landing />}</Route>
      <Route path="/updates">{user ? <Updates /> : <Landing />}</Route>
      <Route path="/group/:groupId/members">{user ? <GroupMembers /> : <Landing />}</Route>
      <Route path="/group/:groupId/projects">{user ? <GroupProjects /> : <Landing />}</Route>
      <Route path="/group/:groupId">{user ? <GroupDetails /> : <Landing />}</Route>
      <Route path="/project/:projectId">{user ? <ProjectDetails /> : <Landing />}</Route>
      <Route path="/whatsapp">{user ? <WhatsAppIntegration /> : <Landing />}</Route>
      
      {/* Short URL patterns - catches custom slugs like /groupname or /groupname/projectname */}
      <Route path="/:groupSlug/:projectSlug">
        {(params) => {
          const knownRoutes = ['api', 'assets', 'login', 'register', 'join', 'admin', 'dashboard', 'member', 'groups', 'group', 'project', 'submit-proof', 'my-contributions', 'updates', 'whatsapp', 'join-group', 'member-payment', 'members'];
          if (knownRoutes.includes(params.groupSlug?.toLowerCase() || '')) {
            return <NotFound />;
          }
          return <GroupLanding />;
        }}
      </Route>
      <Route path="/:groupSlug">
        {(params) => {
          const knownRoutes = ['api', 'assets', 'login', 'register', 'join', 'admin', 'dashboard', 'member', 'groups', 'group', 'project', 'submit-proof', 'my-contributions', 'updates', 'whatsapp', 'join-group', 'member-payment', 'members'];
          if (knownRoutes.includes(params.groupSlug?.toLowerCase() || '')) {
            return <NotFound />;
          }
          return <GroupLanding />;
        }}
      </Route>
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
