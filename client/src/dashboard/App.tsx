import { useState, useEffect } from "react";
import { Switch, Route, useLocation, Router as WouterRouter } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@dashboard/components/ui/toaster";
import { TooltipProvider } from "@dashboard/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@dashboard/components/ui/sidebar";
import AppSidebar from "@dashboard/components/AppSidebar";
import ThemeToggle from "@dashboard/components/ThemeToggle";
import { Bell } from "lucide-react";
import { Button } from "@dashboard/components/ui/button";
import { Badge } from "@dashboard/components/ui/badge";

import Dashboard from "@dashboard/pages/dashboard";
import Players from "@dashboard/pages/players";
import PlayerProfile from "@dashboard/pages/player-profile";
import Videos from "@dashboard/pages/videos";
import Reports from "@dashboard/pages/reports";
import Scouting from "@dashboard/pages/scouting";
import Embassy from "@dashboard/pages/embassy";
import Access from "@dashboard/pages/access";
import NotFound from "@dashboard/pages/not-found";
import ScoutDashboard from "@dashboard/pages/scout-dashboard";
import EmbassyDashboard from "@dashboard/pages/embassy-dashboard";
import MessagesPage from "@dashboard/pages/messages";
import SettingsPage from "@dashboard/pages/settings";
import InvitationLettersPage from "@dashboard/pages/invitation-letters";
import EmbassyDocumentView from "@dashboard/pages/embassy-document-view";
import TeamSheets from "@dashboard/pages/team-sheets";
import FederationLettersPage from "@dashboard/pages/federation-letters";
import FederationAdminPage from "@dashboard/pages/federation-admin";
import TokenBank from "@dashboard/pages/token-bank";
import TokenBalanceIndicator from "@dashboard/components/TokenBalanceIndicator";
import VideoReels from "@dashboard/pages/video-reels";
import SharedPlayerProfile from "@dashboard/pages/shared-player-profile";
import AdminDashboard from "@dashboard/pages/admin-dashboard";
import AdminUsers from "@dashboard/pages/admin-users";
import AdminMessages from "@dashboard/pages/admin-messages";
import AdminPayments from "@dashboard/pages/admin-payments";
import AdminAuditLogs from "@dashboard/pages/admin-audit-logs";
import AdminGdpr from "@dashboard/pages/admin-gdpr";
import AuthPage from "@dashboard/pages/auth-page";
import { apiRequest } from "@dashboard/lib/queryClient";
import { Loader2 } from "lucide-react";

function AdminRouter() {
  return (
    <Switch>
      <Route path="/" component={AdminDashboard} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route path="/admin/users/new" component={AdminUsers} />
      <Route path="/admin/messages" component={AdminMessages} />
      <Route path="/admin/payments" component={AdminPayments} />
      <Route path="/admin/audit-logs" component={AdminAuditLogs} />
      <Route path="/admin/gdpr" component={AdminGdpr} />
      <Route path="/settings" component={SettingsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function TeamRouter() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/players" component={Players} />
      <Route path="/players/:id" component={PlayerProfile} />
      <Route path="/videos" component={Videos} />
      <Route path="/video-reels" component={VideoReels} />
      <Route path="/reports" component={Reports} />
      <Route path="/scouting" component={Scouting} />
      <Route path="/embassy" component={Embassy} />
      <Route path="/access" component={Access} />
      <Route path="/messages" component={MessagesPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/invitation-letters" component={InvitationLettersPage} />
      <Route path="/team-sheets" component={TeamSheets} />
      <Route path="/federation-letters" component={FederationLettersPage} />
      <Route path="/federation-admin" component={FederationAdminPage} />
      <Route path="/token-bank" component={TokenBank} />
      <Route component={NotFound} />
    </Switch>
  );
}

function ScoutRouter() {
  return (
    <Switch>
      <Route path="/" component={ScoutDashboard} />
      <Route path="/scout-dashboard" component={ScoutDashboard} />
      <Route path="/scout/player/:id" component={PlayerProfile} />
      <Route path="/video-reels" component={VideoReels} />
      <Route path="/messages" component={MessagesPage} />
      <Route path="/token-bank" component={TokenBank} />
      <Route component={NotFound} />
    </Switch>
  );
}

function EmbassyRouter() {
  return (
    <Switch>
      <Route path="/" component={EmbassyDashboard} />
      <Route path="/embassy/document/:id" component={EmbassyDocumentView} />
      <Route path="/player/:id" component={PlayerProfile} />
      <Route component={NotFound} />
    </Switch>
  );
}

function FederationAdminRouter() {
  return (
    <Switch>
      <Route path="/" component={FederationAdminPage} />
      <Route path="/federation-admin" component={FederationAdminPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function Router({ userRole }: { userRole: string }) {
  if (userRole === "admin") {
    return <AdminRouter />;
  }
  if (userRole === "embassy") {
    return <EmbassyRouter />;
  }
  if (userRole === "scout" || userRole === "agent") {
    return <ScoutRouter />;
  }
  if (userRole === "federation_admin") {
    return <FederationAdminRouter />;
  }
  return <TeamRouter />;
}

function MainLayout({ userRole, onChangeRole }: { userRole: string; onChangeRole: () => void }) {
  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  const roleDisplayName = userRole === "sporting_director" ? "Sporting Director"
    : userRole === "legal" ? "Legal Team"
      : userRole === "scout" ? "Scout"
        : userRole === "agent" ? "Agent"
          : userRole === "coach" ? "Coach"
            : userRole === "admin" ? "Administrator"
              : userRole === "embassy" ? "Embassy Official"
                : userRole === "federation_admin" ? "Federation Administrator"
                  : "User";

  const teamName = userRole === "admin" ? "Platform Admin Portal"
    : userRole === "embassy" ? "Embassy Portal"
      : userRole === "scout" || userRole === "agent" ? "Scout Network"
        : userRole === "federation_admin" ? "Federation Admin Portal"
          : "Demo Club FC";

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar userName="Demo User" userRole={roleDisplayName} userRoleRaw={userRole} pendingVerifications={3} />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-4 p-3 border-b shrink-0">
            <div className="flex items-center gap-2">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <span className="text-sm text-muted-foreground hidden md:inline">
                {teamName}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {(userRole === "scout" || userRole === "agent" || userRole === "sporting_director" || userRole === "coach") && (
                <TokenBalanceIndicator />
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={onChangeRole}
                data-testid="button-change-role"
              >
                Switch Role
              </Button>
              <Button size="icon" variant="ghost" className="relative" data-testid="button-notifications">
                <Bell className="h-4 w-4" />
                <Badge
                  variant="secondary"
                  className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-red-500 text-white"
                >
                  3
                </Badge>
              </Button>
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-auto bg-muted/30">
            <Router userRole={userRole} />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AppContent() {
  const [location, setLocation] = useLocation();
  const userData = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/auth/me");
        if (!res.ok) return null;
        return await res.json();
      } catch (e) {
        return null;
      }
    },
    retry: false,
  });

  const isLoading = userData.isLoading;
  const user = userData.data?.user;

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout");
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setLocation("/");
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Check if this is a shared profile route (public, no auth required)
  if (location.startsWith("/shared/player/")) {
    const token = location.replace("/shared/player/", "");
    return <SharedPlayerProfile params={{ token }} />;
  }

  // If user is authenticated, show MainLayout
  if (user) {
    return <MainLayout userRole={user.role} onChangeRole={handleLogout} />;
  }

  // Default to AuthPage
  return <AuthPage />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>

      <TooltipProvider>
        <WouterRouter base="/dashboard">
          <AppContent />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider >
  );
}

export default App;
