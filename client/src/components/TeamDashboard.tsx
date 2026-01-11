import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useTeamProfileCompletion } from '@/hooks/useTeamProfileCompletion';
import {
  Users,
  Video,
  Trophy,
  MessageSquare,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Star,
  PlayCircle,
  Eye,
  Calendar,
  Target,
  BarChart3
} from 'lucide-react';
import { Link } from 'react-router-dom';
import ProfileCompletionStatus from './ProfileCompletionStatus';

interface DashboardStats {
  totalPlayers: number;
  totalVideos: number;
  activePitches: number;
  totalMessages: number;
  recentMatches: number;
  pendingAnalysis: number;
  completedAnalysis: number;
  pitchViews: number;
}

interface RecentActivity {
  id: string;
  type: 'video_upload' | 'player_added' | 'pitch_created' | 'message_received' | 'ai_analysis';
  title: string;
  description: string;
  timestamp: string;
  status?: string;
}

const TeamDashboard = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const { completionStatus, loading: completionLoading } = useTeamProfileCompletion();

  const [stats, setStats] = useState<DashboardStats>({
    totalPlayers: 0,
    totalVideos: 0,
    activePitches: 0,
    totalMessages: 0,
    recentMatches: 0,
    pendingAnalysis: 0,
    completedAnalysis: 0,
    pitchViews: 0
  });

  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamInfo, setTeamInfo] = useState<any>(null);

  useEffect(() => {
    if (profile?.user_type === 'team') {
      fetchDashboardData();
    }
  }, [profile]);

  const fetchDashboardData = async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);

      // Get team information
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('profile_id', profile.id)
        .maybeSingle(); // Changed from .single() to .maybeSingle()

      if (teamError) {
        console.error('Error fetching team:', teamError);
        return;
      }

      let currentTeam = team;
      let currentTeamId = team?.id;

      if (!team) {
        console.log('No team found, creating default team...');
        // Create a default team for this profile
        const { data: newTeam, error: createError } = await supabase
          .from('teams')
          .insert({
            team_name: 'My Team',
            country: 'United States',
            sport_type: 'football',
            profile_id: profile.id
          })
          .select('*')
          .single();

        if (createError) {
          console.error('Error creating team:', createError);
          return;
        }

        currentTeam = newTeam;
        currentTeamId = newTeam.id;
        setTeamInfo(newTeam);
        console.log('Created default team:', newTeam);
      } else {
        setTeamInfo(team);
      }

      if (!currentTeamId) {
        console.error('No team ID available');
        return;
      }

      console.log('Fetching statistics for team ID:', currentTeamId);

      // Fetch all statistics in parallel
      const [
        playersResult,
        videosResult,
        pitchesResult,
        messagesResult,
        matchesResult,
        analysisResult
      ] = await Promise.all([
        // Players count
        supabase
          .from('players')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', currentTeamId),

        // Videos count and analysis status
        supabase
          .from('videos')
          .select('id, ai_analysis_status, created_at, title')
          .eq('team_id', currentTeamId),

        // Active pitches and their statistics
        supabase
          .from('transfer_pitches')
          .select('id, view_count, message_count, status, expires_at, created_at, player_id')
          .eq('team_id', currentTeamId)
          .eq('status', 'active')
          .gte('expires_at', new Date().toISOString()),

        // Messages count
        supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('receiver_id', profile.id),

        // Match videos count
        supabase
          .from('match_videos')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', currentTeamId),

        // AI analysis status
        supabase
          .from('videos')
          .select('ai_analysis_status')
          .eq('team_id', currentTeamId)
      ]);

      // Log results for debugging
      console.log('Query results:', {
        players: playersResult,
        videos: videosResult,
        pitches: pitchesResult,
        messages: messagesResult,
        matches: matchesResult,
        analysis: analysisResult
      });

      // Process results
      const totalPlayers = playersResult.count || 0;
      const videos = videosResult.data || [];
      const totalVideos = videos.length;
      const activePitches = pitchesResult.data || [];
      const totalMessages = messagesResult.count || 0;
      const recentMatches = matchesResult.count || 0;

      // Calculate pitch views
      const pitchViews = activePitches.reduce((sum, pitch) => sum + (pitch.view_count || 0), 0);

      // AI Analysis statistics
      const pendingAnalysis = videos.filter(v =>
        v.ai_analysis_status === 'pending' || !v.ai_analysis_status
      ).length;
      const completedAnalysis = videos.filter(v =>
        v.ai_analysis_status === 'completed'
      ).length;

      setStats({
        totalPlayers,
        totalVideos,
        activePitches: activePitches.length,
        totalMessages,
        recentMatches,
        pendingAnalysis,
        completedAnalysis,
        pitchViews
      });

      // Build recent activity from real data
      const activities: RecentActivity[] = [];

      // Recent videos
      const recentVideos = videos
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 3);

      recentVideos.forEach(video => {
        activities.push({
          id: `video_${video.id}`,
          type: video.ai_analysis_status === 'completed' ? 'ai_analysis' : 'video_upload',
          title: video.ai_analysis_status === 'completed' ? 'AI Analysis Completed' : 'Video Uploaded',
          description: video.title,
          timestamp: video.created_at,
          status: video.ai_analysis_status
        });
      });

      // Recent pitches
      const recentPitches = activePitches
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 2);

      for (const pitch of recentPitches) {
        const { data: player } = await supabase
          .from('players')
          .select('full_name')
          .eq('id', pitch.player_id)
          .maybeSingle(); // Changed from .single() to .maybeSingle()

        activities.push({
          id: `pitch_${pitch.id}`,
          type: 'pitch_created',
          title: 'Transfer Pitch Created',
          description: `Pitch for ${player?.full_name || 'Player'}`,
          timestamp: pitch.created_at,
          status: pitch.status
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
      case 'video_upload':
        return <Video className="w-4 h-4" />;
      case 'player_added':
        return <Users className="w-4 h-4" />;
      case 'pitch_created':
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
      case 'video_upload':
        return 'text-blue-400';
      case 'player_added':
        return 'text-green-400';
      case 'pitch_created':
        return 'text-purple-400';
      case 'message_received':
        return 'text-yellow-400';
      case 'ai_analysis':
        return 'text-rosegold';
      default:
        return 'text-gray-400';
    }
  };

  if (profile?.user_type !== 'team') {
    return (
      <div className="min-h-screen bg-background p-6">
        <Card className="max-w-md mx-auto mt-20 border-red-500">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-bold text-white mb-2">Access Restricted</h2>
            <p className="text-gray-400">
              This dashboard is only available for team accounts.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading || completionLoading) {
    return (
      <div className="min-h-screen bg-background p-3 sm:p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4 sm:space-y-6">
            <div className="h-6 sm:h-8 bg-gray-500 rounded w-1/2 sm:w-1/3"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-28 sm:h-32 bg-gray-500 rounded-lg"></div>
              ))}
            </div>
          </div>
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
              Team Dashboard
            </h1>
            {teamInfo && (
              <p className="text-gray-400 mt-1 text-xs sm:text-sm truncate">
                {teamInfo.team_name} • {teamInfo.league || 'No League Set'}
              </p>
            )}
          </div>

          {teamInfo?.logo_url && (
            <div className="flex items-center gap-4 flex-shrink-0">
              <img
                src={teamInfo.logo_url}
                alt="Team Logo"
                className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 object-cover rounded-lg border-2 border-gray-600"
              />
            </div>
          )}
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          {/* Players */}
          <Card className='bg-gradient-to-tr  from-purple-700/60 to-purple-600 border-0'>
            <CardContent className="p-4 sm:p-5 md:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm sm:text-base font-medium text-gray-400 truncate">Total Players</p>
                  <p className="text-2xl sm:text-3xl font-bold text-white">{stats.totalPlayers}</p>
                </div>
                <Users className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-purple-900 flex-shrink-0 ml-2" />
              </div>
              <div className="mt-3 sm:mt-4">
                <Link to="/players">
                  <Button variant="outline" size="sm" className="w-full bg-gradient-to-tr  from-purple-800/60 to-purple-900 border-0 h-9 sm:h-10 text-sm sm:text-base">
                    Manage Players
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Videos */}
          <Card className="bg-gradient-to-tr  from-blue-700/60 to-blue-600 border-0">
            <CardContent className="p-4 sm:p-5 md:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm sm:text-base font-medium text-gray-400 truncate">Total Videos</p>
                  <p className="text-2xl sm:text-3xl font-bold text-white">{stats.totalVideos}</p>
                </div>
                <Video className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-blue-900 flex-shrink-0 ml-2" />
              </div>
              <div className="mt-3 sm:mt-4">
                <Link to="/videos">
                  <Button variant="outline" size="sm" className="w-full bg-gradient-to-tr  from-blue-800/60 to-blue-900 border-0 h-9 sm:h-10 text-sm sm:text-base">
                    Manage Videos
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Active Pitches */}
          <Card className="bg-gradient-to-tr  from-orange-700/60 to-orange-600 border-0">
            <CardContent className="p-4 sm:p-5 md:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm sm:text-base font-medium text-gray-400 truncate">Active Pitches</p>
                  <p className="text-2xl sm:text-3xl font-bold text-white">{stats.activePitches}</p>
                </div>
                <Target className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-orange-900 flex-shrink-0 ml-2" />
              </div>
              <div className="mt-3 sm:mt-4">
                <Link to="/explore">
                  <Button variant="outline" size="sm" className="w-full bg-gradient-to-tr  from-orange-800/60 to-orange-900 border-0 h-9 sm:h-10 text-sm sm:text-base">
                    Explore Hub
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Messages */}
          <Card className="bg-gradient-to-tr  from-green-700/60 to-green-600 border-0">
            <CardContent className="p-4 sm:p-5 md:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm sm:text-base font-medium text-gray-400 truncate">Total Messages</p>
                  <p className="text-2xl sm:text-3xl font-bold text-white">{stats.totalMessages}</p>
                </div>
                <MessageSquare className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-green-900 flex-shrink-0 ml-2" />
              </div>
              <div className="mt-3 sm:mt-4">
                <Link to="/messages">
                  <Button variant="outline" size="sm" className="w-full bg-gradient-to-tr  from-green-800/60 to-green-900 border-0 h-9 sm:h-10 text-sm sm:text-base">
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
                    Start by uploading videos or adding players
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
              <Link to="/videos" className="block">
                <Button variant="outline" className="w-full justify-start h-10 sm:h-11 text-sm sm:text-base">
                  <Video className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Upload Videos
                </Button>
              </Link>

              <Link to="/players" className="block">
                <Button variant="outline" className="w-full justify-start h-10 sm:h-11 text-sm sm:text-base">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Add Players
                </Button>
              </Link>

              <Link to="/team-explore?tab=create" className="block">
                <Button variant="outline" className="w-full justify-start h-10 sm:h-11 text-sm sm:text-base">
                  <Target className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Create Pitch
                </Button>
              </Link>

              <Link to="/messages" className="block">
                <Button variant="outline" className="w-full justify-start h-10 sm:h-11 text-sm sm:text-base">
                  <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Check Messages
                </Button>
              </Link>

              <Link to="/team-explore?tab=analytics" className="block">
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

        {/* Profile Completion Notice */}

      </div>
    </div>
  );
};

export default TeamDashboard;
