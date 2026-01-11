
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TeamStats {
  playersCount: number;
  videosCount: number;
  activePitchesCount: number;
  messagesCount: number;
  completedAnalysisCount: number;
  pendingAnalysisCount: number;
  totalViews: number;
  averageRating: number;
}

export const useRealTimeStats = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState<TeamStats>({
    playersCount: 0,
    videosCount: 0,
    activePitchesCount: 0,
    messagesCount: 0,
    completedAnalysisCount: 0,
    pendingAnalysisCount: 0,
    totalViews: 0,
    averageRating: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    if (!profile?.id || profile.user_type !== 'team') return;

    try {
      // Get team first
      const { data: team } = await supabase
        .from('teams')
        .select('id')
        .eq('profile_id', profile.id)
        .single();

      if (!team) return;

      // Fetch all stats in parallel
      const [
        playersResult,
        videosResult,
        pitchesResult,
        messagesResult
      ] = await Promise.all([
        supabase
          .from('players')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', team.id),
        
        supabase
          .from('videos')
          .select('ai_analysis_status')
          .eq('team_id', team.id),
        
        supabase
          .from('transfer_pitches')
          .select('view_count, status, expires_at')
          .eq('team_id', team.id),
        
        supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('receiver_id', profile.id)
      ]);

      const videos = videosResult.data || [];
      const pitches = pitchesResult.data || [];
      
      // Calculate active pitches
      const activePitches = pitches.filter(p => 
        p.status === 'active' && 
        new Date(p.expires_at) > new Date()
      );

      // Calculate total views
      const totalViews = activePitches.reduce((sum, pitch) => 
        sum + (pitch.view_count || 0), 0
      );

      // AI Analysis stats
      const completedAnalysis = videos.filter(v => 
        v.ai_analysis_status === 'completed'
      ).length;
      
      const pendingAnalysis = videos.filter(v => 
        !v.ai_analysis_status || v.ai_analysis_status === 'pending'
      ).length;

      setStats({
        playersCount: playersResult.count || 0,
        videosCount: videos.length,
        activePitchesCount: activePitches.length,
        messagesCount: messagesResult.count || 0,
        completedAnalysisCount: completedAnalysis,
        pendingAnalysisCount: pendingAnalysis,
        totalViews,
        averageRating: 0 // This could be calculated from AI analysis results
      });

    } catch (error) {
      console.error('Error fetching real-time stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    // Set up real-time subscriptions
    const channels = [
      supabase
        .channel('team_stats_players')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'players' },
          () => fetchStats()
        )
        .subscribe(),
      
      supabase
        .channel('team_stats_videos')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'videos' },
          () => fetchStats()
        )
        .subscribe(),
      
      supabase
        .channel('team_stats_pitches')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'transfer_pitches' },
          () => fetchStats()
        )
        .subscribe(),
      
      supabase
        .channel('team_stats_messages')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'messages' },
          () => fetchStats()
        )
        .subscribe()
    ];

    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [profile]);

  return { stats, loading, refetch: fetchStats };
};
