
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { GoogleTranslationProvider } from "@/contexts/GoogleTranslationContext";
import AutoTranslateProvider from "@/components/AutoTranslateProvider";
import Index from "./pages/Index";
import DashboardRoot from "@/dashboard/App";
import Players from "./pages/Players";
import Videos from "./pages/Videos";
import VideoAnalysis from "./pages/VideoAnalysis";
import VideoAnalysisResults from "./pages/VideoAnalysisResults";
import Profile from "./pages/Profile";
import PlayerProfile from "./pages/PlayerProfile";
import History from "./pages/History";
import Timeline from "./pages/Timeline";
import TransferTimeline from "./pages/TransferTimeline";
import Explore from "./pages/Explore";
import TeamExplore from "./pages/TeamExplore";
import AgentShortlist from "./pages/AgentShortlist";
import Contracts from "./pages/Contracts";
import UserManagement from "./pages/UserManagement";
import VideoShowcase from "./pages/VideoShowcase";
import Notification from "./pages/Notification";
import NotFound from "./pages/NotFound";
import ContractNegotiationPage from "./pages/ContractNegotiationPage";
import WalletPage from "./pages/WalletPage";
import TranslationDemo from "./components/TranslationDemo";
import LanguageSelectorDemo from "./components/LanguageSelectorDemo";
import GoogleTranslationTest from "./components/GoogleTranslationTest";
import AIScout from "./pages/AIScout";
import LandingPage from "./pages/LandingPage";

const queryClient = new QueryClient();
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
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/auth" element={<Index />} />
                  <Route path="/dashboard/*" element={<DashboardRoot />} />
                  <Route path="/app" element={<Index />} />
                  <Route path="/players" element={<Players />} />
                  <Route path="/videos" element={<Videos />} />
                  <Route path="/videos/:videoTitle" element={<VideoAnalysisResults />} />
                  <Route path="/video-analysis/:videoId" element={<VideoAnalysis />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/player/:playerId" element={<PlayerProfile />} />
                  <Route path="/history" element={<History />} />
                  <Route path="/timeline" element={<Timeline />} />
                  <Route path="/transfer-timeline" element={<TransferTimeline />} />
                  <Route path="/explore" element={<Explore />} />
                  <Route path="/team-explore" element={<TeamExplore />} />
                  <Route path="/agent-shortlist" element={<AgentShortlist />} />
                  <Route path="/ai-scout" element={<AIScout />} />
                  <Route path="/contracts" element={<Contracts />} />
                  <Route path="/contract-negotiation/:contractId" element={<ContractNegotiationPage />} />
                  <Route path="/wallet" element={<WalletPage />} />
                  <Route path="/user-management" element={<UserManagement />} />
                  <Route path="/video-showcase" element={<VideoShowcase />} />
                  <Route path="/notifications" element={<Notification />} />
                  <Route path="/translation-demo" element={<TranslationDemo />} />
                  <Route path="/language-selector-demo" element={<LanguageSelectorDemo />} />
                  <Route path="/unified-translation-test" element={<GoogleTranslationTest />} />
                  <Route path="/landing" element={<LandingPage />} />
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
