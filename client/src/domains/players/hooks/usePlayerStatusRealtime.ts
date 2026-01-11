import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface PlayerStatus {
  pitch_id: string;
  player_id: string;
  status: 'available' | 'interested' | 'negotiating' | 'contracted';
  interest_count: number;
  latest_activity: string;
}

export const usePlayerStatusRealtime = () => {
  const { profile } = useAuth();
  const [playerStatuses, setPlayerStatuses] = useState<Map<string, PlayerStatus>>(new Map());
  const [loading, setLoading] = useState(false);

  // Update player status immediately (optimistic update)
  const updatePlayerStatus = (pitchId: string, playerId: string, newStatus: PlayerStatus['status']) => {
    setPlayerStatuses(prev => {
      const newMap = new Map(prev);
      const currentStatus = newMap.get(pitchId) || {
        pitch_id: pitchId,
        player_id: playerId,
        status: 'available',
        interest_count: 0,
        latest_activity: new Date().toISOString()
      };
      
      newMap.set(pitchId, {
        ...currentStatus,
        status: newStatus,
        latest_activity: new Date().toISOString()
      });
      
      return newMap;
    });
  };

  // Increment interest count
  const incrementInterestCount = (pitchId: string, playerId: string) => {
    setPlayerStatuses(prev => {
      const newMap = new Map(prev);
      const currentStatus = newMap.get(pitchId) || {
        pitch_id: pitchId,
        player_id: playerId,
        status: 'available',
        interest_count: 0,
        latest_activity: new Date().toISOString()
      };
      
      newMap.set(pitchId, {
        ...currentStatus,
        status: 'interested',
        interest_count: currentStatus.interest_count + 1,
        latest_activity: new Date().toISOString()
      });
      
      return newMap;
    });
  };

  // Decrement interest count (when interest is cancelled)
  const decrementInterestCount = (pitchId: string, playerId: string) => {
    setPlayerStatuses(prev => {
      const newMap = new Map(prev);
      const currentStatus = newMap.get(pitchId);
      
      if (currentStatus) {
        const newCount = Math.max(0, currentStatus.interest_count - 1);
        const newStatus = newCount === 0 ? 'available' : 'interested';
        
        newMap.set(pitchId, {
          ...currentStatus,
          status: newStatus,
          interest_count: newCount,
          latest_activity: new Date().toISOString()
        });
      }
      
      return newMap;
    });
  };

  // Fetch initial player statuses
  const fetchPlayerStatuses = async () => {
    if (!profile?.user_id) return;

    try {
      setLoading(true);
      
      // Get all transfer pitches with their interest counts
      const { data: pitches, error } = await supabase
        .from('transfer_pitches')
        .select(`
          id,
          player_id,
          status,
          agent_interest(count)
        `)
        .eq('status', 'active');

      if (error) throw error;

      const statusMap = new Map<string, PlayerStatus>();
      
      pitches?.forEach(pitch => {
        const interestCount = Array.isArray(pitch.agent_interest) 
          ? pitch.agent_interest.length 
          : (pitch.agent_interest as any)?.count || 0;
        
        let status: PlayerStatus['status'] = 'available';
        if (interestCount > 0) status = 'interested';
        
        statusMap.set(pitch.id, {
          pitch_id: pitch.id,
          player_id: pitch.player_id,
          status,
          interest_count: interestCount,
          latest_activity: new Date().toISOString()
        });
      });

      setPlayerStatuses(statusMap);
    } catch (error) {
      console.error('Error fetching player statuses:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initialize player statuses
  useEffect(() => {
    if (!profile?.user_id) return;
    fetchPlayerStatuses();
  }, [profile?.user_id]);

  const getPlayerStatus = (pitchId: string): PlayerStatus | undefined => {
    return playerStatuses.get(pitchId);
  };

  const getStatusBadgeProps = (pitchId: string) => {
    const status = getPlayerStatus(pitchId);
    if (!status) return { text: 'Available', className: 'bg-gray-500' };

    switch (status.status) {
      case 'interested':
        return { 
          text: 'Interested', 
          className: 'bg-blue-500' 
        };
      case 'negotiating':
        return { 
          text: 'Negotiating', 
          className: 'bg-yellow-500 animate-pulse' 
        };
      case 'contracted':
        return { 
          text: 'Contracted', 
          className: 'bg-green-500' 
        };
      default:
        return { 
          text: 'Available', 
          className: 'bg-gray-500' 
        };
    }
  };

  return {
    playerStatuses,
    loading,
    updatePlayerStatus,
    incrementInterestCount,
    decrementInterestCount,
    getPlayerStatus,
    getStatusBadgeProps,
    refresh: fetchPlayerStatuses
  };
};
