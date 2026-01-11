
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface FilterState {
  position?: string;
  ageRange: [number, number];
  priceRange: [number, number];
  heightRange?: [number, number];
  foot?: 'left' | 'right' | 'both';
  contractExpiring?: boolean;
  freeAgents?: boolean;
  nationality?: string;
  sortBy: 'newest' | 'expiring' | 'highest_value' | 'most_viewed' | 'most_shortlisted';
  viewMode: 'all' | 'saved_filters';
}

interface SavedFilter {
  id: string;
  name: string;
  filters: FilterState;
  createdAt: string;
}

interface MarketSnapshot {
  avgAskingPrice: number;
  avgMarketValue: number;
  activePitches: number;
  expiringPitches: number;
  trendingPositions: Array<{
    position: string;
    count: number;
    trend: 'up' | 'down' | 'stable';
  }>;
}

interface MarketTrend {
  position: string;
  avgPrice: number;
  avgMarketValue: number;
  totalPitches: number;
  priceChange: number;
  demandLevel: 'high' | 'medium' | 'low';
}

interface ActivityLog {
  id: string;
  type: 'pitch_created' | 'request_posted' | 'player_shortlisted' | 'message_sent';
  description: string;
  timestamp: string;
  metadata?: any;
}

export const useEnhancedExplore = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  
  const [filters, setFilters] = useState<FilterState>({
    ageRange: [16, 40],
    priceRange: [0, 10000000],
    sortBy: 'newest',
    viewMode: 'all'
  });
  
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [marketSnapshot, setMarketSnapshot] = useState<MarketSnapshot>({
    avgAskingPrice: 0,
    avgMarketValue: 0,
    activePitches: 0,
    expiringPitches: 0,
    trendingPositions: []
  });
  
  const [marketTrends, setMarketTrends] = useState<MarketTrend[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch market snapshot data
  const fetchMarketSnapshot = useCallback(async () => {
    try {
      // Get active pitches count
      const { count: activePitches } = await supabase
        .from('transfer_pitches')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString());

      // Get expiring pitches (within 7 days)
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      
      const { count: expiringPitches } = await supabase
        .from('transfer_pitches')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .lte('expires_at', sevenDaysFromNow.toISOString())
        .gt('expires_at', new Date().toISOString());

      // Get average prices and trending positions
      const { data: pitchData } = await supabase
        .from('transfer_pitches')
        .select(`
          asking_price,
          players!transfer_pitches_player_id_fkey(
            position,
            market_value
          )
        `)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString());

      let avgAskingPrice = 0;
      let avgMarketValue = 0;
      const positionCounts: Record<string, number> = {};

      if (pitchData) {
        const validPrices = pitchData.filter(p => p.asking_price).map(p => p.asking_price);
        const validMarketValues = pitchData.filter(p => p.players?.market_value).map(p => p.players.market_value);
        
        avgAskingPrice = validPrices.length > 0 ? validPrices.reduce((a, b) => a + b, 0) / validPrices.length : 0;
        avgMarketValue = validMarketValues.length > 0 ? validMarketValues.reduce((a, b) => a + b, 0) / validMarketValues.length : 0;

        // Count positions
        pitchData.forEach(p => {
          if (p.players?.position) {
            positionCounts[p.players.position] = (positionCounts[p.players.position] || 0) + 1;
          }
        });
      }

      // Create trending positions (top 5)
      const trendingPositions = Object.entries(positionCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([position, count]) => ({
          position,
          count,
          trend: 'stable' as const // TODO: Calculate actual trend
        }));

      setMarketSnapshot({
        avgAskingPrice,
        avgMarketValue,
        activePitches: activePitches || 0,
        expiringPitches: expiringPitches || 0,
        trendingPositions
      });

    } catch (error) {
      console.error('Error fetching market snapshot:', error);
    }
  }, []);

  // Fetch market trends
  const fetchMarketTrends = useCallback(async () => {
    try {
      const { data: trendsData } = await supabase
        .from('transfer_pitches')
        .select(`
          asking_price,
          view_count,
          shortlist_count,
          players!transfer_pitches_player_id_fkey(
            position,
            market_value
          )
        `)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString());

      if (trendsData) {
        const positionStats: Record<string, {
          prices: number[];
          marketValues: number[];
          totalPitches: number;
          totalViews: number;
          totalShortlists: number;
        }> = {};

        trendsData.forEach(pitch => {
          const position = pitch.players?.position;
          if (position) {
            if (!positionStats[position]) {
              positionStats[position] = {
                prices: [],
                marketValues: [],
                totalPitches: 0,
                totalViews: 0,
                totalShortlists: 0
              };
            }

            if (pitch.asking_price) positionStats[position].prices.push(pitch.asking_price);
            if (pitch.players.market_value) positionStats[position].marketValues.push(pitch.players.market_value);
            positionStats[position].totalPitches++;
            positionStats[position].totalViews += pitch.view_count || 0;
            positionStats[position].totalShortlists += pitch.shortlist_count || 0;
          }
        });

        const trends = Object.entries(positionStats)
          .map(([position, stats]) => ({
            position,
            avgPrice: stats.prices.length > 0 ? stats.prices.reduce((a, b) => a + b, 0) / stats.prices.length : 0,
            avgMarketValue: stats.marketValues.length > 0 ? stats.marketValues.reduce((a, b) => a + b, 0) / stats.marketValues.length : 0,
            totalPitches: stats.totalPitches,
            priceChange: Math.random() * 20 - 10, // TODO: Calculate actual price change
            demandLevel: (stats.totalViews + stats.totalShortlists > 50 ? 'high' : 
                         stats.totalViews + stats.totalShortlists > 20 ? 'medium' : 'low') as 'high' | 'medium' | 'low'
          }))
          .sort((a, b) => b.totalPitches - a.totalPitches)
          .slice(0, 8);

        setMarketTrends(trends);
      }
    } catch (error) {
      console.error('Error fetching market trends:', error);
    }
  }, []);

  // Fetch recent activity
  const fetchRecentActivity = useCallback(async () => {
    try {
      const activities: ActivityLog[] = [];

      // Get recent pitches
      const { data: recentPitches } = await supabase
        .from('transfer_pitches')
        .select(`
          id,
          created_at,
          players!transfer_pitches_player_id_fkey(full_name),
          teams(team_name)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentPitches) {
        recentPitches.forEach(pitch => {
          activities.push({
            id: `pitch-${pitch.id}`,
            type: 'pitch_created',
            description: `${pitch.teams?.team_name} posted ${pitch.players?.full_name} for transfer`,
            timestamp: pitch.created_at
          });
        });
      }

      // Get recent agent requests
      const { data: recentRequests } = await supabase
        .from('agent_requests')
        .select(`
          id,
          created_at,
          title,
          agents!inner(agency_name)
        `)
        .eq('is_public', true)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentRequests) {
        recentRequests.forEach(request => {
          activities.push({
            id: `request-${request.id}`,
            type: 'request_posted',
            description: `${request.agents?.agency_name} posted: "${request.title}"`,
            timestamp: request.created_at
          });
        });
      }

      // Sort all activities by timestamp
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      setRecentActivity(activities.slice(0, 10));
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    }
  }, []);

  // Load saved filters
  const loadSavedFilters = useCallback(async () => {
    if (!profile?.id) return;

    try {
      const savedFiltersJson = localStorage.getItem(`saved-filters-${profile.id}`);
      if (savedFiltersJson) {
        setSavedFilters(JSON.parse(savedFiltersJson));
      }
    } catch (error) {
      console.error('Error loading saved filters:', error);
    }
  }, [profile?.id]);

  // Save filter
  const saveFilter = useCallback(async (name: string, filterState: FilterState) => {
    if (!profile?.id) return;

    try {
      const newFilter: SavedFilter = {
        id: Date.now().toString(),
        name,
        filters: filterState,
        createdAt: new Date().toISOString()
      };

      const updatedFilters = [...savedFilters, newFilter];
      setSavedFilters(updatedFilters);
      localStorage.setItem(`saved-filters-${profile.id}`, JSON.stringify(updatedFilters));
      
      toast({
        title: "Filter Saved",
        description: `"${name}" has been saved successfully.`
      });
    } catch (error) {
      console.error('Error saving filter:', error);
      toast({
        title: "Error",
        description: "Failed to save filter.",
        variant: "destructive"
      });
    }
  }, [profile?.id, savedFilters, toast]);

  // Load filter
  const loadFilter = useCallback((filter: SavedFilter) => {
    setFilters(filter.filters);
    toast({
      title: "Filter Loaded",
      description: `"${filter.name}" filter has been applied.`
    });
  }, [toast]);

  // Delete filter
  const deleteFilter = useCallback(async (filterId: string) => {
    if (!profile?.id) return;

    try {
      const updatedFilters = savedFilters.filter(f => f.id !== filterId);
      setSavedFilters(updatedFilters);
      localStorage.setItem(`saved-filters-${profile.id}`, JSON.stringify(updatedFilters));
      
      toast({
        title: "Filter Deleted",
        description: "Filter has been removed successfully."
      });
    } catch (error) {
      console.error('Error deleting filter:', error);
      toast({
        title: "Error",
        description: "Failed to delete filter.",
        variant: "destructive"
      });
    }
  }, [profile?.id, savedFilters, toast]);

  // Initialize data
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      await Promise.all([
        fetchMarketSnapshot(),
        fetchMarketTrends(),
        fetchRecentActivity(),
        loadSavedFilters()
      ]);
      setLoading(false);
    };

    if (profile?.id) {
      initializeData();
    }
  }, [profile?.id, fetchMarketSnapshot, fetchMarketTrends, fetchRecentActivity, loadSavedFilters]);

  return {
    filters,
    setFilters,
    savedFilters,
    marketSnapshot,
    marketTrends,
    recentActivity,
    loading,
    saveFilter,
    loadFilter,
    deleteFilter,
    refetchData: () => {
      fetchMarketSnapshot();
      fetchMarketTrends();
      fetchRecentActivity();
    }
  };
};
