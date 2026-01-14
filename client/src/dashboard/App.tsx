import { Routes, Route, useLocation, useNavigate, Navigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@dashboard/components/ui/sidebar";
import AppSidebar from "@dashboard/components/AppSidebar";
import ThemeToggle from "@dashboard/components/ThemeToggle";
import { Bell, Loader2 } from "lucide-react";
import { Button } from "@dashboard/components/ui/button";
import { Badge } from "@dashboard/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";

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

function AdminRouter() {
  return (
    <Routes>
      <Route path="/" element={<AdminDashboard />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/admin/users" element={<AdminUsers />} />
      <Route path="/admin/users/new" element={<AdminUsers />} />
      <Route path="/admin/messages" element={<AdminMessages />} />
      <Route path="/admin/payments" element={<AdminPayments />} />
      <Route path="/admin/audit-logs" element={<AdminAuditLogs />} />
      <Route path="/admin/gdpr" element={<AdminGdpr />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function TeamRouter() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/players" element={<Players />} />
      <Route path="/players/:id" element={<PlayerProfile />} />
      <Route path="/videos" element={<Videos />} />
      <Route path="/video-reels" element={<VideoReels />} />
      <Route path="/reports" element={<Reports />} />
      <Route path="/scouting" element={<Scouting />} />
      <Route path="/embassy" element={<Embassy />} />
      <Route path="/access" element={<Access />} />
      <Route path="/messages" element={<MessagesPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/invitation-letters" element={<InvitationLettersPage />} />
      <Route path="/team-sheets" element={<TeamSheets />} />
      <Route path="/federation-letters" element={<FederationLettersPage />} />
      <Route path="/federation-admin" element={<FederationAdminPage />} />
      <Route path="/token-bank" element={<TokenBank />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function ScoutRouter() {
  return (
    <Routes>
      <Route path="/" element={<ScoutDashboard />} />
      <Route path="/scout-dashboard" element={<ScoutDashboard />} />
      <Route path="/scout/player/:id" element={<PlayerProfile />} />
      <Route path="/video-reels" element={<VideoReels />} />
      <Route path="/messages" element={<MessagesPage />} />
      <Route path="/token-bank" element={<TokenBank />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function EmbassyRouter() {
  return (
    <Routes>
      <Route path="/" element={<EmbassyDashboard />} />
      <Route path="/embassy/document/:id" element={<EmbassyDocumentView />} />
      <Route path="/player/:id" element={<PlayerProfile />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function FederationAdminRouter() {
  return (
    <Routes>
      <Route path="/" element={<FederationAdminPage />} />
      <Route path="/federation-admin" element={<FederationAdminPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
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

function DashboardRoutes() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Check if this is a shared player profile route (public, no auth required)
  // Logic: starts with /shared/player/ relative to root? 
  // Since we are mounted at /dashboard, use full location.pathname
  // But wait, SharedPlayerProfile in original code was checking relative location to /dashboard base?
  // Let's assume shared URLs are actually /dashboard/shared/player/:token if served here?
  // Or maybe /shared/player/:token is a root route in Main App? 
  // In WouterRouter base="/dashboard", location was relative.
  // In Main App, DashboardRoot is at /dashboard/*.
  // So a path /dashboard/shared/player/... would hit here.
  // Let's handle it relative to /dashboard
  const path = location.pathname;
  // location.pathname includes /dashboard prefix because it's from the main router? 
  // Yes, in react-router-dom, useLocation returns the full path.
  // But we want to match relative to dashboard.

  // Actually, simpler approach: Define a specific route for shared player profile in the Routes above?
  // But the original component returned it EARLY, bypassing layout.
  // Let's replicate this early exit.

  if (path.includes("/shared/player/")) {
    // Extract token. 
    // Path might be /dashboard/shared/player/TOKEN
    const token = path.split("/shared/player/")[1];
    if (token) return <SharedPlayerProfile params={{ token }} />;
  }

  // If user is authenticated, show MainLayout
  if (user) {
    return <MainLayout userRole={user.role} onChangeRole={() => {
      signOut();
      navigate("/");
    }} />;
  }

  // Redirect to /auth if not logged in
  return <Navigate to="/auth" replace />;
}

export default DashboardRoutes;
