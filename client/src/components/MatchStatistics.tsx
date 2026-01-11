
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, Plus, Trash2 } from 'lucide-react';

interface PlayerWithJersey {
  playerId: string;
  playerName: string;
  jerseyNumber: number;
}

interface PlayerStats {
  playerId: string;
  playerName: string;
  jerseyNumber: number;
  goals: number;
  assists: number;
  yellowCards: number;
  secondYellows: number;
  redCards: number;
  minutesPlayed: number;
}

interface MatchStatisticsProps {
  taggedPlayers: PlayerWithJersey[];
  playerStats: PlayerStats[];
  onStatsChange: (stats: PlayerStats[]) => void;
}

export const MatchStatistics: React.FC<MatchStatisticsProps> = ({
  taggedPlayers,
  playerStats,
  onStatsChange
}) => {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');

  const addPlayerStats = () => {
    if (!selectedPlayerId) return;

    const player = taggedPlayers.find(p => p.playerId === selectedPlayerId);
    if (!player) return;

    // Check if player stats already exist
    if (playerStats.some(ps => ps.playerId === selectedPlayerId)) {
      return;
    }

    const newStats: PlayerStats = {
      playerId: player.playerId,
      playerName: player.playerName,
      jerseyNumber: player.jerseyNumber,
      goals: 0,
      assists: 0,
      yellowCards: 0,
      secondYellows: 0,
      redCards: 0,
      minutesPlayed: 90
    };

    onStatsChange([...playerStats, newStats]);
    setSelectedPlayerId('');
  };

  const updatePlayerStat = (playerId: string, field: keyof PlayerStats, value: number) => {
    const updatedStats = playerStats.map(stat => 
      stat.playerId === playerId 
        ? { ...stat, [field]: Math.max(0, value) }
        : stat
    );
    onStatsChange(updatedStats);
  };

  const removePlayerStats = (playerId: string) => {
    onStatsChange(playerStats.filter(stat => stat.playerId !== playerId));
  };

  const getTeamTotals = () => {
    return playerStats.reduce((totals, stat) => ({
      goals: totals.goals + stat.goals,
      assists: totals.assists + stat.assists,
      yellowCards: totals.yellowCards + stat.yellowCards,
      secondYellows: totals.secondYellows + stat.secondYellows,
      redCards: totals.redCards + stat.redCards
    }), {
      goals: 0,
      assists: 0,
      yellowCards: 0,
      secondYellows: 0,
      redCards: 0
    });
  };

  const teamTotals = getTeamTotals();

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <BarChart3 className="w-5 h-5 text-bright-pink" />
          Match Statistics
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Add Player Stats */}
        {taggedPlayers.length > 0 && (
          <div className="flex gap-3">
            <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white flex-1">
                <SelectValue placeholder="Add player stats" />
              </SelectTrigger>
              <SelectContent>
                {taggedPlayers
                  .filter(player => !playerStats.some(ps => ps.playerId === player.playerId))
                  .map((player) => (
                    <SelectItem key={player.playerId} value={player.playerId}>
                      #{player.jerseyNumber} {player.playerName}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            <Button
              onClick={addPlayerStats}
              disabled={!selectedPlayerId}
              className="bg-bright-pink hover:bg-bright-pink/90 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Stats
            </Button>
          </div>
        )}

        {/* Team Totals */}
        {playerStats.length > 0 && (
          <div className="bg-gray-700 rounded-lg p-4">
            <h4 className="text-white font-medium mb-3">Team Totals</h4>
            <div className="grid grid-cols-5 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-400">{teamTotals.goals}</div>
                <div className="text-xs text-gray-400">Goals</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-400">{teamTotals.assists}</div>
                <div className="text-xs text-gray-400">Assists</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-400">{teamTotals.yellowCards}</div>
                <div className="text-xs text-gray-400">Yellow</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-400">{teamTotals.secondYellows}</div>
                <div className="text-xs text-gray-400">2nd Yellow</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-400">{teamTotals.redCards}</div>
                <div className="text-xs text-gray-400">Red</div>
              </div>
            </div>
          </div>
        )}

        {/* Player Stats List */}
        {playerStats.length > 0 ? (
          <div className="space-y-3">
            {playerStats.map((stat) => (
              <div key={stat.playerId} className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-bright-pink border-bright-pink">
                      #{stat.jerseyNumber}
                    </Badge>
                    <span className="text-white font-medium">{stat.playerName}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                    onClick={() => removePlayerStats(stat.playerId)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Goals</label>
                    <Input
                      type="number"
                      min="0"
                      value={stat.goals}
                      onChange={(e) => updatePlayerStat(stat.playerId, 'goals', parseInt(e.target.value) || 0)}
                      className="bg-gray-600 border-gray-500 text-white h-8"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Assists</label>
                    <Input
                      type="number"
                      min="0"
                      value={stat.assists}
                      onChange={(e) => updatePlayerStat(stat.playerId, 'assists', parseInt(e.target.value) || 0)}
                      className="bg-gray-600 border-gray-500 text-white h-8"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Yellow</label>
                    <Input
                      type="number"
                      min="0"
                      max="2"
                      value={stat.yellowCards}
                      onChange={(e) => updatePlayerStat(stat.playerId, 'yellowCards', parseInt(e.target.value) || 0)}
                      className="bg-gray-600 border-gray-500 text-white h-8"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">2nd Yellow</label>
                    <Input
                      type="number"
                      min="0"
                      max="1"
                      value={stat.secondYellows}
                      onChange={(e) => updatePlayerStat(stat.playerId, 'secondYellows', parseInt(e.target.value) || 0)}
                      className="bg-gray-600 border-gray-500 text-white h-8"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Red</label>
                    <Input
                      type="number"
                      min="0"
                      max="1"
                      value={stat.redCards}
                      onChange={(e) => updatePlayerStat(stat.playerId, 'redCards', parseInt(e.target.value) || 0)}
                      className="bg-gray-600 border-gray-500 text-white h-8"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Minutes</label>
                    <Input
                      type="number"
                      min="0"
                      max="120"
                      value={stat.minutesPlayed}
                      onChange={(e) => updatePlayerStat(stat.playerId, 'minutesPlayed', parseInt(e.target.value) || 0)}
                      className="bg-gray-600 border-gray-500 text-white h-8"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No player statistics added yet</p>
            <p className="text-sm">Tag players first, then add their match stats</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
