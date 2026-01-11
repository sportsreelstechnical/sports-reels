import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MessageCircle, Clock, Users, TrendingUp, CheckCircle } from 'lucide-react';

interface MessageStage {
  id: string;
  pitch_id: string;
  agent_id: string;
  stage: string;
  last_interaction: string;
  player_name?: string;
  agent_name?: string;
}

const MessageStageTracker = () => {
  const { profile } = useAuth();
  const [messageStages, setMessageStages] = useState<MessageStage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.user_type === 'team') {
      fetchMessageStages();
    }
  }, [profile]);

  const fetchMessageStages = async () => {
    try {
      const { data: teamData } = await supabase
        .from('teams')
        .select('id')
        .eq('profile_id', profile?.id)
        .single();

      if (!teamData) return;

      // First get message stages for this team
      const { data: stages, error: stagesError } = await supabase
        .from('message_stages')
        .select('*')
        .eq('team_id', teamData.id)
        .order('last_interaction', { ascending: false });

      if (stagesError) throw stagesError;

      // Then get related data separately
      const stagesWithNames = await Promise.all(
        (stages || []).map(async (stage) => {
          // Get player name from pitch
          const { data: pitchData } = await supabase
            .from('transfer_pitches')
            .select(`
              players!transfer_pitches_player_id_fkey(full_name)
            `)
            .eq('id', stage.pitch_id)
            .single();

          // Get agent name from profiles
          const { data: agentData } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', stage.agent_id)
            .single();

          return {
            ...stage,
            player_name: pitchData?.players?.full_name || 'Unknown Player',
            agent_name: agentData?.full_name || 'Unknown Agent'
          };
        })
      );

      setMessageStages(stagesWithNames);
    } catch (error) {
      console.error('Error fetching message stages:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStageIcon = (stage: string) => {
    switch (stage) {
      case 'initial_contact':
        return <MessageCircle className="w-4 h-4" />;
      case 'negotiation':
        return <TrendingUp className="w-4 h-4" />;
      case 'agreement_pending':
        return <Clock className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <MessageCircle className="w-4 h-4" />;
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'initial_contact':
        return 'bg-blue-600 text-white';
      case 'negotiation':
        return 'bg-yellow-600 text-white';
      case 'agreement_pending':
        return 'bg-orange-600 text-white';
      case 'completed':
        return 'bg-green-600 text-white';
      default:
        return 'bg-black text-white';
    }
  };

  const getStageLabel = (stage: string) => {
    switch (stage) {
      case 'initial_contact':
        return 'Initial Contact';
      case 'negotiation':
        return 'Negotiation';
      case 'agreement_pending':
        return 'Agreement Pending';
      case 'completed':
        return 'Completed';
      default:
        return 'Unknown';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  if (loading) {
    return (
      <Card className="border-black">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-black rounded w-1/3"></div>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 bg-black rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-black">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Users className="w-5 h-5" />
          Message Stage Tracker
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {messageStages.length === 0 ? (
          <div className="text-center py-8">
            <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-500" />
            <h3 className="text-xl font-semibold text-white mb-2">
              No Active Conversations
            </h3>
            <p className="text-black">
              When agents start messaging about your pitched players, they'll appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {messageStages.map((stage) => (
              <Card key={stage.id} className="border-black">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-white">
                          {stage.player_name}
                        </h3>
                        <Badge className={getStageColor(stage.stage)}>
                          {getStageIcon(stage.stage)}
                          <span className="ml-1">{getStageLabel(stage.stage)}</span>
                        </Badge>
                      </div>
                      <p className="text-sm text-black">
                        Conversation with {stage.agent_name}
                      </p>
                      <p className="text-xs text-black">
                        Last interaction: {formatTimeAgo(stage.last_interaction)}
                      </p>
                    </div>
                    <Button 
                      size="sm" 
                      className="bg-rosegold hover:bg-rosegold/90 text-white"
                    >
                      View Messages
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MessageStageTracker;
