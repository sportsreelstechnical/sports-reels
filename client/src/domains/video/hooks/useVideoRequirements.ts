
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface VideoRequirements {
  video_count: number;
  last_updated: string;
  meets_minimum: boolean;
}

export const useVideoRequirements = () => {
  const { profile } = useAuth();
  const [requirements, setRequirements] = useState<VideoRequirements | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.user_type === 'team') {
      fetchVideoRequirements();
    }
  }, [profile]);

  const fetchVideoRequirements = async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Get team ID
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('id')
        .eq('profile_id', profile.id)
        .single();

      if (teamError || !team) {
        throw new Error('Could not find team');
      }

      // Get video requirements
      const { data: videoReq, error: videoReqError } = await supabase
        .from('video_requirements')
        .select('*')
        .eq('team_id', team.id)
        .single();

      if (videoReqError && videoReqError.code !== 'PGRST116') {
        throw videoReqError;
      }

      const videoCount = videoReq?.video_count || 0;
      setRequirements({
        video_count: videoCount,
        last_updated: videoReq?.last_updated || new Date().toISOString(),
        meets_minimum: videoCount >= 5
      });

    } catch (err: any) {
      console.error('Error fetching video requirements:', err);
      setError(err.message || 'Failed to fetch video requirements');
    } finally {
      setLoading(false);
    }
  };

  const refreshRequirements = () => {
    fetchVideoRequirements();
  };

  return {
    requirements,
    loading,
    error,
    refreshRequirements
  };
};
