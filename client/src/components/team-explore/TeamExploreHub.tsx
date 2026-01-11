
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Users, Search, MessageSquare, FileText } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import TransferTimeline from './TransferTimeline';
import StreamlinedPitchCreation from './StreamlinedPitchCreation';
import { AgentRequestsExplore } from './AgentRequestsExplore';
import MarketSnapshotWidget from './MarketSnapshotWidget';
import ExpiringSoonWidget from './ExpiringSoonWidget';
import UnifiedCommunicationHub from '../communication/UnifiedCommunicationHub';
import SimplifiedContractWorkflow from '../contracts/SimplifiedContractWorkflow';
import { useNotificationCounts } from '@/hooks/useNotificationCounts';
import { useAutoMarkNotificationsRead } from '@/hooks/useAutoMarkNotificationsRead';
import { useNotificationToasts } from '@/hooks/useNotificationToasts';

interface TeamExploreHubProps {
  initialSearch?: string;
}

export const TeamExploreHub = ({ initialSearch }: TeamExploreHubProps) => {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('timeline');
  const { counts } = useNotificationCounts();

  // Auto-mark ALL notifications as read when communication tab is viewed
  useAutoMarkNotificationsRead(activeTab === 'communication');

  // Set up toast notifications for incoming alerts
  useNotificationToasts();

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['timeline', 'create', 'explore', 'communication', 'contracts', 'squad', 'analytics'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handlePitchCreated = () => {
    setActiveTab('timeline');
  };

  return (
    <div className="min-h-screen p-3 sm:p-4 overflow-x-hidden">
      <div className="max-w-7xl mx-auto space-y-3 sm:space-y-4 w-full">
        {/* Header */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">Team Explore Hub</h1>
          <p className="text-sm sm:text-base text-gray-400">Manage your transfer timeline, explore opportunities, and track market trends</p>
        </div>

        {/* Top Widgets Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          <MarketSnapshotWidget />
          <ExpiringSoonWidget />
        </div>

        {/* Main Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full border-0">
          <TabsList className="grid w-full grid-cols-5 border-0 h-auto">
            <TabsTrigger
              value="timeline"
              className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 border-0 text-gray-300 data-[state=active]:bg-rosegold data-[state=active]:text-white text-xs sm:text-sm px-2 py-2 min-h-[44px]"
            >
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 border-0" />
              <span className="hidden sm:inline">Transfer Timeline</span>
              <span className="sm:hidden">Timeline</span>
            </TabsTrigger>
            <TabsTrigger
              value="create"
              className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 text-gray-300 data-[state=active]:bg-rosegold data-[state=active]:text-white text-xs sm:text-sm px-2 py-2 min-h-[44px]"
            >
              <Users className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Create Pitch</span>
              <span className="sm:hidden">Create</span>
            </TabsTrigger>
            <TabsTrigger
              value="explore"
              className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 text-gray-300 data-[state=active]:bg-rosegold data-[state=active]:text-white text-xs sm:text-sm px-2 py-2 min-h-[44px]"
            >
              <Search className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Explore Requests</span>
              <span className="sm:hidden">Explore</span>
            </TabsTrigger>
            <TabsTrigger
              value="communication"
              className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 text-gray-300 data-[state=active]:bg-rosegold data-[state=active]:text-white relative text-xs sm:text-sm px-2 py-2 min-h-[44px]"
            >
              <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Communication</span>
              <span className="sm:hidden">Chat</span>
              {counts.total > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center p-0 text-[10px] sm:text-xs font-bold min-w-[16px] sm:min-w-[20px] animate-pulse"
                >
                  {counts.total > 99 ? '99+' : counts.total}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="contracts"
              className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 text-gray-300 data-[state=active]:bg-rosegold data-[state=active]:text-white text-xs sm:text-sm px-2 py-2 min-h-[44px]"
            >
              <FileText className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Contracts</span>
              <span className="sm:hidden">Docs</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="timeline" className="mt-6 ">
            <TransferTimeline />
          </TabsContent>

          <TabsContent value="create" className="mt-6">
            <StreamlinedPitchCreation onPitchCreated={handlePitchCreated} />
          </TabsContent>

          <TabsContent value="explore" className="mt-6">
            <AgentRequestsExplore initialSearch={initialSearch} />
          </TabsContent>

          <TabsContent value="communication" className="mt-6">
            <UnifiedCommunicationHub />
          </TabsContent>

          <TabsContent value="contracts" className="mt-6">
            <SimplifiedContractWorkflow />
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
};

export default TeamExploreHub;
