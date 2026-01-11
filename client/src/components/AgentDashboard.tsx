import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Users,
  Heart,
  Search,
  BarChart3,
  Target,
  MessageSquare,
  Eye,
  TrendingUp,
  FileText,
  Star,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  PlayCircle,
  Calendar,
  Trophy
} from 'lucide-react';
import { Link } from 'react-router-dom';
import AgentProfile from '@/components/AgentProfile';
import AgentShortlist from '@/components/AgentShortlist';
import AgentExplore from '@/components/AgentExplore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface DashboardStats {
  totalRequests: number;
  activePitches: number;
  shortlistedPlayers: number;
  totalMessages: number;
  pendingAnalysis: number;
  completedAnalysis: number;
  pitchViews: number;
}

interface RecentActivity {
  id: string;
  type: 'request_created' | 'player_shortlisted' | 'pitch_viewed' | 'message_received' | 'ai_analysis';
  title: string;
  description: string;
  timestamp: string;
  status?: string;
}

const AgentDashboard = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');

  const [stats, setStats] = useState<DashboardStats>({
    totalRequests: 0,
    activePitches: 0,
    shortlistedPlayers: 0,
    totalMessages: 0,
    pendingAnalysis: 0,
    completedAnalysis: 0,
    pitchViews: 0
  });

  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentInfo, setAgentInfo] = useState<any>(null);

  useEffect(() => {
    if (profile?.user_type === 'agent') {
      fetchDashboardData();
    }
  }, [profile]);

  const createAgentIfNotExists = async () => {
    if (!profile?.id) return;

    try {
      // Check if agent already exists
      const { data: existingAgent } = await supabase
        .from('agents')
        .select('id, agency_name')
        .eq('profile_id', profile.id)
        .single();

      if (existingAgent) {
        console.log('Agent already exists:', existingAgent.id);
        return existingAgent;
      }

      // Create new agent
      const { data: newAgent, error } = await supabase
        .from('agents')
        .insert({
          profile_id: profile.id,
          agency_name: profile.full_name || 'Agent Agency',
          bio: 'Professional sports agent',
          specialization: ['football', 'basketball'],
          verified: false,
          fifa_id: null,
          license_number: null,
          website: null
        })
        .select('id, agency_name')
        .single();

      if (error) throw error;

      console.log('Created new agent:', newAgent);
      return newAgent;
    } catch (error) {
      console.error('Error creating agent:', error);
      throw error;
    }
  };

  const fetchDashboardData = async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);

      // Get agent information
      const { data: agent, error: agentError } = await supabase
        .from('agents')
        .select('*')
        .eq('profile_id', profile.id)
        .single();

      if (agentError) {
        console.error('Error fetching agent:', agentError);
        return;
      }

      setAgentInfo(agent);

      if (!agent) {
        console.log('No agent found, user needs to complete setup');
        return;
      }

      const agentSportType = Array.isArray(agent.specialization) && agent.specialization.length > 0
        ? String(agent.specialization[0]).toLowerCase()
        : null;

      // Fetch all statistics in parallel
      const [
        requestsResult,
        pitchesResult,
        shortlistResult,
        messagesResult,
        analysisResult
      ] = await Promise.all([
        // Agent requests count
        supabase
          .from('agent_requests')
          .select('*', { count: 'exact', head: true })
          .eq('agent_id', agent.id),

        // Active pitches count
        supabase
          .from('transfer_pitches')
          .select('id, team_id, view_count, message_count, status, expires_at, created_at')
          .eq('status', 'active')
          .gte('expires_at', new Date().toISOString()),

        // Shortlisted players count
        supabase
          .from('shortlist')
          .select('*', { count: 'exact', head: true })
          .eq('agent_id', agent.id),

        // Messages count
        supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('receiver_id', profile.id),

        // AI analysis status (for videos in shortlist)
        supabase
          .from('videos')
          .select('ai_analysis_status')
          .in('id', []) // Will be populated with video IDs from shortlist
      ]);

      // Process results
      const totalRequests = requestsResult.count || 0;
      const activePitches = pitchesResult.data || [];

      let filteredActivePitches = activePitches;

      if (agentSportType && activePitches.length > 0) {
        const teamIds = Array.from(
          new Set(
            activePitches
              .map(pitch => pitch.team_id)
              .filter((id): id is string => typeof id === 'string' && id.length > 0)
          )
        );

        if (teamIds.length > 0) {
          const { data: teamsData, error: teamsError } = await supabase
            .from('teams')
            .select('id, sport_type')
            .in('id', teamIds);

          if (teamsError) {
            console.error('Error fetching team sport types:', teamsError);
          } else {
            const sportMap = new Map(
              (teamsData || []).map(team => [
                team.id,
                (team.sport_type || '').toLowerCase()
              ])
            );

            filteredActivePitches = activePitches.filter(pitch => {
              const teamSport = sportMap.get(pitch.team_id);
              return teamSport === agentSportType;
            });
          }
        } else {
          filteredActivePitches = [];
        }
      }

      const shortlistedPlayers = shortlistResult.count || 0;
      const totalMessages = messagesResult.count || 0;

      // Calculate pitch views
      const pitchViews = filteredActivePitches.reduce((sum, pitch) => sum + (pitch.view_count || 0), 0);

      // AI Analysis statistics (placeholder for now)
      const pendingAnalysis = 0;
      const completedAnalysis = 0;

      setStats({
        totalRequests,
        activePitches: filteredActivePitches.length,
        shortlistedPlayers,
        totalMessages,
        pendingAnalysis,
        completedAnalysis,
        pitchViews
      });

      // Build recent activity from real data
      const activities: RecentActivity[] = [];

      // Recent requests
      if (totalRequests > 0) {
        activities.push({
          id: 'request_1',
          type: 'request_created',
          title: 'Agent Request Created',
          description: 'New player request submitted',
          timestamp: new Date().toISOString(),
          status: 'active'
        });
      }

      // Recent shortlists
      if (shortlistedPlayers > 0) {
        activities.push({
          id: 'shortlist_1',
          type: 'player_shortlisted',
          title: 'Player Shortlisted',
          description: 'Player added to shortlist',
          timestamp: new Date().toISOString(),
          status: 'completed'
        });
      }

      // Recent pitch views
      if (pitchViews > 0) {
        activities.push({
          id: 'pitch_view_1',
          type: 'pitch_viewed',
          title: 'Transfer Pitch Viewed',
          description: 'Viewed active transfer pitch',
          timestamp: new Date().toISOString(),
          status: 'completed'
        });
      }

      // Sort activities by timestamp
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setRecentActivity(activities.slice(0, 6));

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'request_created':
        return <FileText className="w-4 h-4" />;
      case 'player_shortlisted':
        return <Heart className="w-4 h-4" />;
      case 'pitch_viewed':
        return <Target className="w-4 h-4" />;
      case 'message_received':
        return <MessageSquare className="w-4 h-4" />;
      case 'ai_analysis':
        return <BarChart3 className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getActivityColor = (type: RecentActivity['type']) => {
    switch (type) {
      case 'request_created':
        return 'text-blue-400';
      case 'player_shortlisted':
        return 'text-green-400';
      case 'pitch_viewed':
        return 'text-purple-400';
      case 'message_received':
        return 'text-yellow-400';
      case 'ai_analysis':
        return 'text-rosegold';
      default:
        return 'text-gray-400';
    }
  };

  if (profile?.user_type !== 'agent') {
    return (
      <div className="min-h-screen bg-background p-6">
        <Card className="max-w-md mx-auto mt-20 border-red-500">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-bold text-white mb-2">Access Restricted</h2>
            <p className="text-gray-400">
              This dashboard is only available for agent accounts.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-3 sm:p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4 sm:space-y-6">
            <div className="h-6 sm:h-8 bg-gray-700 rounded w-1/2 sm:w-1/3"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-28 sm:h-32 bg-gray-700 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Check if profile is completed
  if (!profile?.profile_completed) {
    return (
      <div className="min-h-screen bg-background p-3 sm:p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <Card className="bg-orange-500/10 border-orange-500/30">
            <CardContent className="p-4 sm:p-6">
              <div className="text-center py-8 sm:py-12">
                <AlertTriangle className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-orange-400" />
                <h3 className="text-lg sm:text-xl font-polysans font-semibold text-orange-400 mb-2">
                  Complete Your Profile Setup
                </h3>
                <p className="text-orange-300 font-poppins mb-3 sm:mb-4 text-sm sm:text-base">
                  Please complete your agent profile setup to access the dashboard.
                </p>
                <Button
                  onClick={() => window.location.reload()}
                  className="bg-orange-500 hover:bg-orange-600 text-white h-9 sm:h-10 text-xs sm:text-sm"
                >
                  Continue Setup
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="font-polysans text-xl sm:text-2xl md:text-3xl font-bold text-white truncate">
              Agent Dashboard
            </h1>
            {agentInfo && (
              <p className="text-gray-400 mt-1 text-xs sm:text-sm truncate">
                {agentInfo.agency_name} • {agentInfo.specialization?.join(', ') || 'Sports Agent'}
              </p>
            )}
          </div>

          {agentInfo?.logo_url && (
            <div className="flex items-center gap-4 flex-shrink-0">
              <img
                src={agentInfo.logo_url}
                alt="Agency Logo"
                className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 object-cover rounded-lg border-2 border-gray-600"
              />
            </div>
          )}
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          {/* Agent Requests */}
          <Card className='bg-card border-0'>
            <CardContent className="p-4 sm:p-5 md:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm sm:text-base font-medium text-gray-400 truncate">Total Requests</p>
                  <p className="text-2xl sm:text-3xl font-bold text-white">{stats.totalRequests}</p>
                </div>
                <FileText className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-blue-500 flex-shrink-0 ml-2" />
              </div>
              <div className="mt-3 sm:mt-4">
                <Link to="/explore">
                  <Button variant="outline" size="sm" className="w-full h-9 sm:h-10 text-sm sm:text-base">
                    View Requests
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Active Pitches */}
          <Card className="bg-card border-0">
            <CardContent className="p-4 sm:p-5 md:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm sm:text-base font-medium text-gray-400 truncate">Active Pitches</p>
                  <p className="text-2xl sm:text-3xl font-bold text-white">{stats.activePitches}</p>
                </div>
                <Target className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-orange-600 flex-shrink-0 ml-2" />
              </div>
              <div className="mt-3 sm:mt-4">
                <Link to="/explore">
                  <Button variant="outline" size="sm" className="w-full h-9 sm:h-10 text-sm sm:text-base">
                    Explore Pitches
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Shortlisted Players */}
          <Card className="bg-card border-0">
            <CardContent className="p-4 sm:p-5 md:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm sm:text-base font-medium text-gray-400 truncate">Shortlisted Players</p>
                  <p className="text-2xl sm:text-3xl font-bold text-white">{stats.shortlistedPlayers}</p>
                </div>
                <Heart className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-red-500 flex-shrink-0 ml-2" />
              </div>
              <div className="mt-3 sm:mt-4">
                <Link to="/agent-shortlist">
                  <Button variant="outline" size="sm" className="w-full h-9 sm:h-10 text-sm sm:text-base">
                    View Shortlist
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Messages */}
          <Card className="bg-card border-0">
            <CardContent className="p-4 sm:p-5 md:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm sm:text-base font-medium text-gray-400 truncate">Total Messages</p>
                  <p className="text-2xl sm:text-3xl font-bold text-white">{stats.totalMessages}</p>
                </div>
                <MessageSquare className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-green-700 flex-shrink-0 ml-2" />
              </div>
              <div className="mt-3 sm:mt-4">
                <Link to="/messages">
                  <Button variant="outline" size="sm" className="w-full h-9 sm:h-10 text-sm sm:text-base">
                    View Messages
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
          {/* Recent Activity */}
          <Card className="lg:col-span-2 bg-card border-0">
            <CardHeader className="p-4 sm:p-5 md:p-6">
              <CardTitle className="text-white flex items-center gap-2 text-base sm:text-lg">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 md:p-6 pt-0">
              {recentActivity.length > 0 ? (
                <div className="space-y-3 sm:space-y-4">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-[#111111]">
                      <div className={`${getActivityColor(activity.type)} mt-0.5 flex-shrink-0`}>
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm sm:text-base md:text-lg font-medium text-white break-words leading-tight">{activity.title}</p>
                        <p className="text-sm sm:text-base text-gray-400 truncate">{activity.description}</p>
                        <p className="text-sm sm:text-base text-gray-500 mt-1">
                          {new Date(activity.timestamp).toLocaleDateString()} at{' '}
                          {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      {activity.status && (
                        <Badge
                          variant="outline"
                          className={`text-sm sm:text-base flex-shrink-0 ${activity.status === 'completed' ? 'text-green-400' : 'text-orange-400'}`}
                        >
                          {activity.status}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 sm:py-8">
                  <Clock className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-gray-500" />
                  <p className="text-gray-400 text-sm sm:text-base">No recent activity</p>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">
                    Start by exploring players or creating requests
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="bg-card border-0">
            <CardHeader className="p-4 sm:p-5 md:p-6">
              <CardTitle className="text-white flex items-center gap-2 text-base sm:text-lg">
                <Star className="w-4 h-4 sm:w-5 sm:h-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 sm:space-y-3 p-4 sm:p-5 md:p-6 pt-0">
              <Link to="/explore" className="block">
                <Button variant="outline" className="w-full justify-start h-10 sm:h-11 text-sm sm:text-base">
                  <Search className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Explore Players
                </Button>
              </Link>

              <Link to="/agent-shortlist" className="block">
                <Button variant="outline" className="w-full justify-start h-10 sm:h-11 text-sm sm:text-base">
                  <Heart className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  View Shortlist
                </Button>
              </Link>

              <Link to="/timeline" className="block">
                <Button variant="outline" className="w-full justify-start h-10 sm:h-11 text-sm sm:text-base">
                  <Target className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Transfer Timeline
                </Button>
              </Link>

              <Link to="/messages" className="block">
                <Button variant="outline" className="w-full justify-start h-10 sm:h-11 text-sm sm:text-base">
                  <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Check Messages
                </Button>
              </Link>

              <Link to="/explore?tab=communication" className="block">
                <Button variant="outline" className="w-full justify-start h-10 sm:h-11 text-sm sm:text-base">
                  <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Communication Hub
                </Button>
              </Link>

              <Link to="/explore?tab=analytics" className="block">
                <Button variant="outline" className="w-full justify-start h-10 sm:h-11 text-sm sm:text-base">
                  <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  View Analytics
                </Button>
              </Link>

              <Link to="/profile" className="block">
                <Button variant="outline" className="w-full justify-start h-10 sm:h-11 text-sm sm:text-base">
                  <Trophy className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Edit Profile
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for Additional Features */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 bg-card border-0 gap-1 p-1 h-auto">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-rosegold data-[state=active]:text-white flex items-center justify-center gap-1.5 text-sm sm:text-base px-2 py-2.5 sm:py-3 min-h-[44px]"
            >
              <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Overview</span>
              <span className="sm:hidden">Stats</span>
            </TabsTrigger>
            <TabsTrigger
              value="profile"
              className="data-[state=active]:bg-rosegold data-[state=active]:text-white flex items-center justify-center gap-1.5 text-sm sm:text-base px-2 py-2.5 sm:py-3 min-h-[44px]"
            >
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
              Profile
            </TabsTrigger>
            <TabsTrigger
              value="shortlist"
              className="data-[state=active]:bg-rosegold data-[state=active]:text-white flex items-center justify-center gap-1.5 text-sm sm:text-base px-2 py-2.5 sm:py-3 min-h-[44px]"
            >
              <Heart className="w-4 h-4 sm:w-5 sm:h-5" />
              Shortlist
            </TabsTrigger>
            <TabsTrigger
              value="explore"
              className="data-[state=active]:bg-rosegold data-[state=active]:text-white flex items-center justify-center gap-1.5 text-sm sm:text-base px-2 py-2.5 sm:py-3 min-h-[44px]"
            >
              <Search className="w-4 h-4 sm:w-5 sm:h-5" />
              Explore
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Overview content is already displayed above */}
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <AgentProfile />
          </TabsContent>

          <TabsContent value="shortlist" className="space-y-6">
            <AgentShortlist />
          </TabsContent>

          <TabsContent value="explore" className="space-y-6">
            <AgentExplore />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AgentDashboard;
