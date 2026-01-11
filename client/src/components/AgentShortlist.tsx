
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Heart, MessageSquare, Calendar, DollarSign, MapPin, User, Trash2 } from 'lucide-react';

interface ShortlistedPitch {
  id: string;
  player_id: string;
  pitch_id: string;
  notes?: string;
  created_at: string;
  players: {
    id: string;
    full_name: string;
    position: string;
    citizenship: string;
    headshot_url?: string;
    photo_url?: string;
    market_value?: number;
    age?: number;
  };
  transfer_pitches: {
    id: string;
    asking_price?: number;
    currency: string;
    transfer_type: string;
    expires_at: string;
    status: string;
    teams: {
      team_name: string;
      country: string;
      logo_url?: string;
    };
  };
}

const AgentShortlist = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [shortlistedPitches, setShortlistedPitches] = useState<ShortlistedPitch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchShortlistedPitches();
  }, [profile]);

  const fetchShortlistedPitches = async () => {
    if (!profile?.id) return;

    try {
      // First get the agent ID
      const { data: agentData } = await supabase
        .from('agents')
        .select('id')
        .eq('profile_id', profile.id)
        .single();

      if (!agentData) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('shortlist')
        .select(`
          *,
          players!transfer_pitches_player_id_fkey(
            id,
            full_name,
            position,
            citizenship,
            headshot_url,
            photo_url,
            market_value,
            date_of_birth
          ),
          transfer_pitches!inner(
            id,
            asking_price,
            currency,
            transfer_type,
            expires_at,
            status,
            teams(
              team_name,
              country,
              logo_url
            )
          )
        `)
        .eq('agent_id', agentData.id)
        .eq('transfer_pitches.status', 'active')
        .gt('transfer_pitches.expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Process data to add age calculation
      const processedData = (data || []).map(item => ({
        ...item,
        players: {
          ...item.players,
          age: item.players.date_of_birth
            ? new Date().getFullYear() - new Date(item.players.date_of_birth).getFullYear()
            : undefined
        }
      }));

      setShortlistedPitches(processedData);
    } catch (error) {
      console.error('Error fetching shortlisted pitches:', error);
      toast({
        title: "Error",
        description: "Failed to fetch shortlisted players",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const removeFromShortlist = async (shortlistId: string) => {
    try {
      const { error } = await supabase
        .from('shortlist')
        .delete()
        .eq('id', shortlistId);

      if (error) throw error;

      setShortlistedPitches(prev => prev.filter(item => item.id !== shortlistId));
      
      toast({
        title: "Success",
        description: "Player removed from shortlist",
      });
    } catch (error) {
      console.error('Error removing from shortlist:', error);
      toast({
        title: "Error",
        description: "Failed to remove player from shortlist",
        variant: "destructive"
      });
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDaysLeft = (expiresAt: string) => {
    const expires = new Date(expiresAt);
    const now = new Date();
    const diffInDays = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays <= 0) return 'Expired';
    if (diffInDays === 1) return '1 day left';
    return `${diffInDays} days left`;
  };

  if (loading) {
    return (
      <Card className="border-gray-700">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-48 bg-gray-700 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white font-polysans">
          <Heart className="w-5 h-5 text-bright-pink" />
          My Shortlist ({shortlistedPitches.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {shortlistedPitches.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="w-16 h-16 mx-auto mb-4 text-gray-500" />
            <h3 className="text-xl font-polysans font-semibold text-white mb-2">
              No Shortlisted Players
            </h3>
            <p className="text-gray-400 font-poppins">
              Start exploring the timeline to shortlist players you're interested in.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {shortlistedPitches.map((item) => (
              <Card key={item.id} className="border-gray-600 hover:border-rosegold/50 transition-colors">
                <CardContent className="p-4">
                  <div className="space-y-4">
                    {/* Player Header */}
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-700">
                        {item.players.headshot_url || item.players.photo_url ? (
                          <img
                            src={item.players.headshot_url || item.players.photo_url}
                            alt={item.players.full_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <User className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-polysans font-bold text-white text-sm">
                          {item.players.full_name}
                        </h3>
                        <p className="text-gray-300 font-poppins text-xs">
                          {item.players.position}
                        </p>
                      </div>
                      <Button
                        onClick={() => removeFromShortlist(item.id)}
                        size="sm"
                        variant="ghost"
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Team Info */}
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <MapPin className="h-3 w-3" />
                      <span>{item.transfer_pitches.teams.team_name}, {item.transfer_pitches.teams.country}</span>
                    </div>

                    {/* Transfer Info */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant={item.transfer_pitches.transfer_type === 'permanent' ? 'default' : 'secondary'}>
                          {item.transfer_pitches.transfer_type.toUpperCase()}
                        </Badge>
                        <div className="text-xs text-gray-400">
                          <Calendar className="h-3 w-3 inline mr-1" />
                          {formatDaysLeft(item.transfer_pitches.expires_at)}
                        </div>
                      </div>

                      {item.transfer_pitches.asking_price && (
                        <div className="flex items-center gap-1 text-bright-pink font-bold">
                          <DollarSign className="h-4 w-4" />
                          {formatCurrency(item.transfer_pitches.asking_price, item.transfer_pitches.currency)}
                        </div>
                      )}
                    </div>

                    {/* Notes */}
                    {item.notes && (
                      <div className="p-2 bg-gray-800 rounded text-xs text-gray-300">
                        {item.notes}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 bg-bright-pink hover:bg-bright-pink/90 text-white text-xs"
                      >
                        <MessageSquare className="h-3 w-3 mr-1" />
                        Message
                      </Button>
                    </div>
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

export default AgentShortlist;
