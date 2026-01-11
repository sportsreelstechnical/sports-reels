import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Calendar, 
  MapPin, 
  DollarSign, 
  Eye, 
  MessageSquare,
  Star,
  Trophy,
  Activity,
  Target,
  TrendingUp,
  Users,
  Heart,
  Info
} from 'lucide-react';
import MessagePlayerModal from '@/components/MessagePlayerModal';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface TaggedPlayer {
  id: string;
  full_name: string;
  position: string;
  age: number;
  citizenship: string;
  market_value: number;
  current_club: string;
  contract_expires: string;
  foot: string;
  height: number;
  weight: number;
}

interface TransferPitch {
  id: string;
  asking_price: number;
  currency: string;
  transfer_type: string;
  expires_at: string;
  tagged_videos: any[];
}

interface PlayerData {
  id: string;
  full_name: string;
  position: string;
  age: number;
  citizenship: string;
  market_value: number;
  current_club: string;
  contract_expires: string;
  foot: string;
  height: number;
  weight: number;
  team?: {
    team_name: string;
    country: string;
  };
}

interface TaggedPlayerCardProps {
  playerId: string;
  requestId: string;
  onUntag: (playerId: string) => void;
}

const TaggedPlayerCard: React.FC<TaggedPlayerCardProps> = ({
  playerId,
  requestId,
  onUntag
}) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [player, setPlayer] = useState<TaggedPlayer | null>(null);
  const [transferPitch, setTransferPitch] = useState<TransferPitch | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMessageModal, setShowMessageModal] = useState(false);

  useEffect(() => {
    fetchPlayerData();
  }, [playerId]);

  const fetchPlayerData = async () => {
    try {
      setLoading(true);

      // Fetch player data
      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .select(`
          *,
          team:teams (
            team_name,
            country
          )
        `)
        .eq('id', playerId)
        .single();

      if (playerError) throw playerError;

      if (playerData) {
        setPlayer({
          id: playerData.id,
          full_name: playerData.full_name,
          position: playerData.position || 'Unknown',
          age: playerData.age || 25,
          citizenship: playerData.citizenship || 'Unknown',
          market_value: playerData.market_value || 0,
          current_club: playerData.current_club || 'Free Agent',
          contract_expires: playerData.contract_expires || 'N/A',
          foot: playerData.foot || 'Right',
          height: playerData.height || 180,
          weight: playerData.weight || 75
        });

        // Try to find associated transfer pitch
        const { data: pitchData } = await supabase
          .from('transfer_pitches')
          .select('*')
          .eq('player_id', playerId)
          .eq('status', 'active')
          .maybeSingle();

        if (pitchData) {
          setTransferPitch({
            id: pitchData.id,
            asking_price: pitchData.asking_price || 0,
            currency: pitchData.currency || 'USD',
            transfer_type: pitchData.transfer_type,
            expires_at: pitchData.expires_at,
            tagged_videos: Array.isArray(pitchData.tagged_videos) 
              ? pitchData.tagged_videos 
              : []
          });
        }
      }
    } catch (error) {
      console.error('Error fetching player data:', error);
      toast({
        title: "Error",
        description: "Failed to load player information",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewPlayer = () => {
    if (player?.id) {
      navigate(`/player/${player.id}`);
    }
  };

  const handleMessagePlayer = () => {
    setShowMessageModal(true);
  };

  if (loading) {
    return (
      <Card className="animate-pulse bg-gray-800 border-gray-700">
        <CardContent className="p-4">
          <div className="h-32 bg-gray-700 rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (!player) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-4 text-center">
          <Info className="w-8 h-8 mx-auto mb-2 text-gray-500" />
          <p className="text-gray-400">Player not found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-gray-800 border-gray-700 hover:border-bright-pink/50 transition-colors">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-bright-pink to-rosegold rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-white text-lg">{player.full_name}</CardTitle>
                <p className="text-gray-400 text-sm">{player.position}</p>
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onUntag(playerId)}
              className="text-gray-400 hover:text-red-400"
            >
              ✕
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 text-gray-300">
              <Calendar className="w-4 h-4" />
              <span>{player.age} years</span>
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <MapPin className="w-4 h-4" />
              <span>{player.citizenship}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <Users className="w-4 h-4" />
              <span>{player.current_club}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <DollarSign className="w-4 h-4" />
              <span>${(player.market_value / 1000000).toFixed(1)}M</span>
            </div>
          </div>

          {/* Transfer Pitch Info */}
          {transferPitch && (
            <div className="bg-gray-700 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant="secondary">{transferPitch.transfer_type}</Badge>
                <span className="text-bright-pink font-medium">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: transferPitch.currency,
                    minimumFractionDigits: 0
                  }).format(transferPitch.asking_price)}
                </span>
              </div>
              
              {transferPitch.tagged_videos && transferPitch.tagged_videos.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Activity className="w-3 h-3" />
                  <span>{transferPitch.tagged_videos.length} video{transferPitch.tagged_videos.length !== 1 ? 's' : ''} available</span>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button 
              size="sm" 
              variant="outline" 
              className="flex-1 text-xs"
              onClick={handleViewPlayer}
            >
              <Eye className="w-3 h-3 mr-1" />
              View Profile
            </Button>
            <Button 
              size="sm" 
              className="flex-1 bg-bright-pink hover:bg-bright-pink/90 text-white text-xs"
              onClick={handleMessagePlayer}
            >
              <MessageSquare className="w-3 h-3 mr-1" />
              Message
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Modals */}

      {showMessageModal && player && (
        <MessagePlayerModal
          isOpen={showMessageModal}
          onClose={() => setShowMessageModal(false)}
          player={{
            id: player.id,
            full_name: player.full_name,
            position: player.position
          }}
        />
      )}
    </>
  );
};

export default TaggedPlayerCard;
