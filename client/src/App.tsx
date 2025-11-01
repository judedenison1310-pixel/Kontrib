import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useState } from "react";
import { initializeAuth, getCurrentUser, isAdmin } from "./lib/auth";
import type { User } from "@shared/schema";

// Pages
import Landing from "@/pages/landing";
import AdminDashboard from "@/pages/admin-dashboard";
import MemberDashboard from "@/pages/member-dashboard";
import Groups from "@/pages/groups";
import MakePayment from "@/pages/make-payment";
import MyContributions from "@/pages/my-contributions";
import Updates from "@/pages/updates";
import GroupRegistration from "@/pages/group-registration";
import NotFound from "@/pages/not-found";
import WhatsAppIntegration from "@/pages/whatsapp-integration";
import GroupLanding from "@/pages/group-landing";
import MemberPayment from "@/pages/member-payment";
import JoinGroup from "@/pages/join-group";
import GroupDetails from "@/pages/group-details";

function Router() {
  const [user, setUser] = useState<User | null>(getCurrentUser());

  // Listen for auth state changes
  useEffect(() => {
    const handleAuthStateChange = (event: CustomEvent) => {
      setUser(event.detail);
    };

    const checkAuth = () => {
      const currentUser = getCurrentUser();
      setUser(currentUser);
    };

    // Check auth on mount
    checkAuth();
    
    // Listen for custom auth state changes
    window.addEventListener('authStateChanged', handleAuthStateChange as EventListener);
    window.addEventListener('storage', checkAuth);
    
    return () => {
      window.removeEventListener('authStateChanged', handleAuthStateChange as EventListener);
      window.removeEventListener('storage', checkAuth);
    };
  }, []);

  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={user ? (isAdmin() ? AdminDashboard : MemberDashboard) : Landing} />
      <Route path="/register/:link" component={GroupRegistration} />
      <Route path="/join/:registrationId" component={GroupLanding} />
      <Route path="/join/:link" component={GroupLanding} />
      <Route path="/join-group" component={JoinGroup} />
      <Route path="/member-payment" component={MemberPayment} />
      
      {/* Member route - accessible but shows appropriate content based on auth */}
      <Route path="/member" component={user ? MemberDashboard : Landing} />
      <Route path="/dashboard" component={user ? (isAdmin() ? AdminDashboard : MemberDashboard) : Landing} />
      
      {/* Protected routes */}
      {user && (
        <>
          {/* Member pages */}
          <Route path="/make-payment" component={MakePayment} />
          <Route path="/my-contributions" component={MyContributions} />
          <Route path="/updates" component={Updates} />
          <Route path="/groups" component={Groups} />
          <Route path="/group/:groupId" component={GroupDetails} />
          
          {/* Legacy admin specific route */}
          <Route path="/admin" component={AdminDashboard} />
          <Route path="/whatsapp" component={WhatsAppIntegration} />
        </>
      )}
      
      {/* Short URL pattern - catches custom slugs like /newgroup */}
      <Route path="/:groupSlug">
        {(params) => {
          // Skip if it matches known routes
          const knownRoutes = ['api', 'assets', 'login', 'register', 'join', 'admin', 'dashboard', 'member', 'groups', 'group', 'make-payment', 'my-contributions', 'updates', 'whatsapp', 'join-group', 'member-payment'];
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
  useEffect(() => {
    // Initialize authentication on app start
    initializeAuth();
  }, []);

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
