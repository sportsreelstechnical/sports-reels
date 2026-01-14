
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { GoogleTranslationProvider } from "@/contexts/GoogleTranslationContext";
import AutoTranslateProvider from "@/components/AutoTranslateProvider";
import ProtectedRoute from "@/components/ProtectedRoute";

// Public Pages
import LandingPage from "./pages/LandingPage";
// import AuthPage from "@/dashboard/pages/auth-page"; 
// The AuthPage was in dashboard, but we can import it.
import AuthPage from "@/dashboard/pages/auth-page";

// Dashboard Pages
import Dashboard from "@/dashboard/pages/dashboard";
import ScoutDashboard from "@/dashboard/pages/scout-dashboard";
import EmbassyDashboard from "@/dashboard/pages/embassy-dashboard";
import AdminDashboard from "@/dashboard/pages/admin-dashboard";
import FederationAdminPage from "@/dashboard/pages/federation-admin";

import Players from "@/dashboard/pages/players";
import PlayerProfile from "@/dashboard/pages/player-profile";
import Videos from "@/dashboard/pages/videos";
import VideoReels from "@/dashboard/pages/video-reels";
import Reports from "@/dashboard/pages/reports";
import Scouting from "@/dashboard/pages/scouting";
import Embassy from "@/dashboard/pages/embassy";
import Access from "@/dashboard/pages/access";
import MessagesPage from "@/dashboard/pages/messages";
import SettingsPage from "@/dashboard/pages/settings";
import InvitationLettersPage from "@/dashboard/pages/invitation-letters";
import TeamSheets from "@/dashboard/pages/team-sheets";
import FederationLettersPage from "@/dashboard/pages/federation-letters";
import TokenBank from "@/dashboard/pages/token-bank";
import AdminUsers from "@/dashboard/pages/admin-users";
import AdminMessages from "@/dashboard/pages/admin-messages";
import AdminPayments from "@/dashboard/pages/admin-payments";
import AdminAuditLogs from "@/dashboard/pages/admin-audit-logs";
import AdminGdpr from "@/dashboard/pages/admin-gdpr";
import EmbassyDocumentView from "@/dashboard/pages/embassy-document-view";
import NotFound from "@/dashboard/pages/not-found";

// Dev/Legacy Pages (Optional to keep)
import TranslationDemo from "./components/TranslationDemo";
import LanguageSelectorDemo from "./components/LanguageSelectorDemo";
import GoogleTranslationTest from "./components/GoogleTranslationTest";

const queryClient = new QueryClient();

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return <LandingPage />;
}

// Component to route to the correct dashboard based on role
function DashboardHome() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/auth" />;

  if (user.role === 'admin') return <AdminDashboard />;
  if (user.role === 'embassy') return <EmbassyDashboard />;
  if (user.role === 'federation_admin') return <FederationAdminPage />;
  if (user.role === 'scout' || user.role === 'agent') return <ScoutDashboard />;
  return <Dashboard />; // Default for Team/Coach/Sporting Director
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <GoogleTranslationProvider>
          <AutoTranslateProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={<HomeRedirect />} />
                  <Route path="/landing" element={<LandingPage />} />
                  <Route path="/auth" element={<AuthPage />} />

                  {/* Dev Routes */}
                  <Route path="/translation-demo" element={<TranslationDemo />} />
                  <Route path="/language-selector-demo" element={<LanguageSelectorDemo />} />
                  <Route path="/unified-translation-test" element={<GoogleTranslationTest />} />

                  {/* Protected Dashboard Routes */}
                  <Route element={<ProtectedRoute />}>
                    <Route path="/dashboard" element={<DashboardHome />} />

                    {/* Common / Team Routes */}
                    <Route path="/players" element={<Players />} />
                    <Route path="/players/:id" element={<PlayerProfile />} />

                    {/* For compatibility with both URL structures */}
                    <Route path="/dashboard/scout/player/:id" element={<PlayerProfile />} />
                    <Route path="/scout/player/:id" element={<PlayerProfile />} />
                    <Route path="/player/:id" element={<PlayerProfile />} />

                    <Route path="/videos" element={<Videos />} />
                    <Route path="/video-reels" element={<VideoReels />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/scouting" element={<Scouting />} />
                    <Route path="/messages" element={<MessagesPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/token-bank" element={<TokenBank />} />

                    {/* Team Specific */}
                    <Route path="/team-sheets" element={<TeamSheets />} />
                    <Route path="/invitation-letters" element={<InvitationLettersPage />} />
                    <Route path="/federation-letters" element={<FederationLettersPage />} />

                    {/* Embassy Specific */}
                    <Route path="/embassy" element={<Embassy />} />
                    <Route path="/embassy/document/:id" element={<EmbassyDocumentView />} />

                    {/* Admin Specific */}
                    <Route path="/access" element={<Access />} />
                    <Route path="/admin/users" element={<AdminUsers />} />
                    <Route path="/admin/users/new" element={<AdminUsers />} />
                    <Route path="/admin/messages" element={<AdminMessages />} />
                    <Route path="/admin/payments" element={<AdminPayments />} />
                    <Route path="/admin/audit-logs" element={<AdminAuditLogs />} />
                    <Route path="/admin/gdpr" element={<AdminGdpr />} />

                    {/* Federation Admin */}
                    <Route path="/federation-admin" element={<FederationAdminPage />} />
                  </Route>

                  {/* Catch All */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </AutoTranslateProvider>
        </GoogleTranslationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
