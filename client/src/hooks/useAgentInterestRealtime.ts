import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AgentInterestState {
  id: string;
  pitch_id: string;
  agent_id: string;
  status: 'interested' | 'requested' | 'negotiating';
  message?: string;
  created_at: string;
  updated_at: string;
  is_new?: boolean; // For visual feedback
}

export const useAgentInterestRealtime = (pitchId?: string) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [interests, setInterests] = useState<AgentInterestState[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch initial interests
  const fetchInterests = async () => {
    if (!pitchId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('agent_interest')
        .select('*')
        .eq('pitch_id', pitchId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInterests(data || []);
    } catch (error) {
      console.error('Error fetching interests:', error);
    } finally {
      setLoading(false);
    }
  };

  // Update interest status with optimistic updates
  const updateInterestStatus = async (interestId: string, newStatus: AgentInterestState['status']) => {
    try {
      // Optimistic update
      setInterests(prev => 
        prev.map(interest => 
          interest.id === interestId 
            ? { ...interest, status: newStatus, updated_at: new Date().toISOString() }
            : interest
        )
      );

      const { error } = await supabase
        .from('agent_interest')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', interestId);

      if (error) {
        // Revert optimistic update on error
        await fetchInterests();
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error updating interest status:', error);
      return false;
    }
  };

  // Cancel interest (agent action) - delete the record instead of updating status
  const cancelInterest = async (interestId: string) => {
    try {
      // Optimistically remove from UI
      setInterests(prev => prev.filter(interest => interest.id !== interestId));

      const { error } = await supabase
        .from('agent_interest')
        .delete()
        .eq('id', interestId);

      if (error) {
        // Revert optimistic update on error
        await fetchInterests();
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error cancelling interest:', error);
      return false;
    }
  };

  // Mark interest as new (for visual feedback)
  const markAsNew = (interestId: string) => {
    setInterests(prev =>
      prev.map(interest =>
        interest.id === interestId
          ? { ...interest, is_new: true }
          : interest
      )
    );

    // Auto-remove new status after 10 seconds
    setTimeout(() => {
      setInterests(prev =>
        prev.map(interest =>
          interest.id === interestId
            ? { ...interest, is_new: false }
            : interest
        )
      );
    }, 10000);
  };

  // Initialize interests
  useEffect(() => {
    if (!pitchId) return;
    fetchInterests();
  }, [pitchId]);

  return {
    interests,
    loading,
    updateInterestStatus,
    cancelInterest,
    markAsNew,
    refresh: fetchInterests
  };
};
