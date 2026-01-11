import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useToast } from '@/hooks/use-toast';
import {
  Search, Filter, Grid3X3, List, Eye, MessageCircle, Heart, Star,
  TrendingUp, MapPin, Calendar, DollarSign, User, Video, Target,
  Sparkles, Zap, Filter as FilterIcon, X
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useSportData } from '@/hooks/useSportData';

interface EnhancedAgentDiscoveryProps {
  initialSearch?: string;
}

interface TransferPitch {
  id: string;
  asking_price: number;
  currency: string;
  transfer_type: string;
  deal_stage: string;
  expires_at: string;
  created_at: string;
  view_count: number;
  message_count: number;
  shortlist_count: number;
  is_international: boolean;
  description: string;
  tagged_videos: any[];
  players: {
    id: string;
    full_name: string;
    position: string;
    citizenship: string;
    photo_url?: string;
    age?: number;
    market_value?: number;
  };
  teams: {
    id: string;
    team_name: string;
    logo_url?: string;
    country: string;
    sport_type?: string;
  };
}

interface SmartFilter {
  position: string;
  priceRange: string;
  transferType: string;
  dealStage: string;
  teamCountry: string;
  hasVideos: boolean;
  isInternational: boolean;
  ageRange: string;
  marketValueRange: string;
}

