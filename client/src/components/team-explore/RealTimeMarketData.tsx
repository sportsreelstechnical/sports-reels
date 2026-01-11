
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, TrendingDown, Users, Target, Eye, MessageSquare } from 'lucide-react';

interface MarketData {
  totalActivePitches: number;
  totalPitchViews: number;
  averageAskingPrice: number;
  topPositions: Array<{ position: string; count: number }>;
  recentActivity: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
  }>;
  marketTrends: {
    pitchesThisWeek: number;
    pitchesLastWeek: number;
    viewsThisWeek: number;
    viewsLastWeek: number;
  };
}

const RealTimeMarketData = () => {
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMarketData = async () => {
    try {
      // Fetch active pitches with player and team data
      const { data: pitches } = await supabase
        .from('transfer_pitches')
        .select(`
          id,
          asking_price,
          view_count,
          message_count,
          created_at,
          currency,
          players!transfer_pitches_player_id_fkey(
            full_name,
            position,
            citizenship
          ),
          teams(
            team_name,
            country
          )
        `)
        .eq('status', 'active')
        .gte('expires_at', new Date().toISOString());

      if (!pitches) return;

      // Calculate market statistics
      const totalPitchViews = pitches.reduce((sum, pitch) => sum + (pitch.view_count || 0), 0);
      
      // Calculate average asking price (convert all to USD for comparison)
      const pitchesWithPrice = pitches.filter(p => p.asking_price && p.asking_price > 0);
      const averageAskingPrice = pitchesWithPrice.length > 0 
        ? pitchesWithPrice.reduce((sum, p) => sum + (p.asking_price || 0), 0) / pitchesWithPrice.length
        : 0;

      // Count positions
      const positionCounts: { [key: string]: number } = {};
      pitches.forEach(pitch => {
        const position = pitch.players?.position || 'Unknown';
        positionCounts[position] = (positionCounts[position] || 0) + 1;
      });

      const topPositions = Object.entries(positionCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([position, count]) => ({ position, count }));

      // Calculate weekly trends
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

      const pitchesThisWeek = pitches.filter(p => 
        new Date(p.created_at) >= oneWeekAgo
      ).length;

      const { data: lastWeekPitches } = await supabase
        .from('transfer_pitches')
        .select('id, view_count')
        .gte('created_at', twoWeeksAgo.toISOString())
        .lt('created_at', oneWeekAgo.toISOString());

      const pitchesLastWeek = lastWeekPitches?.length || 0;

      // Recent activity from actual data
      const recentActivity = pitches
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5)
        .map(pitch => ({
          id: pitch.id,
          type: 'pitch_created',
          description: `New pitch for ${pitch.players?.position || 'Player'} from ${pitch.teams?.team_name || 'Unknown Team'}`,
          timestamp: pitch.created_at
        }));

      setMarketData({
        totalActivePitches: pitches.length,
        totalPitchViews,
        averageAskingPrice,
        topPositions,
        recentActivity,
        marketTrends: {
          pitchesThisWeek,
          pitchesLastWeek,
          viewsThisWeek: totalPitchViews, // Simplified for now
          viewsLastWeek: 0 // Would need historical data
        }
      });

    } catch (error) {
      console.error('Error fetching market data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketData();

    // Set up real-time subscription
    const channel = supabase
      .channel('market_data')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'transfer_pitches' },
        () => fetchMarketData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-white">Market Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-700 rounded w-3/4"></div>
            <div className="h-4 bg-gray-700 rounded w-1/2"></div>
            <div className="h-4 bg-gray-700 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!marketData) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-white">Market Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400">No market data available</p>
        </CardContent>
      </Card>
    );
  }

  const trendChange = marketData.marketTrends.pitchesThisWeek - marketData.marketTrends.pitchesLastWeek;
  const trendPercentage = marketData.marketTrends.pitchesLastWeek > 0 
    ? ((trendChange / marketData.marketTrends.pitchesLastWeek) * 100).toFixed(1)
    : '0';

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Live Market Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 rounded-lg bg-gray-800/50">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Target className="w-4 h-4 text-rosegold" />
              <span className="text-sm font-medium text-gray-300">Active Pitches</span>
            </div>
            <p className="text-2xl font-bold text-white">{marketData.totalActivePitches}</p>
            <div className="flex items-center justify-center gap-1 mt-1">
              {trendChange >= 0 ? (
                <TrendingUp className="w-3 h-3 text-green-400" />
              ) : (
                <TrendingDown className="w-3 h-3 text-red-400" />
              )}
              <span className={`text-xs ${trendChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {trendPercentage}% vs last week
              </span>
            </div>
          </div>

          <div className="text-center p-3 rounded-lg bg-gray-800/50">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Eye className="w-4 h-4 text-bright-pink" />
              <span className="text-sm font-medium text-gray-300">Total Views</span>
            </div>
            <p className="text-2xl font-bold text-white">{marketData.totalPitchViews.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">
              Avg: {Math.round(marketData.totalPitchViews / Math.max(marketData.totalActivePitches, 1))} per pitch
            </p>
          </div>
        </div>

        {/* Average Price */}
        {marketData.averageAskingPrice > 0 && (
          <div className="text-center p-3 rounded-lg bg-gray-800/50">
            <p className="text-sm font-medium text-gray-300 mb-1">Average Asking Price</p>
            <p className="text-xl font-bold text-rosegold">
              ${marketData.averageAskingPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          </div>
        )}

        {/* Top Positions */}
        <div>
          <h4 className="text-sm font-semibold text-white mb-3">Most In-Demand Positions</h4>
          <div className="space-y-2">
            {marketData.topPositions.map((pos, index) => (
              <div key={pos.position} className="flex items-center justify-between">
                <span className="text-sm text-gray-300">{pos.position}</span>
                <Badge variant="outline" className="text-xs">
                  {pos.count} pitches
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h4 className="text-sm font-semibold text-white mb-3">Recent Market Activity</h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {marketData.recentActivity.map((activity) => (
              <div key={activity.id} className="text-xs text-gray-400 p-2 rounded bg-gray-800/30">
                <p className="truncate">{activity.description}</p>
                <p className="text-gray-500 mt-1">
                  {new Date(activity.timestamp).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RealTimeMarketData;
