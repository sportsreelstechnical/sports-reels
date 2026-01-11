import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Grid, List, MoreHorizontal, Edit, Eye, Tag, Trash2 } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';
import { useNavigate } from 'react-router-dom';
import { PlayerTagManager } from './PlayerTagManager';
import { TagBadge } from './TagBadge';
import { usePlayerTags } from '@/domains/players/hooks/usePlayerTags';

type DatabasePlayer = Tables<'players'>;

interface PlayerRosterViewProps {
  players: DatabasePlayer[];
  onEditPlayer: (player: DatabasePlayer) => void;
  onViewPlayer: (player: DatabasePlayer) => void;
  onDeletePlayer?: (player: DatabasePlayer) => void;
}

const PlayerRosterView: React.FC<PlayerRosterViewProps> = ({
  players,
  onEditPlayer,
  onViewPlayer,
  onDeletePlayer
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [sortBy, setSortBy] = useState<keyof DatabasePlayer>('full_name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedPlayerForTags, setSelectedPlayerForTags] = useState<string | null>(null);
  const navigate = useNavigate();

  const {
    availableTags,
    loading,
    createTag,
    getPlayerTags,
    addTagToPlayer,
    removeTagFromPlayer
  } = usePlayerTags();

  const getPlayerTags_Original = (player: DatabasePlayer) => {
    const tags: { label: string; color: string }[] = [];

    // Contract status tags
    if (player.contract_expires) {
      const expiryDate = new Date(player.contract_expires);
      const now = new Date();
      const monthsUntilExpiry = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30);

      if (monthsUntilExpiry < 0) {
        tags.push({ label: 'Contract Expired', color: 'bg-red-500' });
      } else if (monthsUntilExpiry < 6) {
        tags.push({ label: 'Expiring Soon', color: 'bg-yellow-500' });
      }
    }

    // Age-based tags
    if (player.age) {
      if (player.age < 21) {
        tags.push({ label: 'Youth Prospect', color: 'bg-blue-500' });
      } else if (player.age > 30) {
        tags.push({ label: 'Experienced', color: 'bg-purple-500' });
      }
    }

    // Market value tags
    if (player.market_value) {
      if (player.market_value > 1000000) {
        tags.push({ label: 'High Value', color: 'bg-green-500' });
      }
    }

    return tags;
  };

  const sortedPlayers = [...players].sort((a, b) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];

    if (aValue === null || aValue === undefined) return 1;
    if (bValue === null || bValue === undefined) return -1;

    let comparison = 0;
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      comparison = aValue.localeCompare(bValue);
    } else if (typeof aValue === 'number' && typeof bValue === 'number') {
      comparison = aValue - bValue;
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const handleSort = (column: keyof DatabasePlayer) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const handleViewPlayer = (player: DatabasePlayer) => {
    navigate(`/player/${player.id}`);
  };

  if (viewMode === 'table') {
    return (
      <Card className="border-gray-700">
        <CardHeader className="p-3 sm:p-4 md:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <CardTitle className="text-white font-polysans text-base sm:text-lg">Team Roster</CardTitle>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode('grid')}
                className="text-white border-gray-600 flex-1 sm:flex-initial text-xs sm:text-sm h-9 sm:h-10"
              >
                <Grid className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                <span className="hidden sm:inline">Grid View</span>
                <span className="sm:hidden">Grid</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode('table')}
                className="bg-rosegold text-white flex-1 sm:flex-initial text-xs sm:text-sm h-9 sm:h-10"
              >
                <List className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                <span className="hidden sm:inline">Table View</span>
                <span className="sm:hidden">Table</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-3 sm:p-4 md:p-6 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="text-white cursor-pointer hover:text-rosegold text-xs sm:text-sm"
                  onClick={() => handleSort('full_name')}
                >
                  Player {sortBy === 'full_name' && (sortOrder === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead
                  className="text-white cursor-pointer hover:text-rosegold text-xs sm:text-sm"
                  onClick={() => handleSort('position')}
                >
                  Position {sortBy === 'position' && (sortOrder === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead
                  className="text-white cursor-pointer hover:text-rosegold text-xs sm:text-sm"
                  onClick={() => handleSort('age')}
                >
                  Age {sortBy === 'age' && (sortOrder === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead
                  className="text-white cursor-pointer hover:text-rosegold text-xs sm:text-sm hidden md:table-cell"
                  onClick={() => handleSort('citizenship')}
                >
                  Nationality {sortBy === 'citizenship' && (sortOrder === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead
                  className="text-white cursor-pointer hover:text-rosegold text-xs sm:text-sm hidden lg:table-cell"
                  onClick={() => handleSort('contract_expires')}
                >
                  Contract {sortBy === 'contract_expires' && (sortOrder === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead
                  className="text-white cursor-pointer hover:text-rosegold text-xs sm:text-sm hidden lg:table-cell"
                  onClick={() => handleSort('market_value')}
                >
                  Value {sortBy === 'market_value' && (sortOrder === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead className="text-white text-xs sm:text-sm hidden xl:table-cell">Tags</TableHead>
                <TableHead className="text-white text-xs sm:text-sm">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPlayers.map((player) => {
                const systemTags = getPlayerTags_Original(player);
                const customTags = getPlayerTags(player.id);
                return (
                  <TableRow key={player.id} className="hover:bg-gray-800">
                    <TableCell className="text-white">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <Avatar className="h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0">
                          <AvatarImage src={player.headshot_url || player.photo_url || ''} />
                          <AvatarFallback className="bg-rosegold text-white text-[10px] sm:text-xs">
                            {player.full_name?.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-xs sm:text-sm truncate">{player.full_name}</div>
                          {player.jersey_number && (
                            <div className="text-[10px] sm:text-xs text-gray-400">#{player.jersey_number}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-white text-xs sm:text-sm">{player.position}</TableCell>
                    <TableCell className="text-white text-xs sm:text-sm">{player.age || '-'}</TableCell>
                    <TableCell className="text-white text-xs sm:text-sm hidden md:table-cell truncate">{player.citizenship}</TableCell>
                    <TableCell className="text-white text-xs sm:text-sm hidden lg:table-cell">
                      {player.contract_expires
                        ? new Date(player.contract_expires).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
                        : '-'
                      }
                    </TableCell>
                    <TableCell className="text-white text-xs sm:text-sm hidden lg:table-cell">
                      {player.market_value
                        ? `$${(player.market_value / 1000).toFixed(0)}k`
                        : '-'
                      }
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {/* Custom Tags */}
                        {customTags.map((tag) => (
                          <TagBadge key={tag.id} tag={tag} />
                        ))}
                        {/* System Tags */}
                        {systemTags.slice(0, 2).map((tag, index) => (
                          <Badge key={index} className={`${tag.color} text-white text-[10px] px-1.5`}>
                            {tag.label}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-white">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => handleViewPlayer(player)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onEditPlayer(player)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Player
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setSelectedPlayerForTags(player.id)}>
                            <Tag className="h-4 w-4 mr-2" />
                            Manage Tags
                          </DropdownMenuItem>
                          {onDeletePlayer && (
                            <DropdownMenuItem 
                              onClick={() => onDeletePlayer(player)}
                              className="text-red-400 focus:text-red-300"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Player
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>

        {/* Tag Management Dialog */}
        <Dialog open={!!selectedPlayerForTags} onOpenChange={() => setSelectedPlayerForTags(null)}>
          <DialogContent className="bg-gray-900 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-white">
                Manage Tags - {players.find(p => p.id === selectedPlayerForTags)?.full_name}
              </DialogTitle>
            </DialogHeader>
            {selectedPlayerForTags && (
              <PlayerTagManager
                playerId={selectedPlayerForTags}
                playerTags={getPlayerTags(selectedPlayerForTags)}
                availableTags={availableTags}
                onAddTag={addTagToPlayer}
                onRemoveTag={removeTagFromPlayer}
                onCreateTag={createTag}
                loading={loading}
              />
            )}
          </DialogContent>
        </Dialog>
      </Card>
    );
  }

  return (
    <Card className="border-gray-700">
      <CardHeader className="p-3 sm:p-4 md:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <CardTitle className="text-white font-polysans text-base sm:text-lg">Team Roster</CardTitle>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode('grid')}
              className="bg-rosegold text-white flex-1 sm:flex-initial text-xs sm:text-sm h-9 sm:h-10"
            >
              <Grid className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              <span className="hidden sm:inline">Grid View</span>
              <span className="sm:hidden">Grid</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode('table')}
              className="text-white border-gray-600 flex-1 sm:flex-initial text-xs sm:text-sm h-9 sm:h-10"
            >
              <List className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              <span className="hidden sm:inline">Table View</span>
              <span className="sm:hidden">Table</span>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-3 sm:p-4 md:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {sortedPlayers.map((player) => {
            const systemTags = getPlayerTags_Original(player);
            const customTags = getPlayerTags(player.id);
            return (
              <Card key={player.id} className="bg-gray-800 border-gray-700 hover:border-rosegold transition-colors">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                    <Avatar className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
                      <AvatarImage src={player.headshot_url || player.photo_url || ''} />
                      <AvatarFallback className="bg-rosegold text-white text-xs sm:text-sm">
                        {player.full_name?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 sm:gap-2 mb-0.5 sm:mb-1">
                        <h3 className="text-white font-semibold text-xs sm:text-sm truncate">{player.full_name}</h3>
                        {player.status === 'transferred' && (
                          <Badge className="bg-red-600 text-white text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 flex-shrink-0">
                            TRANSFERRED
                          </Badge>
                        )}
                      </div>
                      <p className="text-gray-400 text-[10px] sm:text-xs truncate">{player.position}</p>
                      {player.jersey_number && (
                        <p className="text-rosegold text-[10px] sm:text-xs">#{player.jersey_number}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5 sm:space-y-2 text-[10px] sm:text-xs text-gray-300">
                    <div className="flex justify-between">
                      <span>Age:</span>
                      <span>{player.age || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Nationality:</span>
                      <span className="truncate ml-2">{player.citizenship}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Market Value:</span>
                      <span>{player.market_value ? `$${(player.market_value / 1000).toFixed(0)}k` : '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Contract:</span>
                      <span>
                        {player.contract_expires
                          ? new Date(player.contract_expires).getFullYear()
                          : '-'
                        }
                      </span>
                    </div>
                  </div>

                  {/* Player Tags */}
                  {(customTags.length > 0 || systemTags.length > 0) && (
                    <div className="flex flex-wrap gap-1 mt-2 sm:mt-3">
                      {/* Custom Tags First */}
                      {customTags.map((tag) => (
                        <TagBadge key={tag.id} tag={tag} />
                      ))}
                      {/* System Tags */}
                      {systemTags.map((tag, index) => (
                        <Badge key={index} className={`${tag.color} text-white text-[9px] sm:text-[10px] px-1.5`}>
                          {tag.label}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-1.5 sm:gap-2 mt-3 sm:mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewPlayer(player)}
                      className="flex-1 text-white border-gray-600 hover:bg-rosegold text-[10px] sm:text-xs h-8 sm:h-9 px-2"
                    >
                      <Eye className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEditPlayer(player)}
                      className="text-white border-gray-600 hover:bg-rosegold text-[10px] sm:text-xs h-8 sm:h-9 px-2"
                    >
                      <Edit className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedPlayerForTags(player.id)}
                      className="text-white border-gray-600 hover:bg-bright-pink text-[10px] sm:text-xs h-8 sm:h-9 px-2"
                    >
                      <Tag className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Tag Management Dialog */}
        <Dialog open={!!selectedPlayerForTags} onOpenChange={() => setSelectedPlayerForTags(null)}>
          <DialogContent className="bg-gray-900 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-white">
                Manage Tags - {players.find(p => p.id === selectedPlayerForTags)?.full_name}
              </DialogTitle>
            </DialogHeader>
            {selectedPlayerForTags && (
              <PlayerTagManager
                playerId={selectedPlayerForTags}
                playerTags={getPlayerTags(selectedPlayerForTags)}
                availableTags={availableTags}
                onAddTag={addTagToPlayer}
                onRemoveTag={removeTagFromPlayer}
                onCreateTag={createTag}
                loading={loading}
              />
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default PlayerRosterView;
