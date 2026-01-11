
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TeamData {
  id: string;
  team_name: string;
  sport_type: string;
  country: string;
  league: string;
  logo_url?: string;
  member_association?: string;
  year_founded?: number;
  description?: string;
  titles: string[];
  subscription_tier: string;
  verified: boolean;
}

interface UseTeamDataReturn {
  teamData: TeamData | null;
  loading: boolean;
  error: string | null;
  refetchTeam: () => Promise<void>;
}

export const useTeamData = (): UseTeamDataReturn => {
  const { profile } = useAuth();
  const [teamData, setTeamData] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTeamData = async () => {
    if (!profile?.id || profile.user_type !== 'team') {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('teams')
        .select(`
          id,
          team_name,
          sport_type,
          country,
          league,
          logo_url,
          member_association,
          year_founded,
          description,
          titles,
          subscription_tier,
          verified
        `)
        .eq('profile_id', profile.id)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          // No team found - this is expected for new users
          setTeamData(null);
        } else {
          throw fetchError;
        }
      } else {
        setTeamData(data);
      }
    } catch (err) {
      console.error('Error fetching team data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch team data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamData();
  }, [profile]);

  const refetchTeam = async () => {
    await fetchTeamData();
  };

  return {
    teamData,
    loading,
    error,
    refetchTeam
  };
};
