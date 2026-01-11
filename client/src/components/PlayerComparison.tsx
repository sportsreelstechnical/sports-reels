
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, X, Plus } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';

type DatabasePlayer = Database['public']['Tables']['players']['Row'] & {
  headshot_url?: string | null;
  jersey_number?: number | null;
  height?: number | null;
  foot?: string | null;
  status?: string | null;
};

interface PlayerComparisonProps {
  players: DatabasePlayer[];
  isOpen: boolean;
  onClose: () => void;
}

const PlayerComparison: React.FC<PlayerComparisonProps> = ({
  players,
  isOpen,
  onClose
}) => {
  const [selectedPlayers, setSelectedPlayers] = useState<DatabasePlayer[]>([]);

  const addPlayerToComparison = (playerId: string) => {
    if (selectedPlayers.length >= 3) return;

    const player = players.find(p => p.id === playerId);
    if (player && !selectedPlayers.find(p => p.id === playerId)) {
      setSelectedPlayers([...selectedPlayers, player]);
    }
  };

  const removePlayerFromComparison = (playerId: string) => {
    setSelectedPlayers(selectedPlayers.filter(p => p.id !== playerId));
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'string' || typeof value === 'number') return String(value);
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const getComparisonData = () => [
    { label: 'Full Name', key: 'full_name' },
    { label: 'Position', key: 'position' },
    { label: 'Age', key: 'age' },
    { label: 'Height (cm)', key: 'height' },
    { label: 'Weight (kg)', key: 'weight' },
    { label: 'Nationality', key: 'citizenship' },
    { label: 'Jersey Number', key: 'jersey_number' },
    { label: 'Market Value', key: 'market_value', format: (value: any) => value ? `$${value.toLocaleString()}` : '-' },
    { label: 'Contract Expires', key: 'contract_expires', format: (value: any) => value ? new Date(value).toLocaleDateString() : '-' },
    { label: 'Current Club', key: 'current_club' },
    { label: 'Preferred Foot', key: 'foot' },
    { label: 'Place of Birth', key: 'place_of_birth' }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <Card className="w-full max-w-6xl max-h-[90vh] overflow-auto bg-[#111111] border-0">
        <CardHeader className="p-3 sm:p-4 md:p-6 bg-[#111111]">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-white font-polysans flex items-center gap-2 text-base sm:text-lg md:text-xl">
              <div className="bg-rosegold/20 p-1.5 sm:p-2 rounded-lg">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-rosegold" />
              </div>
              <span className="hidden sm:inline">Player Comparison</span>
              <span className="sm:hidden">Compare</span>
            </CardTitle>
            <Button
              variant="ghost"
              onClick={onClose}
              className="text-white h-8 w-8 sm:h-10 sm:w-10 p-0 rounded-lg border-0"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6">
          {/* Player Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            {[0, 1, 2].map((index) => (
              <div key={index} className="space-y-2 sm:space-y-3">
                {selectedPlayers[index] ? (
                  <div className="bg-[#1a1a1a] p-3 sm:p-4 rounded-xl border-0">
                    <div className="flex items-center justify-between mb-2 sm:mb-3 gap-2">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        <Avatar className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
                          <AvatarImage src={selectedPlayers[index].headshot_url || selectedPlayers[index].photo_url || ''} />
                          <AvatarFallback className="bg-rosegold text-white text-xs sm:text-sm font-bold border-0">
                            {selectedPlayers[index].full_name?.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-white font-semibold text-xs sm:text-sm truncate">{selectedPlayers[index].full_name}</h3>
                          <p className="text-white/60 text-[10px] sm:text-xs truncate">{selectedPlayers[index].position}</p>
                          {selectedPlayers[index].jersey_number && (
                            <Badge className="bg-rosegold/20 text-rosegold border-0 text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0 mt-1">
                              #{selectedPlayers[index].jersey_number}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removePlayerFromComparison(selectedPlayers[index].id)}
                        className="text-red-400 h-7 w-7 sm:h-8 sm:w-8 p-0 flex-shrink-0 rounded-lg border-0"
                      >
                        <X className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#1a1a1a] p-3 sm:p-4 rounded-xl border-0">
                    <Select onValueChange={addPlayerToComparison}>
                      <SelectTrigger className="bg-[#111111] text-white border-0 text-xs sm:text-sm h-9 sm:h-10">
                        <SelectValue placeholder={`Select Player ${index + 1}`} />
                      </SelectTrigger>
                      <SelectContent className="bg-[#111111] border-0">
                        {players
                          .filter(player => !selectedPlayers.find(sp => sp.id === player.id))
                          .map(player => (
                            <SelectItem key={player.id} value={player.id} className="text-xs sm:text-sm text-white border-0">
                              <div className="flex items-center gap-1 sm:gap-2">
                                <span className="truncate">{player.full_name}</span>
                                {player.jersey_number && (
                                  <Badge className="bg-bright-pink text-white text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 font-bold flex-shrink-0 border-0">
                                    #{player.jersey_number}
                                  </Badge>
                                )}
                                <span className="text-white/60 text-[10px] sm:text-xs">- {player.position}</span>
                              </div>
                            </SelectItem>
                          ))
                        }
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Comparison Table */}
          {selectedPlayers.length >= 2 && (
            <div className="overflow-x-auto -mx-3 sm:-mx-4 md:-mx-6 px-3 sm:px-4 md:px-6 rounded-xl">
              <table className="w-full border-collapse min-w-[500px] rounded-xl overflow-hidden">
                <thead>
                  <tr className="bg-[#1a1a1a]">
                    <th className="text-left text-white font-semibold p-2 sm:p-3 text-xs sm:text-sm sticky left-0 bg-[#1a1a1a]">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-4 bg-rosegold rounded-full"></div>
                        Attribute
                      </div>
                    </th>
                    {selectedPlayers.map((player, index) => (
                      <th key={index} className="text-center text-white font-semibold p-2 sm:p-3 text-xs sm:text-sm">
                        <div className="truncate max-w-[120px] sm:max-w-none font-bold">{player.full_name}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {getComparisonData().map((row, rowIndex) => (
                    <tr
                      key={rowIndex}
                      className={`${rowIndex % 2 === 0 ? 'bg-[#111111]' : 'bg-[#1a1a1a]'}`}
                    >
                      <td className="text-white font-medium p-2 sm:p-3 text-xs sm:text-sm sticky left-0 bg-inherit">
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-1 bg-white/40 rounded-full"></div>
                          {row.label}
                        </div>
                      </td>
                      {selectedPlayers.map((player, playerIndex) => {
                        const value = player[row.key as keyof DatabasePlayer];
                        const displayValue = row.format ? row.format(value) : formatValue(value);

                        return (
                          <td key={playerIndex} className="text-center text-white/80 p-2 sm:p-3 text-xs sm:text-sm">
                            <div className="truncate font-medium">{displayValue}</div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {selectedPlayers.length < 2 && (
            <div className="text-center py-6 sm:py-8">
              <div className="text-gray-400 text-base sm:text-lg mb-2">
                Select at least 2 players to compare
              </div>
              <div className="text-gray-500 text-xs sm:text-sm">
                You can compare up to 3 players side by side
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PlayerComparison;
