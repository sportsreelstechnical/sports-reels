import { useState, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";
import ThemeToggle from "@/components/ThemeToggle";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import Dashboard from "@/pages/dashboard";
import Players from "@/pages/players";
import PlayerProfile from "@/pages/player-profile";
import Videos from "@/pages/videos";
import Reports from "@/pages/reports";
import Scouting from "@/pages/scouting";
import Embassy from "@/pages/embassy";
import Access from "@/pages/access";
import NotFound from "@/pages/not-found";
import ScoutDashboard from "@/pages/scout-dashboard";
import EmbassyDashboard from "@/pages/embassy-dashboard";
import MessagesPage from "@/pages/messages";
import SettingsPage from "@/pages/settings";
import InvitationLettersPage from "@/pages/invitation-letters";
import EmbassyDocumentView from "@/pages/embassy-document-view";
import RolePicker from "@/pages/role-picker";
import TeamSheets from "@/pages/team-sheets";
import FederationLettersPage from "@/pages/federation-letters";
import FederationAdminPage from "@/pages/federation-admin";
import TokenBank from "@/pages/token-bank";
import TokenBalanceIndicator from "@/components/TokenBalanceIndicator";
import VideoReels from "@/pages/video-reels";
import SharedPlayerProfile from "@/pages/shared-player-profile";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminUsers from "@/pages/admin-users";
import AdminMessages from "@/pages/admin-messages";
import AdminPayments from "@/pages/admin-payments";
import AdminAuditLogs from "@/pages/admin-audit-logs";
import AdminGdpr from "@/pages/admin-gdpr";

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
  const [selectedRole, setSelectedRole] = useState<string | null>(() => {
    return localStorage.getItem("sports-reels-role");
  });

  const handleSelectRole = (role: string) => {
    localStorage.setItem("sports-reels-role", role);
    setSelectedRole(role);
    setLocation("/");
  };

  const handleChangeRole = () => {
    localStorage.removeItem("sports-reels-role");
    setSelectedRole(null);
    setLocation("/");
  };

  // Check if this is a shared profile route (public, no auth required)
  if (location.startsWith("/shared/player/")) {
    const token = location.replace("/shared/player/", "");
    return <SharedPlayerProfile params={{ token }} />;
  }

  if (!selectedRole) {
    return <RolePicker onSelectRole={handleSelectRole} />;
  }

  return <MainLayout userRole={selectedRole} onChangeRole={handleChangeRole} />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppContent />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
