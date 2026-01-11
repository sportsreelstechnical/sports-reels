
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface SquadAvailability {
  id: string;
  player_id: string;
  available_for_transfer: boolean;
  transfer_type: string[];
  asking_price: number | null;
  currency: string;
  notes: string | null;
  player: {
    full_name: string;
    position: string;
    market_value: number;
  };
}

export const useSquadAvailability = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [availability, setAvailability] = useState<SquadAvailability[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.user_type === 'team') {
      fetchSquadAvailability();
    }
  }, [profile]);

  const fetchSquadAvailability = async () => {
    if (!profile?.id) return;

    try {
      const { data: teamData } = await supabase
        .from('teams')
        .select('id')
        .eq('profile_id', profile.id)
        .single();

      if (!teamData) return;

      const { data, error } = await supabase
        .from('squad_availability')
        .select(`
          *,
          player:players(
            full_name,
            position,
            market_value
          )
        `)
        .eq('team_id', teamData.id);

      if (error) throw error;
      setAvailability(data || []);
    } catch (error) {
      console.error('Error fetching squad availability:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePlayerAvailability = async (
    playerId: string,
    updates: Partial<SquadAvailability>
  ) => {
    if (!profile?.id) return false;

    try {
      const { data: teamData } = await supabase
        .from('teams')
        .select('id')
        .eq('profile_id', profile.id)
        .single();

      if (!teamData) throw new Error('Team not found');

      const { error } = await supabase
        .from('squad_availability')
        .upsert({
          team_id: teamData.id,
          player_id: playerId,
          ...updates
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Player availability updated successfully"
      });

      await fetchSquadAvailability();
      return true;
    } catch (error) {
      console.error('Error updating availability:', error);
      toast({
        title: "Error",
        description: "Failed to update player availability",
        variant: "destructive"
      });
      return false;
    }
  };

  return {
    availability,
    loading,
    updatePlayerAvailability,
    refreshAvailability: fetchSquadAvailability
  };
};
