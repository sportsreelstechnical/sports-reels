
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Search, Users, FileText, MessageSquare, BarChart3 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import AgentRequestsExplore from './AgentRequestsExplore';
import AgentTransferTimeline from './AgentTransferTimeline';
import AgentMarketInsights from './AgentMarketInsights';
import UnifiedCommunicationHub from '../communication/UnifiedCommunicationHub';
import SimplifiedContractWorkflow from '../contracts/SimplifiedContractWorkflow';
import TransferPerformanceAnalytics from '../analytics/TransferPerformanceAnalytics';
import { useNotificationCounts } from '@/hooks/useNotificationCounts';
import { useNotificationToasts } from '@/hooks/useNotificationToasts';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useAutoMarkNotificationsRead } from '@/hooks/useAutoMarkNotificationsRead';
import { supabase } from '@/integrations/supabase/client';

interface AgentExploreHubProps {
  initialSearch?: string;
}

export const AgentExploreHub: React.FC<AgentExploreHubProps> = ({ initialSearch }) => {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('timeline');
  const { counts } = useNotificationCounts();
  const { profile } = useAuth();
  const { toast } = useToast();
  const [agentSportType, setAgentSportType] = useState<string | null>(null);

  // Auto-mark ALL notifications as read when communication tab is viewed
  useAutoMarkNotificationsRead(activeTab === 'communication');

  // Set up toast notifications for incoming alerts
  useNotificationToasts();

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['timeline', 'requests', 'communication', 'contracts', 'insights', 'analytics'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchSportType = async () => {
      if (!profile?.id) {
        setAgentSportType(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('agents')
          .select('specialization')
          .eq('profile_id', profile.id)
          .single();

        if (error) {
          throw error;
        }

        if (data?.specialization && Array.isArray(data.specialization) && data.specialization.length > 0) {
          setAgentSportType(data.specialization[0]);
        } else {
          setAgentSportType(null);
        }
      } catch (error) {
        console.error('Error fetching agent sport type:', error);
        setAgentSportType(null);
      }
    };

    fetchSportType();
  }, [profile?.id]);

  // Listen for workflow updates for immediate agent updates
  useEffect(() => {
    if (!profile?.user_id || profile.user_type !== 'agent') return;

    console.log('🎯 AGENT: Setting up workflow listeners');

    const handleWorkflowUpdate = (event: CustomEvent) => {
      const { type, teamName, playerName } = event.detail;

      console.log('⚡ AGENT: Workflow update received:', type);

      if (type === 'team_started_negotiation') {
        toast({
          title: "🚀 Negotiation Started!",
          description: `${teamName} is ready to start negotiations with you`,
          duration: 5000,
        });
      } else if (type === 'contract_created') {
        toast({
          title: "📄 Contract Created!",
          description: `${teamName} has created a contract for ${playerName}`,
          duration: 5000,
        });
      }
    };

    const handleContractCreated = (event: CustomEvent) => {
      const { agentId, pitchId, playerName, teamName } = event.detail;

      console.log('⚡ AGENT: Contract created event received:', {
        agentId, pitchId, playerName, teamName
      });

      // Force page refresh or navigation to update UI
      if (window.location.pathname.includes('/agent-explore')) {
        console.log('🔄 AGENT: Refreshing page to update contract status');
        window.location.reload();
      }
    };

    window.addEventListener('workflowUpdate', handleWorkflowUpdate as EventListener);
    window.addEventListener('contractCreated', handleContractCreated as EventListener);

    return () => {
      console.log('🧹 AGENT: Cleaning up workflow listeners');
      window.removeEventListener('workflowUpdate', handleWorkflowUpdate as EventListener);
      window.removeEventListener('contractCreated', handleContractCreated as EventListener);
    };
  }, [profile?.user_id, profile?.user_type, toast]);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <div className="container mx-auto px-4 lg:px-6 py-4 lg:py-8 max-w-7xl w-full">
        {/* Header */}
        <div className="mb-6 lg:mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2 font-polysans">Agent Explore Hub</h1>
          <p className="text-gray-400 text-sm lg:text-base">
            Discover opportunities, connect with teams, and stay ahead of the market
          </p>
        </div>

        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 border-0 h-auto gap-1 p-1">
            <TabsTrigger
              value="timeline"
              className="flex items-center justify-center gap-1 sm:gap-2 text-white data-[state=active]:bg-rosegold data-[state=active]:text-white text-xs sm:text-sm px-2 py-2 min-h-[44px]"
            >
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="hidden sm:inline">
                Transfer Timeline

              </span>
              <span className="sm:hidden">Timeline</span>
            </TabsTrigger>
            <TabsTrigger
              value="requests"
              className="flex items-center justify-center gap-1 sm:gap-2 text-white data-[state=active]:bg-rosegold data-[state=active]:text-white text-xs sm:text-sm px-2 py-2 min-h-[44px]"
            >
              <FileText className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Agent Requests</span>
              <span className="sm:hidden">Requests</span>
            </TabsTrigger>
            <TabsTrigger
              value="communication"
              className="flex items-center justify-center gap-1 sm:gap-2 text-white data-[state=active]:bg-rosegold data-[state=active]:text-white relative text-xs sm:text-sm px-2 py-2 min-h-[44px]"
            >
              <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="hidden lg:inline">Communication</span>
              <span className="lg:hidden">Chat</span>
              {counts.total > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center p-0 text-xs font-bold min-w-[16px] sm:min-w-[20px] animate-pulse"
                >
                  {counts.total > 99 ? '99+' : counts.total}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="contracts"
              className="flex items-center justify-center gap-1 sm:gap-2 text-white data-[state=active]:bg-rosegold data-[state=active]:text-white text-xs sm:text-sm px-2 py-2 min-h-[44px]"
            >
              <FileText className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Contracts</span>
              <span className="sm:hidden">Deals</span>
            </TabsTrigger>
            <TabsTrigger
              value="insights"
              className="flex items-center justify-center gap-1 sm:gap-2 text-white data-[state=active]:bg-rosegold data-[state=active]:text-white text-xs sm:text-sm px-2 py-2 min-h-[44px]"
            >
              <Search className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="hidden lg:inline">Market Insights</span>
              <span className="lg:hidden">Market</span>
            </TabsTrigger>

          </TabsList>

          {/* Transfer Timeline Tab */}
          <TabsContent value="timeline" className="mt-4 lg:mt-6">
            <div className="w-full overflow-hidden">
              <AgentTransferTimeline />
            </div>
          </TabsContent>

          {/* Agent Requests Tab */}
          <TabsContent value="requests" className="mt-4 lg:mt-6">
            <div className="w-full overflow-hidden">
              <AgentRequestsExplore initialSearch={initialSearch} />
            </div>
          </TabsContent>

          {/* Communication Tab */}
          <TabsContent value="communication" className="mt-4 lg:mt-6">
            <div className="w-full overflow-hidden">
              <UnifiedCommunicationHub />
            </div>
          </TabsContent>

          {/* Contracts Tab */}
          <TabsContent value="contracts" className="mt-4 lg:mt-6">
            <div className="w-full overflow-hidden">
              <SimplifiedContractWorkflow />
            </div>
          </TabsContent>

          {/* Market Insights Tab */}
          <TabsContent value="insights" className="mt-4 lg:mt-6">
            <div className="w-full overflow-hidden">
              <AgentMarketInsights />
            </div>
          </TabsContent>


        </Tabs>
      </div>
    </div>
  );
};
