
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PlayerVideo {
  id: string;
  title: string;
  video_url: string;
  thumbnail_url?: string;
  created_at: string;
  team_name?: string;
  team_logo_url?: string;
  ai_analysis_status?: string;
}

export const usePlayerVideoTags = (playerId: string) => {
  const [videos, setVideos] = useState<PlayerVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (playerId) {
      fetchPlayerVideos();
    }
  }, [playerId]);

  const fetchPlayerVideos = async () => {
    try {
      setLoading(true);
      setError(null);

      // Search for videos where the player is tagged - use proper JSONB operator
      const { data: videosData, error: videosError } = await supabase
        .from('videos')
        .select(`
          id,
          title,
          video_url,
          thumbnail_url,
          created_at,
          tagged_players,
          ai_analysis_status,
          teams(team_name, logo_url)
        `)
        .contains('tagged_players', `["${playerId}"]`)
        .order('created_at', { ascending: false });

      if (videosError) throw videosError;

      // Also check match_videos table - use proper JSONB operator
      const { data: matchVideosData, error: matchVideosError } = await supabase
        .from('match_videos')
        .select(`
          id,
          title,
          video_url,
          thumbnail_url,
          created_at,
          tagged_players,
          ai_analysis_status,
          team_id
        `)
        .contains('tagged_players', `["${playerId}"]`)
        .order('created_at', { ascending: false });

      if (matchVideosError) {
        console.warn('Error fetching match videos:', matchVideosError);
      }

      // Combine and format results
      const allVideos = [
        ...(videosData || []).map(video => ({
          id: video.id,
          title: video.title,
          video_url: video.video_url,
          thumbnail_url: video.thumbnail_url,
          created_at: video.created_at,
          team_name: video.teams?.team_name,
          team_logo_url: video.teams?.logo_url,
          ai_analysis_status: video.ai_analysis_status
        })),
        ...(matchVideosData || []).map(video => ({
          id: video.id,
          title: video.title,
          video_url: video.video_url,
          thumbnail_url: video.thumbnail_url,
          created_at: video.created_at,
          team_name: null, // Team name not available from match_videos query
          team_logo_url: null,
          ai_analysis_status: video.ai_analysis_status
        }))
      ];

      // Remove duplicates based on ID
      const uniqueVideos = allVideos.filter((video, index, self) => 
        index === self.findIndex(v => v.id === video.id)
      );

      setVideos(uniqueVideos);
    } catch (err) {
      console.error('Error fetching player videos:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch videos');
    } finally {
      setLoading(false);
    }
  };

  const refreshVideos = () => {
    fetchPlayerVideos();
  };

  return {
    videos,
    loading,
    error,
    refreshVideos
  };
};

export default usePlayerVideoTags;
