import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Clock, MessageCircle, Eye, AlertCircle, TrendingUp,
  Search, Filter, Grid3X3, List, Play, Building2, User, MapPin, Calendar, DollarSign, Heart, HeartOff, CheckCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useSportData } from '@/hooks/useSportData';
import MessagePlayerModal from '../MessagePlayerModal';
import { EnhancedNotificationService } from '@/domains/notifications/services/enhancedNotificationService';
import { useAgentInterestRealtime } from '@/hooks/useAgentInterestRealtime';
import { usePlayerStatusRealtime } from '@/domains/players/hooks/usePlayerStatusRealtime';
import { SmoothWorkflowService } from '@/shared/utils/smoothWorkflowService';

interface TimelinePitch {
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
  team_id: string;
  status: string;
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
    profile_id: string;
  };
  agent_interest?: Array<{
    id: string;
    agent_id: string;
    status: 'interested' | 'requested' | 'negotiating';
    created_at: string;
  }>;
}

const AgentTransferTimeline = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [pitches, setPitches] = useState<TimelinePitch[]>([]);
  const [filteredPitches, setFilteredPitches] = useState<TimelinePitch[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [agentSportType, setAgentSportType] = useState<string | null>(null);
  const [sportLoaded, setSportLoaded] = useState(false);
  const [shortlistedPitches, setShortlistedPitches] = useState<Set<string>>(new Set());
  const [selectedPlayerForMessage, setSelectedPlayerForMessage] = useState<TimelinePitch | null>(null);
  const [showInterestModal, setShowInterestModal] = useState(false);
  const [selectedPitchForInterest, setSelectedPitchForInterest] = useState<TimelinePitch | null>(null);
  const [interestMessage, setInterestMessage] = useState('');
  const [interestType, setInterestType] = useState<'interested' | 'requested'>('interested');
  const [expressedInterests, setExpressedInterests] = useState<Set<string>>(new Set());
  const [existingInterestData, setExistingInterestData] = useState<{ status: string, message: string } | null>(null);

  // Real-time interest management
  const { cancelInterest } = useAgentInterestRealtime();

  // Real-time player status management
  const { incrementInterestCount, decrementInterestCount, getStatusBadgeProps } = usePlayerStatusRealtime();

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [positionFilter, setPositionFilter] = useState('all');
  const [transferTypeFilter, setTransferTypeFilter] = useState('all');
  const [priceRangeFilter, setPriceRangeFilter] = useState('all');
  const [dealStageFilter, setDealStageFilter] = useState('all');
  const [teamFilter, setTeamFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  // Get sport-specific data
  const { positions } = useSportData(agentSportType || '');
  const transferTypes = ['permanent', 'loan'];
  const dealStages = ['pitch', 'interest', 'discussion', 'expired'];
  const priceRanges = [
    { label: 'Under $100K', value: '0-100000' },
    { label: '$100K - $500K', value: '100000-500000' },
    { label: '$500K - $1M', value: '500000-1000000' },
    { label: '$1M - $5M', value: '1000000-5000000' },
    { label: 'Over $5M', value: '5000000-999999999' }
  ];

  // Get unique teams for filtering
  const [availableTeams, setAvailableTeams] = useState<string[]>([]);

  useEffect(() => {
    if (!profile?.id) {
      setAgentSportType(null);
      setSportLoaded(true);
      setLoading(false);
      return;
    }

    const loadSport = async () => {
      setSportLoaded(false);
      setLoading(true);
      await fetchAgentSportType();
    };

    loadSport();
  }, [profile?.id]);

  useEffect(() => {
    if (!sportLoaded) return;

    if (!agentSportType) {
      setPitches([]);
      setFilteredPitches([]);
      setAvailableTeams([]);
      setLoading(false);
      return;
    }

    fetchTimelinePitches();
    fetchShortlistedPitches();
    fetchExpressedInterests();
  }, [agentSportType, sportLoaded]);

  useEffect(() => {
    applyFilters();
  }, [pitches, searchTerm, positionFilter, transferTypeFilter, priceRangeFilter, dealStageFilter, teamFilter]);

  const fetchAgentSportType = async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase
        .from('agents')
        .select('specialization')
        .eq('profile_id', profile.id)
        .single();

      if (error) {
        console.error('Error fetching agent sport type:', error);
        return;
      }

      if (data?.specialization && Array.isArray(data.specialization) && data.specialization.length > 0) {
        const sportType = data.specialization[0];
        setAgentSportType(sportType);
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

      if (error) {
        console.error('Error fetching shortlisted pitches:', error);
        return;
      }

      const shortlistedIds = new Set(data.map(item => item.pitch_id));
      setShortlistedPitches(shortlistedIds);
    } catch (error) {
      console.error('Error fetching shortlisted pitches:', error);
    }
  };

  const fetchExpressedInterests = async () => {
    if (!profile?.id) return;

    try {
      const { data: agentData } = await supabase
        .from('agents')
        .select('id')
        .eq('profile_id', profile.id)
        .single();

      if (!agentData) return;

      const { data, error } = await supabase
        .from('agent_interest')
        .select('pitch_id')
        .eq('agent_id', agentData.id)
        .not('status', 'in', '(withdrawn,rejected)'); // Exclude withdrawn/rejected from timeline

      if (error) {
        console.error('Error fetching expressed interests:', error);
        return;
      }

      const interestIds = new Set(data.map(item => item.pitch_id));
      setExpressedInterests(interestIds);
    } catch (error) {
      console.error('Error fetching expressed interests:', error);
    }
  };

  const fetchTimelinePitches = async () => {
    if (!agentSportType) {
      setLoading(false);
      return;
    }

    try {
      const { data: pitchesData, error: pitchesError } = await supabase
        .from('transfer_pitches')
        .select('*')
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(50);

      if (pitchesError) throw pitchesError;

      const enrichedPitches = await Promise.all(
        (pitchesData || []).map(async (pitch) => {
          const { data: teamData } = await supabase
            .from('teams')
            .select('id, team_name, logo_url, country, sport_type, profile_id')
            .eq('id', pitch.team_id)
            .single();

          const { data: playerData } = await supabase
            .from('players')
            .select('id, full_name, position, citizenship, photo_url, date_of_birth, market_value')
            .eq('id', pitch.player_id)
            .single();

          const { data: interestData } = await supabase
            .from('agent_interest')
            .select('id, agent_id, status, created_at')
            .eq('pitch_id', pitch.id);

          return {
            ...pitch,
            teams: teamData || {},
            players: playerData || {},
            agent_interest: interestData || []
          };
        })
      );

      const filteredPitches = enrichedPitches.filter(pitch =>
        pitch.teams?.sport_type === agentSportType
      );

      const processedPitches: TimelinePitch[] = filteredPitches.map(pitch => ({
        ...pitch,
        tagged_videos: Array.isArray(pitch.tagged_videos) ? pitch.tagged_videos : [],
        asking_price: pitch.asking_price || 0,
        currency: pitch.currency || 'USD',
        transfer_type: pitch.transfer_type || 'permanent',
        deal_stage: pitch.deal_stage || 'pitch',
        view_count: pitch.view_count || 0,
        message_count: pitch.message_count || 0,
        shortlist_count: pitch.shortlist_count || 0,
        is_international: pitch.is_international || false,
        description: pitch.description || '',
        players: {
          ...pitch.players,
          age: pitch.players.date_of_birth ?
            new Date().getFullYear() - new Date(pitch.players.date_of_birth).getFullYear() : undefined
        }
      }));

      setPitches(processedPitches);

      const teams = [...new Set(processedPitches.map(p => p.teams.team_name))].sort();
      setAvailableTeams(teams);

    } catch (error) {
      console.error('Error fetching timeline pitches:', error);
      toast({
        title: "Error",
        description: "Failed to load transfer timeline",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...pitches];

    if (searchTerm) {
      filtered = filtered.filter(pitch =>
        pitch.players.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pitch.teams.team_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pitch.players.position.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (positionFilter !== 'all') {
      filtered = filtered.filter(pitch => pitch.players.position === positionFilter);
    }

    if (transferTypeFilter !== 'all') {
      filtered = filtered.filter(pitch => pitch.transfer_type === transferTypeFilter);
    }

    if (dealStageFilter !== 'all') {
      filtered = filtered.filter(pitch => pitch.deal_stage === dealStageFilter);
    }

    if (teamFilter !== 'all') {
      filtered = filtered.filter(pitch => pitch.teams.team_name === teamFilter);
    }

    if (priceRangeFilter !== 'all') {
      const [min, max] = priceRangeFilter.split('-').map(Number);
      filtered = filtered.filter(pitch => {
        const price = pitch.asking_price || 0;
        return price >= min && price <= max;
      });
    }

    setFilteredPitches(filtered);
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

  const isExpiringSoon = (expiresAt: string) => {
    const expiryDate = new Date(expiresAt);
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    return expiryDate <= sevenDaysFromNow;
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleViewDetails = async (pitch: TimelinePitch) => {
    navigate(`/player/${pitch.players.id}`, {
      state: {
        pitchId: pitch.id,
        fromTransferTimeline: true
      }
    });
  };

  const handleToggleShortlist = async (pitch: TimelinePitch) => {
    if (!profile?.id) return;

    try {
      const { data: agentData } = await supabase
        .from('agents')
        .select('id')
        .eq('profile_id', profile.id)
        .single();

      if (!agentData) {
        toast({
          title: "Error",
          description: "Agent profile not found",
          variant: "destructive"
        });
        return;
      }

      const isShortlisted = shortlistedPitches.has(pitch.id);

      if (isShortlisted) {
        const { error } = await supabase
          .from('shortlist')
          .delete()
          .eq('agent_id', agentData.id)
          .eq('pitch_id', pitch.id);

        if (error) throw error;

        setShortlistedPitches(prev => {
          const newSet = new Set(prev);
          newSet.delete(pitch.id);
          return newSet;
        });

        toast({
          title: "Removed",
          description: `${pitch.players.full_name} removed from shortlist`,
        });
      } else {
        const { error } = await supabase
          .from('shortlist')
          .insert({
            agent_id: agentData.id,
            pitch_id: pitch.id,
            player_id: pitch.players.id,
            priority_level: 'medium'
          });

        if (error) throw error;

        setShortlistedPitches(prev => new Set([...prev, pitch.id]));

        toast({
          title: "Added",
          description: `${pitch.players.full_name} added to shortlist`,
        });
      }
    } catch (error) {
      console.error('Error toggling shortlist:', error);
      toast({
        title: "Error",
        description: "Failed to update shortlist",
        variant: "destructive"
      });
    }
  };

  const handleMessagePlayer = (pitch: TimelinePitch) => {
    setSelectedPlayerForMessage(pitch);
  };

  const handleOpenInterestModal = async (pitch: TimelinePitch) => {
    setSelectedPitchForInterest(pitch);

    if (expressedInterests.has(pitch.id)) {
      try {
        const { data: agentData } = await supabase
          .from('agents')
          .select('id')
          .eq('profile_id', profile?.id)
          .single();

        if (agentData) {
          const { data: existingInterest } = await supabase
            .from('agent_interest')
            .select('status, message')
            .eq('pitch_id', pitch.id)
            .eq('agent_id', agentData.id)
            .single();

          if (existingInterest) {
            setExistingInterestData({
              status: existingInterest.status,
              message: existingInterest.message || ''
            });
            setInterestType(existingInterest.status as 'interested' | 'requested');
            setInterestMessage(existingInterest.message || '');
          }
        }
      } catch (error) {
        console.error('Error fetching existing interest:', error);
      }
    } else {
      setExistingInterestData(null);
      setInterestType('interested');
      setInterestMessage('');
    }

    setShowInterestModal(true);
  };

  const handleCancelInterest = async (pitchId: string) => {
    try {
      // Get agent ID first
      const { data: agentData } = await supabase
        .from('agents')
        .select('id')
        .eq('profile_id', profile?.id)
        .single();

      if (!agentData) return;

      // Find the interest record for this pitch
      const { data: interestRecord } = await supabase
        .from('agent_interest')
        .select('id')
        .eq('pitch_id', pitchId)
        .eq('agent_id', agentData.id)
        .single();

      if (interestRecord) {
        // Get pitch details with separate queries to avoid RLS issues
        const { data: pitchData } = await supabase
          .from('transfer_pitches')
          .select('id, player_id, team_id')
          .eq('id', pitchId)
          .single();

        if (!pitchData) {
          console.error('❌ Could not find pitch data');
          return;
        }

        // Get team data separately
        const { data: teamData } = await supabase
          .from('teams')
          .select('team_name, profile_id')
          .eq('id', pitchData.team_id)
          .single();

        // Get player data separately
        const { data: playerData } = await supabase
          .from('players')
          .select('full_name')
          .eq('id', pitchData.player_id)
          .single();

        console.log('🔍 Cancel interest - Pitch data:', pitchData);
        console.log('🔍 Cancel interest - Team data:', teamData);
        console.log('🔍 Cancel interest - Player data:', playerData);

        if (!teamData?.profile_id) {
          console.error('❌ No team profile_id found in pitch data');
          toast({
            title: "Error",
            description: "Could not find team information for this pitch",
            variant: "destructive"
          });
          return;
        }

        // Update status to 'withdrawn' with message - this keeps the record for display
        const { error: updateError } = await supabase
          .rpc('update_agent_interest_status', {
            interest_id: interestRecord.id,
            new_status: 'withdrawn',
            status_msg: `Agent ${profile?.full_name || 'Unknown'} has withdrawn their interest in ${playerData?.full_name || 'this player'} on ${new Date().toLocaleString()}`
          });

        if (updateError) throw updateError;

        console.log('✅ Agent interest status updated to withdrawn - database trigger will handle team notification');

        // Update local state
        setExpressedInterests(prev => {
          const newSet = new Set(prev);
          newSet.delete(pitchId);
          return newSet;
        });

        // Update player status immediately
        decrementInterestCount(pitchId, '');

        // Trigger team update
        window.dispatchEvent(new CustomEvent('workflowUpdate', {
          detail: {
            type: 'agent_interest_cancelled',
            pitchId: pitchId,
            agentName: profile?.full_name || 'Unknown'
          }
        }));

        toast({
          title: "Interest Cancelled",
          description: "Your interest has been cancelled and the team has been notified.",
        });
      }
    } catch (error) {
      console.error('Error cancelling interest:', error);
      toast({
        title: "Error",
        description: "Failed to cancel interest",
        variant: "destructive"
      });
    }
  };

  const handleInterestInPitch = async (pitch: TimelinePitch) => {
    if (!profile?.id) {
      toast({
        title: "Error",
        description: "Please log in to express interest",
        variant: "destructive"
      });
      return;
    }

    try {
      let { data: agentData, error: agentError } = await supabase
        .from('agents')
        .select('id')
        .eq('profile_id', profile.id)
        .maybeSingle();

      if (agentError) {
        console.error('Error fetching agent data:', agentError);
        toast({
          title: "Error",
          description: "Failed to fetch agent profile. Please try again.",
          variant: "destructive"
        });
        return;
      }

      if (!agentData) {
        const { data: newAgentData, error: createError } = await supabase
          .from('agents')
          .insert({
            profile_id: profile.id,
            agency_name: 'Agency',
            specialization: ['football']
          })
          .select('id')
          .single();

        if (createError) {
          console.error('Error creating agent record:', createError);
          toast({
            title: "Error",
            description: "Failed to create agent profile.",
            variant: "destructive"
          });
          return;
        }

        agentData = newAgentData;
      }

      const { data: existingInterest, error: checkError } = await supabase
        .from('agent_interest')
        .select('id, status')
        .eq('pitch_id', pitch.id)
        .eq('agent_id', agentData.id)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingInterest) {
        // Check if we're reactivating a withdrawn/rejected interest
        const isReactivating = existingInterest.status === 'withdrawn' || existingInterest.status === 'rejected';

        console.log('🔄 Updating existing interest:', {
          existingStatus: existingInterest.status,
          newStatus: interestType,
          isReactivating: isReactivating
        });

        const { error: updateError } = await supabase
          .from('agent_interest')
          .update({
            status: interestType,
            message: interestMessage,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingInterest.id);

        if (updateError) throw updateError;

        // If reactivating from withdrawn/rejected, create manual team notification
        // because the database trigger UPDATE path notifies the agent, not the team
        if (isReactivating) {
          console.log('🔄 Reactivating interest - creating manual team notification');

          try {
            if (pitch.teams.profile_id) {
              const { data: teamProfile } = await supabase
                .from('profiles')
                .select('user_id')
                .eq('id', pitch.teams.profile_id)
                .single();

              if (teamProfile?.user_id) {
                await EnhancedNotificationService.createNotification({
                  user_id: teamProfile.user_id,
                  title: "🎯 Agent Interest Renewed",
                  message: `Agent ${profile?.full_name || 'Unknown'} has renewed their interest in ${pitch.players.full_name}`,
                  type: "agent_interest",
                  action_url: `/team-explore?tab=communication`,
                  action_text: "View Communication",
                  metadata: {
                    pitch_id: pitch.id,
                    player_name: pitch.players.full_name,
                    team_name: pitch.teams.team_name,
                    agent_name: profile?.full_name || 'Unknown',
                    interest_type: interestType,
                    interest_message: interestMessage,
                    source: 'reactivation_manual',
                    previous_status: existingInterest.status
                  }
                });

                console.log('✅ Manual team notification created for reactivated interest');
              }
            }
          } catch (notificationError) {
            console.error('Error creating reactivation notification:', notificationError);
          }
        }

        toast({
          title: isReactivating ? "Interest Renewed!" : "Interest Updated!",
          description: isReactivating
            ? "Your interest has been renewed and the team has been notified."
            : "Your interest has been updated successfully.",
        });
      } else {
        // Direct approach - create interest and notification
        console.log('🎯 Creating new agent interest for pitch:', pitch.id);

        const { error: insertError } = await supabase
          .from('agent_interest')
          .insert({
            pitch_id: pitch.id,
            agent_id: agentData.id,
            status: interestType,
            message: interestMessage,
            created_at: new Date().toISOString()
          });

        if (insertError) throw insertError;

        console.log('✅ Agent interest created - original working database trigger will handle team notification');

        // Trigger immediate UI update for team
        window.dispatchEvent(new CustomEvent('agentInterestExpressed', {
          detail: {
            pitchId: pitch.id,
            playerId: pitch.players.id,
            playerName: pitch.players.full_name,
            teamProfileId: pitch.teams.profile_id,
            agentName: profile?.full_name || 'Unknown'
          }
        }));

        // Update player status immediately
        incrementInterestCount(pitch.id, pitch.players.id);

        toast({
          title: "Success!",
          description: "Interest expressed successfully. The team has been notified.",
        });
      }

      setExpressedInterests(prev => new Set([...prev, pitch.id]));
      setShowInterestModal(false);
      setSelectedPitchForInterest(null);
      setInterestMessage('');
      fetchTimelinePitches();
      fetchExpressedInterests();
    } catch (error: Error) {
      console.error('Error expressing interest:', error);

      let errorMessage = "Failed to express interest";
      if (error.code === '23505') {
        errorMessage = "You have already expressed interest in this player";
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  if (!sportLoaded) {
    return (
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 md:h-24 bg-gray-700 rounded"></div>
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
        <CardContent className="p-8 text-center space-y-4">
          <TrendingUp className="w-10 h-10 mx-auto text-rosegold" />
          <CardTitle className="text-2xl text-white">Add Your Sport</CardTitle>
          <p className="text-gray-400">
            We couldn&apos;t detect a sport specialization for your agent profile. Update your sport settings to see matching transfer pitches.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 md:h-24 bg-gray-700 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header with Filters */}
      <Card className="border-0">
        <CardHeader className="px-4 md:px-6 pb-4">
          {/* Main Header - Better Mobile Layout */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 min-w-0">
                <CardTitle className="flex items-center gap-2 text-white text-lg truncate">
                  <TrendingUp className="w-5 h-5 flex-shrink-0" />
                  Transfer Timeline
                </CardTitle>
                <div className="flex items-center gap-2 flex-wrap text-xs text-gray-300">
                  <span className="uppercase tracking-wide text-gray-400">Sport:</span>
                  <span className="text-rosegold font-semibold">
                    {agentSportType.charAt(0).toUpperCase() + agentSportType.slice(1)}
                  </span>
                  {filteredPitches.length > 0 && (
                    <Badge variant="outline" className="text-rosegold border-rosegold text-xs whitespace-nowrap">
                      {filteredPitches.length}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 justify-end">
                <Button
                  variant={viewMode === 'card' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('card')}
                  className="bg-rosegold hover:bg-rosegold/90 text-white text-xs px-2 sm:px-3"
                >
                  <Grid3X3 className="w-4 h-4" />
                  <span className="hidden sm:inline ml-1">Grid</span>
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="bg-rosegold hover:bg-rosegold/90 text-white text-xs px-2 sm:px-3"
                >
                  <List className="w-4 h-4" />
                  <span className="hidden sm:inline ml-1">List</span>
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-4 md:px-6">
          {/* Search and Filters - Improved Mobile Experience */}
          <div className="space-y-4 mb-6">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search players or teams..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 text-white placeholder:text-gray-500 text-sm"
              />
            </div>

            {/* Filter Controls */}
            <div className="flex items-center justify-between gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="lg:hidden text-white border-gray-600 hover:bg-gray-700 text-sm"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters {showFilters ? '▲' : '▼'}
              </Button>

              {/* Clear Filters Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setPositionFilter('all');
                  setTransferTypeFilter('all');
                  setPriceRangeFilter('all');
                  setDealStageFilter('all');
                  setTeamFilter('all');
                }}
                className="text-white border-gray-600 hover:bg-gray-700 text-sm"
              >
                <Filter className="w-4 h-4 mr-2" />
                Clear All
              </Button>
            </div>

            {/* Filters Grid - Responsive and Collapsible on Mobile */}
            <div className={`${showFilters ? 'block' : 'hidden lg:block'}`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                <Select value={positionFilter} onValueChange={setPositionFilter}>
                  <SelectTrigger className="text-white text-sm border-gray-600 bg-gray-800">
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

                <Select value={teamFilter} onValueChange={setTeamFilter}>
                  <SelectTrigger className="text-white text-sm border-gray-600 bg-gray-800">
                    <SelectValue placeholder="All Teams" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="all">All Teams</SelectItem>
                    {availableTeams.map(team => (
                      <SelectItem key={team} value={team}>
                        {team}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={transferTypeFilter} onValueChange={setTransferTypeFilter}>
                  <SelectTrigger className="text-white text-sm border-gray-600 bg-gray-800">
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

                <Select value={dealStageFilter} onValueChange={setDealStageFilter}>
                  <SelectTrigger className="text-white text-sm border-gray-600 bg-gray-800">
                    <SelectValue placeholder="All Stages" />
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

                <Select value={priceRangeFilter} onValueChange={setPriceRangeFilter}>
                  <SelectTrigger className="text-white text-sm border-gray-600 bg-gray-800">
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
              </div>
            </div>
          </div>

          {/* Results */}
          {filteredPitches.length === 0 ? (
            <div className="text-center py-8 md:py-12">
              <Clock className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-4 text-gray-500" />
              <h3 className="text-lg md:text-xl font-semibold text-white mb-2">
                {pitches.length === 0 ? 'No Active Pitches' : 'No Results Found'}
              </h3>
              <p className="text-gray-400 text-sm md:text-base px-4">
                {pitches.length === 0
                  ? `No transfer pitches are currently active for ${agentSportType}.`
                  : 'Try adjusting your filters to see more results.'
                }
              </p>
            </div>
          ) : (
            <div className={
              viewMode === 'card'
                ? 'grid grid-cols-1 lg:grid-cols-3 gap-6'
                : 'space-y-4'
            }>
              {filteredPitches.map((pitch) => (
                <Card
                  key={pitch.id}
                  className={`border-0 hover:border-rosegold/30 transition-colors ${isExpiringSoon(pitch.expires_at) ? 'border-red-500 border-2' : ''
                    }`}
                >
                  <CardHeader className="pb-2 p-3 sm:p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {pitch.players.photo_url ? (
                          <img
                            src={pitch.players.photo_url}
                            alt={pitch.players.full_name}
                            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-rosegold to-purple-600 flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-bold text-sm sm:text-base">
                              {pitch.players.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                            </span>
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-white text-sm sm:text-base leading-tight break-words">
                            {pitch.players.full_name}
                          </h3>
                          <p className="text-xs sm:text-sm text-gray-400 truncate">
                            {pitch.players.position}
                            {pitch.players.age && ` • ${pitch.players.age}y`}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <Badge
                          variant={pitch.transfer_type === 'permanent' ? 'default' : 'secondary'}
                          className="text-[10px] sm:text-xs px-1.5"
                        >
                          {pitch.transfer_type}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`${getDealStageColor(pitch.deal_stage)} text-white border-none text-[10px] sm:text-xs px-1.5`}
                        >
                          {getDealStageText(pitch.deal_stage)}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-2.5 p-3 sm:p-4">
                    {/* Team Info */}
                    <div className="flex items-center gap-2">
                      {pitch.teams.logo_url && (
                        <img
                          src={pitch.teams.logo_url}
                          alt={pitch.teams.team_name}
                          className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex-shrink-0"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-white text-xs sm:text-sm truncate leading-tight">
                          {pitch.teams.team_name}
                        </p>
                        <p className="text-[10px] sm:text-xs text-gray-400 truncate">
                          {pitch.teams.country}
                        </p>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-green-400 flex-shrink-0" />
                      <span className="text-white font-semibold text-xs sm:text-sm truncate">
                        {new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(pitch.asking_price)} {pitch.currency}
                      </span>
                    </div>

                    {/* Description */}
                    {pitch.description && (
                      <p className="text-gray-300 text-[10px] sm:text-xs line-clamp-2 leading-tight">
                        {pitch.description}
                      </p>
                    )}

                    {/* Additional Badges */}
                    {(pitch.is_international || (pitch.tagged_videos && pitch.tagged_videos.length > 0) || isExpiringSoon(pitch.expires_at)) && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {pitch.is_international && (
                          <Badge variant="outline" className="text-blue-400 border-blue-400 text-[10px] sm:text-xs px-1.5">
                            International
                          </Badge>
                        )}
                        {pitch.tagged_videos && pitch.tagged_videos.length > 0 && (
                          <Badge variant="outline" className="text-green-400 border-green-400 text-[10px] sm:text-xs px-1.5">
                            <Play className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5" />
                            {pitch.tagged_videos.length} Videos
                          </Badge>
                        )}
                        {isExpiringSoon(pitch.expires_at) && (
                          <Badge variant="outline" className="text-red-400 border-red-400 animate-pulse text-[10px] sm:text-xs px-1.5">
                            <AlertCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5" />
                            Expiring Soon
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Stats */}
                    <div className="flex items-center justify-between text-[10px] sm:text-xs text-gray-400 gap-2">
                      <div className="flex items-center gap-1 min-w-0">
                        <Eye className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span className="truncate">{pitch.view_count}</span>
                      </div>
                      <div className="flex items-center gap-1 min-w-0">
                        <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span className="truncate">{pitch.message_count}</span>
                      </div>
                      <div className="flex items-center gap-1 min-w-0">
                        <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span className="truncate">{pitch.shortlist_count}</span>
                      </div>
                      <div className="flex items-center gap-1 min-w-0">
                        <Clock className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span className="truncate text-[9px] sm:text-[10px] leading-tight">
                          {formatDistanceToNow(new Date(pitch.expires_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 border-gray-600 text-white hover:bg-gray-700 text-xs py-2"
                        onClick={() => handleViewDetails(pitch)}
                      >
                        <Eye className="w-3 h-3 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
                        <span className="truncate">View</span>
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        className={`flex-1 border-gray-600 hover:bg-gray-700 text-xs py-2 ${shortlistedPitches.has(pitch.id)
                          ? 'text-red-400 border-red-400'
                          : 'text-white'
                          }`}
                        onClick={() => handleToggleShortlist(pitch)}
                      >
                        {shortlistedPitches.has(pitch.id) ? (
                          <HeartOff className="w-3 h-3 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
                        ) : (
                          <Heart className="w-3 h-3 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
                        )}
                        <span className="truncate">
                          {shortlistedPitches.has(pitch.id) ? 'Remove' : 'Add'}
                        </span>
                      </Button>

                      {!expressedInterests.has(pitch.id) ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 border-rosegold text-rosegold hover:bg-rosegold hover:text-white text-xs py-2"
                          onClick={() => handleOpenInterestModal(pitch)}
                        >
                          <Heart className="w-3 h-3 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
                          <span className="truncate">Interest</span>
                        </Button>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 border-green-600 text-green-400 hover:bg-green-600 hover:text-white text-xs py-2"
                            onClick={() => handleOpenInterestModal(pitch)}
                          >
                            <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
                            <span className="truncate">Update</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 border-red-600 text-red-400 hover:bg-red-600 hover:text-white text-xs py-2"
                            onClick={() => handleCancelInterest(pitch.id)}
                          >
                            <HeartOff className="w-3 h-3 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
                            <span className="truncate">Cancel</span>
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Message Player Modal */}
      {selectedPlayerForMessage && (
        <MessagePlayerModal
          player={{
            id: selectedPlayerForMessage.players.id,
            full_name: selectedPlayerForMessage.players.full_name,
            position: selectedPlayerForMessage.players.position,
            photo_url: selectedPlayerForMessage.players.photo_url,
          }}
          isOpen={!!selectedPlayerForMessage}
          onClose={() => setSelectedPlayerForMessage(null)}
        />
      )}

      {/* Interest Modal */}
      {showInterestModal && selectedPitchForInterest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-4 md:p-6 w-full max-w-md mx-auto">
            <h3 className="text-lg md:text-xl font-semibold text-white mb-4">
              {expressedInterests.has(selectedPitchForInterest.id) ? 'Update Interest' : 'Express Interest'} in {selectedPitchForInterest.players.full_name}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-white mb-2 block">
                  Interest Type
                </label>
                <Select value={interestType} onValueChange={(value: 'interested' | 'requested') => setInterestType(value)}>
                  <SelectTrigger className="border-gray-600 bg-gray-800 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="interested" className="text-white">Interested</SelectItem>
                    <SelectItem value="requested" className="text-white">Request More Info</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-white mb-2 block">
                  Message (Optional)
                </label>
                <Textarea
                  placeholder="Tell the team why you're interested..."
                  value={interestMessage}
                  onChange={(e) => setInterestMessage(e.target.value)}
                  className="border-gray-600 bg-gray-800 text-white min-h-[80px] text-sm"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                onClick={() => handleInterestInPitch(selectedPitchForInterest)}
                className="bg-rosegold hover:bg-rosegold/90 text-white flex-1"
              >
                <Heart className="w-4 h-4 mr-2" />
                {expressedInterests.has(selectedPitchForInterest.id) ? 'Update' : 'Express Interest'}
              </Button>
              <Button
                onClick={() => {
                  setShowInterestModal(false);
                  setSelectedPitchForInterest(null);
                  setInterestMessage('');
                  setInterestType('interested');
                  setExistingInterestData(null);
                }}
                variant="outline"
                className="border-gray-600 text-white"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentTransferTimeline;