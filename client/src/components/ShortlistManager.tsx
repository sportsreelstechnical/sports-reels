
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Heart, HeartOff } from 'lucide-react';

interface ShortlistManagerProps {
  pitchId?: string;
  playerId?: string;
  onShortlistChange?: (isShortlisted: boolean) => void;
  showFullList?: boolean;
}

export const ShortlistManager: React.FC<ShortlistManagerProps> = ({
  pitchId,
  playerId,
  onShortlistChange,
  showFullList = false
}) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [isShortlisted, setIsShortlisted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agentId, setAgentId] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.user_type === 'agent') {
      fetchAgentId();
    }
  }, [profile]);

  useEffect(() => {
    if (agentId && pitchId && playerId) {
      checkShortlistStatus();
    }
  }, [agentId, pitchId, playerId]);

  const fetchAgentId = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('agents')
        .select('id')
        .eq('profile_id', profile.id)
        .single();

      if (error) throw error;
      setAgentId(data.id);
    } catch (error) {
      console.error('Error fetching agent ID:', error);
    }
  };

  const checkShortlistStatus = async () => {
    if (!agentId || !pitchId || !playerId) return;

    try {
      const { data, error } = await supabase
        .from('shortlist')
        .select('id')
        .eq('agent_id', agentId)
        .eq('pitch_id', pitchId)
        .eq('player_id', playerId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      setIsShortlisted(!!data);
    } catch (error) {
      console.error('Error checking shortlist status:', error);
    }
  };

  const toggleShortlist = async () => {
    if (!agentId || !pitchId || !playerId) return;

    setLoading(true);
    try {
      if (isShortlisted) {
        // Remove from shortlist
        const { error } = await supabase
          .from('shortlist')
          .delete()
          .eq('agent_id', agentId)
          .eq('pitch_id', pitchId)
          .eq('player_id', playerId);

        if (error) throw error;

        setIsShortlisted(false);
        toast({
          title: "Removed from Shortlist",
          description: "Player removed from your shortlist",
        });
      } else {
        // Add to shortlist
        const { error } = await supabase
          .from('shortlist')
          .insert({
            agent_id: agentId,
            pitch_id: pitchId,
            player_id: playerId,
            notes: '',
            priority_level: 'medium'
          });

        if (error) throw error;

        setIsShortlisted(true);
        toast({
          title: "Added to Shortlist",
          description: "Player added to your shortlist",
        });
      }

      if (onShortlistChange) {
        onShortlistChange(!isShortlisted);
      }
    } catch (error) {
      console.error('Error toggling shortlist:', error);
      toast({
        title: "Error",
        description: "Failed to update shortlist",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (profile?.user_type !== 'agent') {
    return null;
  }

  return (
    <Button
      onClick={toggleShortlist}
      disabled={loading}
      variant={isShortlisted ? "default" : "outline"}
      size="sm"
      className={`${isShortlisted 
        ? "bg-rosegold hover:bg-rosegold/90 text-white" 
        : "border-gray-600 hover:bg-gray-700"
      } transition-colors`}
    >
      {isShortlisted ? (
        <>
          <Heart className="w-4 h-4 mr-2 fill-current" />
          Shortlisted
        </>
      ) : (
        <>
          <HeartOff className="w-4 h-4 mr-2" />
          Shortlist
        </>
      )}
    </Button>
  );
};

export default ShortlistManager;
