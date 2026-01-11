import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  TrendingUp, Eye, MessageCircle, Heart, DollarSign, Calendar,
  BarChart3, PieChart, Activity, Target, Users, Clock, Star
} from 'lucide-react';

interface TransferPerformanceAnalyticsProps {
  teamId?: string;
  agentId?: string;
}

interface AnalyticsData {
  totalPitches: number;
  activePitches: number;
  totalViews: number;
  totalMessages: number;
  totalShortlists: number;
  totalContracts: number;
  averageViewsPerPitch: number;
  averageMessagesPerPitch: number;
  conversionRate: number;
  topPerformingPitch?: {
    id: string;
    playerName: string;
    views: number;
    messages: number;
    shortlists: number;
  };
  monthlyStats: {
    month: string;
    pitches: number;
    views: number;
    messages: number;
    contracts: number;
  }[];
  positionBreakdown: {
    position: string;
    count: number;
    avgViews: number;
  }[];
}

const TransferPerformanceAnalytics: React.FC<TransferPerformanceAnalyticsProps> = ({
  teamId,
  agentId
}) => {
  const { profile } = useAuth();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [viewType, setViewType] = useState<'overview' | 'detailed' | 'comparison'>('overview');

  useEffect(() => {
    if (profile?.id) {
      fetchAnalyticsData();
    }
  }, [profile?.id, timeRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const userId = teamId || agentId || profile?.id;
      if (!userId) return;

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      switch (timeRange) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
      }

      // Fetch pitches data
      let pitchesQuery = supabase
        .from('transfer_pitches')
        .select('*')
        .gte('created_at', startDate.toISOString());

      if (teamId) {
        pitchesQuery = pitchesQuery.eq('team_id', teamId);
      } else if (agentId) {
        // For agents, we need to get pitches they've interacted with
        pitchesQuery = pitchesQuery.in('id', await getAgentInteractedPitchIds(agentId));
      }

      const { data: pitches, error: pitchesError } = await pitchesQuery;
      if (pitchesError) throw pitchesError;

      // Fetch related data
      const pitchIds = pitches?.map(p => p.id) || [];
      
      // Get views, messages, shortlists, contracts
      const [viewsData, messagesData, shortlistsData, contractsData] = await Promise.all([
        getPitchViews(pitchIds),
        getPitchMessages(pitchIds),
        getPitchShortlists(pitchIds),
        getPitchContracts(pitchIds)
      ]);

      // Calculate analytics
      const data = calculateAnalytics(
        pitches || [],
        viewsData,
        messagesData,
        shortlistsData,
        contractsData,
        timeRange
      );

      setAnalyticsData(data);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAgentInteractedPitchIds = async (agentId: string): Promise<string[]> => {
    const { data: shortlists } = await supabase
      .from('shortlist')
      .select('pitch_id')
      .eq('agent_id', agentId);

    const { data: messages } = await supabase
      .from('messages')
      .select('pitch_id')
      .eq('sender_id', agentId);

    const pitchIds = new Set([
      ...(shortlists?.map(s => s.pitch_id) || []),
      ...(messages?.map(m => m.pitch_id).filter(Boolean) || [])
    ]);

    return Array.from(pitchIds);
  };

  const getPitchViews = async (pitchIds: string[]) => {
    if (pitchIds.length === 0) return [];
    
    const { data, error } = await supabase
      .from('transfer_pitches')
      .select('id, view_count')
      .in('id', pitchIds);

    return error ? [] : (data || []);
  };

  const getPitchMessages = async (pitchIds: string[]) => {
    if (pitchIds.length === 0) return [];
    
    const { data, error } = await supabase
      .from('messages')
      .select('pitch_id')
      .in('pitch_id', pitchIds);

    return error ? [] : (data || []);
  };

  const getPitchShortlists = async (pitchIds: string[]) => {
    if (pitchIds.length === 0) return [];
    
    const { data, error } = await supabase
      .from('shortlist')
      .select('pitch_id')
      .in('pitch_id', pitchIds);

    return error ? [] : (data || []);
  };

  const getPitchContracts = async (pitchIds: string[]) => {
    if (pitchIds.length === 0) return [];
    
    const { data, error } = await supabase
      .from('contracts')
      .select('pitch_id')
      .in('pitch_id', pitchIds);

    return error ? [] : (data || []);
  };

  const calculateAnalytics = (
    pitches: any[],
    viewsData: any[],
    messagesData: any[],
    shortlistsData: any[],
    contractsData: any[],
    timeRange: string
  ): AnalyticsData => {
    const totalPitches = pitches.length;
    const activePitches = pitches.filter(p => p.status === 'active').length;
    
    const totalViews = viewsData.reduce((sum, v) => sum + (v.view_count || 0), 0);
    const totalMessages = messagesData.length;
    const totalShortlists = shortlistsData.length;
    const totalContracts = contractsData.length;

    const averageViewsPerPitch = totalPitches > 0 ? totalViews / totalPitches : 0;
    const averageMessagesPerPitch = totalPitches > 0 ? totalMessages / totalPitches : 0;
    const conversionRate = totalPitches > 0 ? (totalContracts / totalPitches) * 100 : 0;

    // Find top performing pitch
    const pitchPerformance = pitches.map(pitch => {
      const views = viewsData.find(v => v.id === pitch.id)?.view_count || 0;
      const messages = messagesData.filter(m => m.pitch_id === pitch.id).length;
      const shortlists = shortlistsData.filter(s => s.pitch_id === pitch.id).length;
      
      return {
        id: pitch.id,
        playerName: pitch.players?.full_name || 'Unknown',
        views,
        messages,
        shortlists,
        score: (views * 0.3) + (messages * 0.5) + (shortlists * 0.2)
      };
    });

    const topPerformingPitch = pitchPerformance
      .sort((a, b) => b.score - a.score)[0];

    // Generate monthly stats
    const monthlyStats = generateMonthlyStats(pitches, timeRange);

    // Position breakdown
    const positionBreakdown = generatePositionBreakdown(pitches, viewsData);

    return {
      totalPitches,
      activePitches,
      totalViews,
      totalMessages,
      totalShortlists,
      totalContracts,
      averageViewsPerPitch: Math.round(averageViewsPerPitch * 100) / 100,
      averageMessagesPerPitch: Math.round(averageMessagesPerPitch * 100) / 100,
      conversionRate: Math.round(conversionRate * 100) / 100,
      topPerformingPitch,
      monthlyStats,
      positionBreakdown
    };
  };

  const generateMonthlyStats = (pitches: any[], timeRange: string) => {
    const months = [];
    const currentDate = new Date();
    
    let monthsToShow = 6;
    if (timeRange === '7d') monthsToShow = 1;
    else if (timeRange === '30d') monthsToShow = 1;
    else if (timeRange === '90d') monthsToShow = 3;
    else if (timeRange === '1y') monthsToShow = 12;

    for (let i = monthsToShow - 1; i >= 0; i--) {
      const date = new Date(currentDate);
      date.setMonth(date.getMonth() - i);
      months.push({
        month: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        pitches: 0,
        views: 0,
        messages: 0,
        contracts: 0
      });
    }

    // This is a simplified version - in a real app you'd aggregate data by month
    return months;
  };

  const generatePositionBreakdown = (pitches: any[], viewsData: any[]) => {
    const positions: { [key: string]: { count: number; totalViews: number } } = {};
    
    pitches.forEach(pitch => {
      const position = pitch.players?.position || 'Unknown';
      const views = viewsData.find(v => v.id === pitch.id)?.view_count || 0;
      
      if (!positions[position]) {
        positions[position] = { count: 0, totalViews: 0 };
      }
      
      positions[position].count++;
      positions[position].totalViews += views;
    });

    return Object.entries(positions).map(([position, data]) => ({
      position,
      count: data.count,
      avgViews: Math.round(data.totalViews / data.count)
    }));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-700 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analyticsData) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-400">
            <BarChart3 className="w-12 h-12 mx-auto mb-3" />
            <p>No analytics data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Transfer Performance Analytics</h2>
          <p className="text-gray-400">Track your transfer pitch performance and engagement</p>
        </div>
        
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>

          <Select value={viewType} onValueChange={(value: any) => setViewType(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="overview">Overview</SelectItem>
              <SelectItem value="detailed">Detailed</SelectItem>
              <SelectItem value="comparison">Comparison</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Pitches</p>
                <p className="text-2xl font-bold text-white">{analyticsData.totalPitches}</p>
                <p className="text-xs text-gray-500">
                  {analyticsData.activePitches} active
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                <Target className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Views</p>
                <p className="text-2xl font-bold text-white">{analyticsData.totalViews}</p>
                <p className="text-xs text-gray-500">
                  {analyticsData.averageViewsPerPitch} avg per pitch
                </p>
              </div>
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                <Eye className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Engagement</p>
                <p className="text-2xl font-bold text-white">{analyticsData.totalMessages}</p>
                <p className="text-xs text-gray-500">
                  {analyticsData.totalShortlists} shortlisted
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Success Rate</p>
                <p className="text-2xl font-bold text-white">{analyticsData.conversionRate}%</p>
                <p className="text-xs text-gray-500">
                  {analyticsData.totalContracts} contracts
                </p>
              </div>
              <div className="w-12 h-12 bg-rosegold/20 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-rosegold" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Pitch */}
      {analyticsData.topPerformingPitch && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-400" />
              Top Performing Pitch
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {analyticsData.topPerformingPitch.playerName}
                </h3>
                <p className="text-gray-400">Best performing transfer pitch</p>
              </div>
              <div className="flex gap-6 text-center">
                <div>
                  <p className="text-2xl font-bold text-blue-400">
                    {analyticsData.topPerformingPitch.views}
                  </p>
                  <p className="text-xs text-gray-400">Views</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-400">
                    {analyticsData.topPerformingPitch.messages}
                  </p>
                  <p className="text-xs text-gray-400">Messages</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-400">
                    {analyticsData.topPerformingPitch.shortlists}
                  </p>
                  <p className="text-xs text-gray-400">Shortlists</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Position Breakdown */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            Performance by Position
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analyticsData.positionBreakdown.map((position) => (
              <div key={position.position} className="p-4 bg-gray-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-white">{position.position}</h4>
                  <Badge variant="outline" className="text-blue-400 border-blue-400">
                    {position.count} pitches
                  </Badge>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-400">
                    {position.avgViews}
                  </p>
                  <p className="text-xs text-gray-400">Average views</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Monthly Trends */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-green-400" />
            Monthly Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {analyticsData.monthlyStats.map((month, index) => (
              <div key={index} className="p-4 bg-gray-700 rounded-lg text-center">
                <h4 className="font-medium text-white mb-2">{month.month}</h4>
                <div className="space-y-1">
                  <p className="text-sm text-gray-400">
                    {month.pitches} pitches
                  </p>
                  <p className="text-sm text-gray-400">
                    {month.views} views
                  </p>
                  <p className="text-sm text-gray-400">
                    {month.messages} messages
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TransferPerformanceAnalytics;