const EnhancedAgentDiscovery: React.FC<EnhancedAgentDiscoveryProps> = ({ initialSearch }) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [pitches, setPitches] = useState<TransferPitch[]>([]);
  const [filteredPitches, setFilteredPitches] = useState<TransferPitch[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [agentSportType, setAgentSportType] = useState<string | null>(null);
  const [sportLoaded, setSportLoaded] = useState(false);
  const [shortlistedPitches, setShortlistedPitches] = useState<Set<string>>(new Set());
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState(initialSearch || '');
  
  // Smart filtering
  const [smartFilter, setSmartFilter] = useState<SmartFilter>({
    position: 'all',
    priceRange: 'all',
    transferType: 'all',
    dealStage: 'all',
    teamCountry: 'all',
    hasVideos: false,
    isInternational: false,
    ageRange: 'all',
    marketValueRange: 'all'
  });

  // AI Recommendations
  const [recommendedPitches, setRecommendedPitches] = useState<TransferPitch[]>([]);
  const [showRecommendations, setShowRecommendations] = useState(false);

  // Get sport-specific data
  const sportForData = agentSportType || 'football';
  const { positions } = useSportData(sportForData);
  const transferTypes = ['permanent', 'loan'];
  const dealStages = ['pitch', 'interest', 'discussion', 'expired'];
  const priceRanges = [
    { label: 'Under $100K', value: '0-100000' },
    { label: '$100K - $500K', value: '100000-500000' },
    { label: '$500K - $1M', value: '500000-1000000' },
    { label: '$1M - $5M', value: '1000000-5000000' },
    { label: 'Over $5M', value: '5000000-999999999' }
  ];
  const ageRanges = [
    { label: 'Under 18', value: '0-18' },
    { label: '18-21', value: '18-21' },
    { label: '22-25', value: '22-25' },
    { label: '26-30', value: '26-30' },
    { label: 'Over 30', value: '30-99' }
  ];
  const marketValueRanges = [
    { label: 'Under $500K', value: '0-500000' },
    { label: '$500K - $2M', value: '500000-2000000' },
    { label: '$2M - $10M', value: '2000000-10000000' },
    { label: 'Over $10M', value: '10000000-999999999' }
  ];

  // Get unique teams and countries for filtering
  const [availableTeams, setAvailableTeams] = useState<string[]>([]);
  const [availableCountries, setAvailableCountries] = useState<string[]>([]);

  useEffect(() => {
    if (!profile?.id) {
      setAgentSportType(null);
      setSportLoaded(true);
      setLoading(false);
      return;
    }

    const loadSportType = async () => {
      setSportLoaded(false);
      setLoading(true);
      await fetchAgentSportType();
    };

    loadSportType();
  }, [profile?.id]);

  useEffect(() => {
    if (!sportLoaded) return;

    if (!agentSportType) {
      setPitches([]);
      setFilteredPitches([]);
      setAvailableTeams([]);
      setAvailableCountries([]);
      setRecommendedPitches([]);
      setLoading(false);
      return;
    }

    fetchTransferPitches();
    fetchShortlistedPitches();
  }, [agentSportType, sportLoaded]);

  useEffect(() => {
    applySmartFilters();
  }, [pitches, searchTerm, smartFilter]);

  const fetchAgentSportType = async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase
        .from('agents')
        .select('sport_type')
        .eq('profile_id', profile.id)
        .single();

      if (error) {
        console.error('Error fetching agent sport type:', error);
        return;
      }

      if (data?.sport_type) {
        setAgentSportType(data.sport_type);
      } else {
        setAgentSportType(null);
      }
    } catch (error) {
      console.error('Error fetching agent sport type:', error);
      setAgentSportType(null);
    } finally {
      setSportLoaded(true);
    }
  };

  const fetchTransferPitches = async () => {
    if (!agentSportType) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('transfer_pitches')
        .select(`
          id,
          asking_price,
          currency,
          transfer_type,
          deal_stage,
          expires_at,
          created_at,
          view_count,
          message_count,
          shortlist_count,
          is_international,
          description,
          tagged_videos,
          players!transfer_pitches_player_id_fkey(
            id,
            full_name,
            position,
            citizenship,
            photo_url,
            date_of_birth,
            market_value
          ),
          teams(
            id,
            team_name,
            logo_url,
            country,
            sport_type
          )
        `)
        .eq('status', 'active')
        .eq('teams.sport_type', agentSportType)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Process data to add age calculation
      const processedPitches: TransferPitch[] = (data || []).map(pitch => ({
        ...pitch,
        tagged_videos: Array.isArray(pitch.tagged_videos) ? pitch.tagged_videos : [],
        players: {
          ...pitch.players,
          age: pitch.players.date_of_birth ?
            new Date().getFullYear() - new Date(pitch.players.date_of_birth).getFullYear() : undefined
        }
      }));

      setPitches(processedPitches);

      // Extract unique teams and countries for filtering
      const teams = [...new Set(processedPitches.map(p => p.teams?.team_name).filter(Boolean))].sort();
      const countries = [...new Set(processedPitches.map(p => p.teams?.country).filter(Boolean))].sort();
      
      setAvailableTeams(teams);
      setAvailableCountries(countries);

      // Generate AI recommendations
      generateAIRecommendations(processedPitches);
    } catch (error) {
      console.error('Error fetching transfer pitches:', error);
      toast({
        title: "Error",
        description: "Failed to load transfer pitches",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchShortlistedPitches = async () => {
    if (!profile?.id) return;

    try {
      const { data: agentData } = await supabase
        .from('agents')
        .select('id')
        .eq('profile_id', profile.id)
        .single();

      if (!agentData) return;

      const { data, error } = await supabase
        .from('shortlist')
        .select('pitch_id')
        .eq('agent_id', agentData.id);

      if (error) throw error;

      const shortlistedIds = new Set((data || []).map(item => item.pitch_id));
      setShortlistedPitches(shortlistedIds);
    } catch (error) {
      console.error('Error fetching shortlisted pitches:', error);
    }
  };

  const generateAIRecommendations = (allPitches: TransferPitch[]) => {
    // Simple AI logic based on agent preferences and market trends
    const recommendations = allPitches
      .filter(pitch => {
        // Prioritize pitches with videos
        if (pitch.tagged_videos.length > 0) return true;
        
        // Prioritize recent pitches
        const daysSinceCreation = Math.floor((Date.now() - new Date(pitch.created_at).getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceCreation <= 7) return true;
        
        // Prioritize pitches with high engagement
        if (pitch.view_count > 10 || pitch.message_count > 2) return true;
        
        return false;
      })
      .sort((a, b) => {
        // Sort by engagement score
        const scoreA = (a.view_count * 0.3) + (a.message_count * 0.5) + (a.shortlist_count * 0.2);
        const scoreB = (b.view_count * 0.3) + (b.message_count * 0.5) + (b.shortlist_count * 0.2);
        return scoreB - scoreA;
      })
      .slice(0, 6);

    setRecommendedPitches(recommendations);
  };

  const applySmartFilters = () => {
    let filtered = [...pitches];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(pitch =>
        pitch.players.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (pitch.teams?.team_name && pitch.teams.team_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        pitch.players.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pitch.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Position filter
    if (smartFilter.position !== 'all') {
      filtered = filtered.filter(pitch => pitch.players.position === smartFilter.position);
    }

    // Transfer type filter
    if (smartFilter.transferType !== 'all') {
      filtered = filtered.filter(pitch => pitch.transfer_type === smartFilter.transferType);
    }

    // Deal stage filter
    if (smartFilter.dealStage !== 'all') {
      filtered = filtered.filter(pitch => pitch.deal_stage === smartFilter.dealStage);
    }

    // Team filter
    if (smartFilter.teamCountry !== 'all') {
      filtered = filtered.filter(pitch => pitch.teams?.country === smartFilter.teamCountry);
    }

    // Price range filter
    if (smartFilter.priceRange !== 'all') {
      const [min, max] = smartFilter.priceRange.split('-').map(Number);
      filtered = filtered.filter(pitch => {
        const price = pitch.asking_price || 0;
        return price >= min && price <= max;
      });
    }

    // Age range filter
    if (smartFilter.ageRange !== 'all') {
      const [min, max] = smartFilter.ageRange.split('-').map(Number);
      filtered = filtered.filter(pitch => {
        const age = pitch.players.age;
        return age && age >= min && age <= max;
      });
    }

    // Market value filter
    if (smartFilter.marketValueRange !== 'all') {
      const [min, max] = smartFilter.marketValueRange.split('-').map(Number);
      filtered = filtered.filter(pitch => {
        const marketValue = pitch.players.market_value;
        return marketValue && marketValue >= min && marketValue <= max;
      });
    }

    // Has videos filter
    if (smartFilter.hasVideos) {
      filtered = filtered.filter(pitch => pitch.tagged_videos.length > 0);
    }

    // International filter
    if (smartFilter.isInternational) {
      filtered = filtered.filter(pitch => pitch.is_international);
    }

    setFilteredPitches(filtered);
  };

  const handleShortlist = async (pitchId: string) => {
    if (!profile?.id) return;

    try {
      const { data: agentData } = await supabase
        .from('agents')
        .select('id')
        .eq('profile_id', profile.id)
        .single();

      if (!agentData) return;

      if (shortlistedPitches.has(pitchId)) {
        // Remove from shortlist
        const { error } = await supabase
          .from('shortlist')
          .delete()
          .eq('agent_id', agentData.id)
          .eq('pitch_id', pitchId);

        if (error) throw error;

        setShortlistedPitches(prev => {
          const newSet = new Set(prev);
          newSet.delete(pitchId);
          return newSet;
        });

        toast({
          title: "Removed from Shortlist",
          description: "Player removed from your shortlist",
        });
      } else {
        // Add to shortlist
        const { error } = await supabase
          .from('shortlist')
          .insert({
            agent_id: agentData.id,
            pitch_id: pitchId,
            player_id: pitches.find(p => p.id === pitchId)?.players.id
          });

        if (error) throw error;

        setShortlistedPitches(prev => new Set([...prev, pitchId]));

        toast({
          title: "Added to Shortlist",
          description: "Player added to your shortlist",
        });
      }
    } catch (error) {
      console.error('Error updating shortlist:', error);
      toast({
        title: "Error",
        description: "Failed to update shortlist",
        variant: "destructive"
      });
    }
  };

  const clearAllFilters = () => {
    setSmartFilter({
      position: 'all',
      priceRange: 'all',
      transferType: 'all',
      dealStage: 'all',
      teamCountry: 'all',
      hasVideos: false,
      isInternational: false,
      ageRange: 'all',
      marketValueRange: 'all'
    });
    setSearchTerm('');
  };

  const getDealStageColor = (stage: string) => {
    switch (stage) {
      case 'pitch': return 'bg-blue-500';
      case 'interest': return 'bg-yellow-500';
      case 'discussion': return 'bg-green-500';
      case 'expired': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getDealStageText = (stage: string) => {
    switch (stage) {
      case 'pitch': return 'New Pitch';
      case 'interest': return 'Interest Shown';
      case 'discussion': return 'In Discussion';
      case 'expired': return 'Expired';
      default: return 'Unknown';
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const isExpiringSoon = (expiresAt: string) => {
    const expiryDate = new Date(expiresAt);
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    return expiryDate <= sevenDaysFromNow;
  };

  if (!sportLoaded) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-24 bg-gray-700 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!agentSportType) {
    return (
      <Card>
        <CardContent className="p-10 text-center space-y-4">
          <Sparkles className="w-10 h-10 mx-auto text-rosegold" />
          <CardTitle className="text-2xl text-white">Set Your Sport Preferences</CardTitle>
          <p className="text-gray-400">
            We couldn&apos;t find a sport linked to your profile. Update your agent sport type in your account settings to see tailored transfer pitches.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-24 bg-gray-700 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with AI Recommendations */}
      <Card className="border-0">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <CardTitle className="flex items-center gap-2 text-white">
                <Sparkles className="w-5 h-5 text-rosegold" />
                Enhanced Player Discovery
              </CardTitle>
              <Badge variant="outline" className="text-rosegold border-rosegold">
                {agentSportType.charAt(0).toUpperCase() + agentSportType.slice(1)}
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'card' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('card')}
                className="bg-rosegold hover:bg-rosegold/90 text-white"
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="bg-rosegold hover:bg-rosegold/90 text-white"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* AI Recommendations */}
          {recommendedPitches.length > 0 && (
            <div className="mb-6 p-4 bg-gradient-to-r from-rosegold/10 to-blue-500/10 rounded-lg border border-rosegold/20">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-rosegold" />
                  AI Recommendations
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowRecommendations(!showRecommendations)}
                  className="text-rosegold hover:text-rosegold/80"
                >
                  {showRecommendations ? 'Hide' : 'Show'} Recommendations
                </Button>
              </div>
              
              {showRecommendations && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recommendedPitches.map(pitch => (
                    <Card key={pitch.id} className="bg-gray-800 border-rosegold/30 hover:border-rosegold/50 transition-all">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2 mb-2">
                          {pitch.players.photo_url ? (
                            <img
                              src={pitch.players.photo_url}
                              alt={pitch.players.full_name}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rosegold to-purple-600 flex items-center justify-center">
                              <span className="text-white font-bold text-xs">
                                {pitch.players.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                              </span>
                            </div>
                          )}
                          <div className="flex-1">
                            <p className="font-medium text-white text-sm">{pitch.players.full_name}</p>
                            <p className="text-xs text-gray-400">{pitch.players.position}</p>
                          </div>
                          <Badge variant="outline" className="text-rosegold border-rosegold text-xs">
                            AI Pick
                          </Badge>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-rosegold">
                            {formatCurrency(pitch.asking_price, pitch.currency)}
                          </p>
                          <p className="text-xs text-gray-400">{pitch.transfer_type}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Search and Smart Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search players, teams, or descriptions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 text-white placeholder:text-gray-500"
              />
            </div>

            <Select value={smartFilter.position} onValueChange={(value) => setSmartFilter(prev => ({ ...prev, position: value }))}>
              <SelectTrigger className="text-white">
                <SelectValue placeholder="All Positions" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-600">
                <SelectItem value="all">All Positions</SelectItem>
                {positions.map(position => (
                  <SelectItem key={position} value={position}>
                    {position}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={smartFilter.priceRange} onValueChange={(value) => setSmartFilter(prev => ({ ...prev, priceRange: value }))}>
              <SelectTrigger className="text-white">
                <SelectValue placeholder="All Prices" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-600">
                <SelectItem value="all">All Prices</SelectItem>
                {priceRanges.map(range => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={smartFilter.transferType} onValueChange={(value) => setSmartFilter(prev => ({ ...prev, transferType: value }))}>
              <SelectTrigger className="text-white">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-600">
                <SelectItem value="all">All Types</SelectItem>
                {transferTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="text-white border-gray-600 hover:bg-gray-700"
            >
              <FilterIcon className="w-4 h-4 mr-2" />
              Advanced
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={clearAllFilters}
              className="text-white border-gray-600 hover:bg-gray-700"
            >
              <X className="w-4 h-4 mr-2" />
              Clear
            </Button>
          </div>

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <div className="mb-6 p-4 bg-gray-800 rounded-lg">
              <h4 className="text-sm font-medium text-white mb-3">Advanced Filters</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-gray-400">Age Range</label>
                  <Select value={smartFilter.ageRange} onValueChange={(value) => setSmartFilter(prev => ({ ...prev, ageRange: value }))}>
                    <SelectTrigger className="text-white text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      <SelectItem value="all">All Ages</SelectItem>
                      {ageRanges.map(range => (
                        <SelectItem key={range.value} value={range.value}>
                          {range.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-gray-400">Market Value</label>
                  <Select value={smartFilter.marketValueRange} onValueChange={(value) => setSmartFilter(prev => ({ ...prev, marketValueRange: value }))}>
                    <SelectTrigger className="text-white text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      <SelectItem value="all">All Values</SelectItem>
                      {marketValueRanges.map(range => (
                        <SelectItem key={range.value} value={range.value}>
                          {range.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-gray-400">Country</label>
                  <SearchableSelect
                    value={smartFilter.teamCountry}
                    onValueChange={(value) => setSmartFilter(prev => ({ ...prev, teamCountry: value }))}
                    placeholder="All Countries"
                    options={availableCountries.map(country => ({
                      value: country,
                      label: country
                    }))}
                    triggerClassName="text-white text-xs"
                    contentClassName="bg-gray-800 border-gray-600"
                    showAllOption={true}
                    allOptionLabel="All Countries"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-gray-400">Deal Stage</label>
                  <Select value={smartFilter.dealStage} onValueChange={(value) => setSmartFilter(prev => ({ ...prev, dealStage: value }))}>
                    <SelectTrigger className="text-white text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      <SelectItem value="all">All Stages</SelectItem>
                      {dealStages.map(stage => (
                        <SelectItem key={stage} value={stage}>
                          {getDealStageText(stage)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-gray-400">Has Videos</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="hasVideos"
                      checked={smartFilter.hasVideos}
                      onChange={(e) => setSmartFilter(prev => ({ ...prev, hasVideos: e.target.checked }))}
                      className="rounded border-gray-600 bg-gray-800 text-rosegold focus:ring-rosegold"
                    />
                    <label htmlFor="hasVideos" className="text-xs text-gray-300">Videos Only</label>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-gray-400">International</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isInternational"
                      checked={smartFilter.isInternational}
                      onChange={(e) => setSmartFilter(prev => ({ ...prev, isInternational: e.target.checked }))}
                      className="rounded border-gray-600 bg-gray-800 text-rosegold focus:ring-rosegold"
                    />
                    <label htmlFor="isInternational" className="text-xs text-gray-300">International Only</label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Results Summary */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-400">
              Showing {filteredPitches.length} of {pitches.length} available players
            </p>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <TrendingUp className="w-4 h-4" />
              {pitches.filter(p => p.view_count > 0).length} with views
            </div>
          </div>

          {/* Results */}
          {filteredPitches.length === 0 ? (
            <div className="text-center py-12">
              <Search className="w-16 h-16 mx-auto mb-4 text-gray-500" />
              <h3 className="text-xl font-semibold text-white mb-2">
                {pitches.length === 0 ? 'No Available Players' : 'No Results Found'}
              </h3>
              <p className="text-gray-400">
                {pitches.length === 0
                  ? `No transfer pitches are currently available for ${agentSportType}.`
                  : 'Try adjusting your filters to see more results.'
                }
              </p>
            </div>
          ) : (
            <div className={viewMode === 'card' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
              {filteredPitches.map((pitch) => (
                <Card
                  key={pitch.id}
                  className={`border-gray-600 transition-all duration-200 hover:border-rosegold/50 hover:shadow-lg ${
                    isExpiringSoon(pitch.expires_at) ? 'border-red-500 border-2' : ''
                  } ${viewMode === 'list' ? 'w-full' : ''}`}
                >
                  <CardContent className="p-4 bg-[#141414]">
                    <div className="space-y-3">
                      {/* Player and Team Info */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {pitch.players.photo_url ? (
                            <img
                              src={pitch.players.photo_url}
                              alt={pitch.players.full_name}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-rosegold to-purple-600 flex items-center justify-center">
                              <span className="text-white font-bold text-base">
                                {pitch.players.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                              </span>
                            </div>
                          )}
                          <div>
                            <h3 className="font-semibold text-white">
                              {pitch.players.full_name}
                            </h3>
                            <p className="text-sm text-gray-400">
                              {pitch.players.position} • {pitch.players.citizenship}
                              {pitch.players.age && ` • ${pitch.players.age} years`}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              {pitch.teams?.logo_url && (
                                <img
                                  src={pitch.teams.logo_url}
                                  alt={pitch.teams.team_name}
                                  className="w-4 h-4 rounded-sm object-contain"
                                />
                              )}
                              <p className="text-xs text-gray-500">
                                {pitch.teams?.team_name} • {pitch.teams?.country}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-rosegold">
                            {formatCurrency(pitch.asking_price, pitch.currency)}
                          </div>
                          <div className="text-xs text-gray-400">
                            {pitch.transfer_type.toUpperCase()}
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      {pitch.description && (
                        <p className="text-sm text-gray-300 line-clamp-2">
                          {pitch.description}
                        </p>
                      )}

                      {/* Tags and Status */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant="outline"
                            className={`${getDealStageColor(pitch.deal_stage)} text-white border-none`}
                          >
                            {getDealStageText(pitch.deal_stage)}
                          </Badge>
                          {pitch.is_international && (
                            <Badge variant="outline" className="text-blue-400 border-blue-400">
                              International
                            </Badge>
                          )}
                          {pitch.tagged_videos && pitch.tagged_videos.length > 0 && (
                            <Badge variant="outline" className="text-green-400 border-green-400">
                              <Video className="w-3 h-4 mr-1" />
                              {pitch.tagged_videos.length} Videos
                            </Badge>
                          )}
                          {isExpiringSoon(pitch.expires_at) && (
                            <Badge variant="outline" className="text-red-400 border-red-400 animate-pulse">
                              Expiring Soon
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-gray-400">
                          Expires {formatDistanceToNow(new Date(pitch.expires_at), { addSuffix: true })}
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <div className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {pitch.view_count}
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageCircle className="w-4 h-4" />
                          {pitch.message_count}
                        </div>
                        <div className="flex items-center gap-1">
                          <Heart className="w-4 h-4" />
                          {pitch.shortlist_count}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-gray-600 text-gray-300 hover:bg-gray-700 flex-1"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          className="border-rosegold text-rosegold hover:bg-rosegold/10"
                        >
                          <MessageCircle className="w-4 h-4 mr-2" />
                          Message
                        </Button>

                        <Button
                          size="sm"
                          variant={shortlistedPitches.has(pitch.id) ? "default" : "outline"}
                          onClick={() => handleShortlist(pitch.id)}
                          className={`${
                            shortlistedPitches.has(pitch.id)
                              ? 'bg-rosegold hover:bg-rosegold/90 text-white'
                              : 'border-gray-600 text-gray-300 hover:bg-gray-700'
                          }`}
                        >
                          <Heart className={`w-4 h-4 ${shortlistedPitches.has(pitch.id) ? 'fill-current' : ''}`} />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedAgentDiscovery;
