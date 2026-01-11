
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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
  topRequestedPositions: Array<{
    position: string;
    requestCount: number;
  }>;
  expiredWithoutInterest: number;
}

export const useMarketSnapshot = () => {
  const { profile } = useAuth();
  const [snapshot, setSnapshot] = useState<MarketSnapshot>({
    avgAskingPrice: 0,
    avgMarketValue: 0,
    activePitches: 0,
    expiringPitches: 0,
    trendingPositions: [],
    topRequestedPositions: [],
    expiredWithoutInterest: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.user_type === 'team') {
      fetchTeamSnapshot();
    } else if (profile?.user_type === 'agent') {
      fetchAgentSnapshot();
    }
  }, [profile]);

  const fetchTeamSnapshot = async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);

      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('member_association, sport_type')
        .eq('profile_id', profile.id)
        .maybeSingle();

      if (teamError) throw teamError;

      if (!teamData || !teamData.member_association || !teamData.sport_type) {
        resetSnapshot();
        return;
      }

      await buildSnapshot(teamData.member_association, teamData.sport_type);
    } catch (error) {
      console.error('Error fetching team market snapshot:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAgentSnapshot = async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);

      const { data: agentData, error: agentError } = await supabase
        .from('agents')
        .select('specialization, region')
        .eq('profile_id', profile.id)
        .maybeSingle();

      if (agentError) throw agentError;

      const specialization = Array.isArray(agentData?.specialization) && agentData.specialization.length > 0
        ? agentData.specialization[0]
        : null;

      if (!specialization) {
        resetSnapshot();
        return;
      }

      await buildSnapshot(agentData?.region || null, specialization);
    } catch (error) {
      console.error('Error fetching agent market snapshot:', error);
    } finally {
      setLoading(false);
    }
  };

  const buildSnapshot = async (memberAssociation: string | null, sportType: string) => {
    const normalizedSport = sportType.toLowerCase();

    // Pitch data
    let pitchQuery = supabase
      .from('transfer_pitches')
      .select(`
        asking_price,
        expires_at,
        message_count,
        teams:teams!inner(id, sport_type, member_association),
        players:players!transfer_pitches_player_id_fkey(position, market_value)
      `)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString());

    if (memberAssociation) {
      pitchQuery = pitchQuery.eq('teams.member_association', memberAssociation);
    }

    const { data: pitchData } = await pitchQuery;

    const filteredPitchData = (pitchData || []).filter(pitch => {
      const team = Array.isArray(pitch.teams) ? pitch.teams[0] : pitch.teams;
      const teamSport = (team?.sport_type || '').toLowerCase();
      return teamSport === normalizedSport;
    });

    const activePitches = filteredPitchData.length;
    const avgAskingPrice = filteredPitchData.length > 0
      ? filteredPitchData.reduce((sum, p) => sum + (p.asking_price || 0), 0) / filteredPitchData.length
      : 0;

    const avgMarketValue = filteredPitchData.length > 0
      ? filteredPitchData.reduce((sum, p) => {
        const player = Array.isArray(p.players) ? p.players[0] : p.players;
        return sum + (player?.market_value || 0);
      }, 0) / filteredPitchData.length
      : 0;

    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const expiringPitches = filteredPitchData.filter(p =>
      new Date(p.expires_at) <= sevenDaysFromNow
    ).length;

    const positionCounts: Record<string, number> = {};
    filteredPitchData.forEach(p => {
      const player = Array.isArray(p.players) ? p.players[0] : p.players;
      const position = player?.position;
      if (position) {
        positionCounts[position] = (positionCounts[position] || 0) + 1;
      }
    });

    const trendingPositions = Object.entries(positionCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([position, count]) => ({
        position,
        count,
        trend: 'stable' as const
      }));

    const { data: requestData } = await supabase
      .from('agent_requests')
      .select('position, sport_type')
      .eq('is_public', true)
      .eq('sport_type', sportType)
      .gt('expires_at', new Date().toISOString());

    const requestPositionCounts: Record<string, number> = {};
    requestData?.forEach(r => {
      if (r.position) {
        requestPositionCounts[r.position] = (requestPositionCounts[r.position] || 0) + 1;
      }
    });

    const topRequestedPositions = Object.entries(requestPositionCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([position, requestCount]) => ({
        position,
        requestCount
      }));

    const expiredWithoutInterest = filteredPitchData.filter(p =>
      p.message_count === 0
    ).length;

    setSnapshot({
      avgAskingPrice,
      avgMarketValue,
      activePitches,
      expiringPitches,
      trendingPositions,
      topRequestedPositions,
      expiredWithoutInterest: activePitches > 0
        ? Math.round((expiredWithoutInterest / activePitches) * 100)
        : 0
    });
  };

  const resetSnapshot = () => {
    setSnapshot({
      avgAskingPrice: 0,
      avgMarketValue: 0,
      activePitches: 0,
      expiringPitches: 0,
      trendingPositions: [],
      topRequestedPositions: [],
      expiredWithoutInterest: 0
    });
  };

  const refreshSnapshot = () => {
    if (profile?.user_type === 'team') {
      return fetchTeamSnapshot();
    }
    if (profile?.user_type === 'agent') {
      return fetchAgentSnapshot();
    }
    return Promise.resolve();
  };

  return {
    snapshot,
    loading,
    refreshSnapshot
  };
};
