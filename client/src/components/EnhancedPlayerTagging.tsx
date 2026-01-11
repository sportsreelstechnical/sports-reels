
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { User, Plus, X } from 'lucide-react';

interface PlayerWithJersey {
  playerId: string;
  playerName: string;
  jerseyNumber: number;
}

interface EnhancedPlayerTaggingProps {
  selectedPlayers: PlayerWithJersey[];
  onPlayersChange: (players: PlayerWithJersey[]) => void;
}

interface PlayerData {
  id: string;
  full_name: string;
  position: string;
  jersey_number?: number;
}

export const EnhancedPlayerTagging: React.FC<EnhancedPlayerTaggingProps> = ({
  selectedPlayers,
  onPlayersChange
}) => {
  const { profile } = useAuth();
  const [availablePlayers, setAvailablePlayers] = useState<PlayerData[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [jerseyNumber, setJerseyNumber] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlayers();
  }, [profile]);

  const fetchPlayers = async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);

      // Get team ID
      const { data: teamData } = await supabase
        .from('teams')
        .select('id')
        .eq('profile_id', profile.id)
        .single();

      if (!teamData) return;

      const { data, error } = await supabase
        .from('players')
        .select('id, full_name, position, jersey_number')
        .eq('team_id', teamData.id)
        .order('full_name');

      if (error) throw error;
      setAvailablePlayers(data || []);
    } catch (error) {
      console.error('Error fetching players:', error);
    } finally {
      setLoading(false);
    }
  };

  const addPlayer = () => {
    if (!selectedPlayerId || !jerseyNumber) return;

    const player = availablePlayers.find(p => p.id === selectedPlayerId);
    if (!player) return;

    const newPlayer: PlayerWithJersey = {
      playerId: player.id,
      playerName: player.full_name,
      jerseyNumber: parseInt(jerseyNumber)
    };

    // Check if player already tagged
    if (selectedPlayers.some(p => p.playerId === selectedPlayerId)) {
      return;
    }

    onPlayersChange([...selectedPlayers, newPlayer]);
    setSelectedPlayerId('');
    setJerseyNumber('');
  };

  const removePlayer = (playerId: string) => {
    onPlayersChange(selectedPlayers.filter(p => p.playerId !== playerId));
  };

  const getAvailableJerseyNumber = (playerId: string) => {
    const player = availablePlayers.find(p => p.id === playerId);
    return player?.jersey_number?.toString() || '';
  };

  const handlePlayerSelect = (playerId: string) => {
    setSelectedPlayerId(playerId);
    setJerseyNumber(getAvailableJerseyNumber(playerId));
  };

  if (loading) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-4">
          <div className="animate-pulse flex space-x-4">
            <div className="h-4 bg-gray-700 rounded w-1/4"></div>
            <div className="h-4 bg-gray-700 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <User className="w-5 h-5 text-bright-pink" />
          Tag Players (Jersey Numbers Required)
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Add Player Form */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Select value={selectedPlayerId} onValueChange={handlePlayerSelect}>
            <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
              <SelectValue placeholder="Select Player" />
            </SelectTrigger>
            <SelectContent>
              {availablePlayers
                .filter(player => !selectedPlayers.some(sp => sp.playerId === player.id))
                .map((player) => (
                  <SelectItem key={player.id} value={player.id}>
                    <div className="flex items-center gap-2">
                      <span>{player.full_name}</span>
                      {player.jersey_number && (
                        <Badge className="bg-bright-pink text-white text-xs px-1.5 py-0.5 font-bold">
                          #{player.jersey_number}
                        </Badge>
                      )}
                      <span className="text-gray-400">({player.position})</span>
                    </div>
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

          <Input
            type="number"
            placeholder="Jersey #"
            value={jerseyNumber}
            onChange={(e) => setJerseyNumber(e.target.value)}
            className="bg-gray-700 border-gray-600 text-white"
            min="1"
            max="99"
          />

          <Button
            onClick={addPlayer}
            disabled={!selectedPlayerId || !jerseyNumber}
            className="bg-bright-pink hover:bg-bright-pink/90 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Tag Player
          </Button>
        </div>

        {/* Tagged Players List */}
        {selectedPlayers.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-white font-medium">Tagged Players:</h4>
            <div className="flex flex-wrap gap-2">
              {selectedPlayers.map((player) => (
                <Badge
                  key={player.playerId}
                  variant="default"
                  className="bg-bright-pink hover:bg-bright-pink/90 text-white flex items-center gap-2 px-3 py-1"
                >
                  <span>#{player.jerseyNumber}</span>
                  <span>{player.playerName}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-white/20"
                    onClick={() => removePlayer(player.playerId)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {selectedPlayers.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No players tagged yet</p>
            <p className="text-sm">Select players and assign jersey numbers</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
