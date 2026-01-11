import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { TrendingUp, Save, Plus, Trash2 } from 'lucide-react';

interface PlayerStats {
  id?: string;
  player_id: string;
  season: string;
  league?: string;
  matches_played: number;
  goals: number;
  assists: number;
  yellow_cards: number;
  red_cards: number;
  minutes_played: number;
  clean_sheets: number;
  saves: number;
}

interface PlayerStatsManagerProps {
  playerId: string;
  playerName: string;
}

export const PlayerStatsManager: React.FC<PlayerStatsManagerProps> = ({
  playerId,
  playerName
}) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<PlayerStats[]>([]);
  const [newStat, setNewStat] = useState<PlayerStats>({
    player_id: playerId,
    season: '',
    league: '',
    matches_played: 0,
    goals: 0,
    assists: 0,
    yellow_cards: 0,
    red_cards: 0,
    minutes_played: 0,
    clean_sheets: 0,
    saves: 0
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPlayerStats();
  }, [playerId]);

  const fetchPlayerStats = async () => {
    try {
      const { data, error } = await supabase
        .from('player_performance' as any)
        .select('*')
        .eq('player_id', playerId)
        .order('season', { ascending: false });

      if (error) throw error;
      setStats(data || []);
    } catch (error) {
      console.error('Error fetching player stats:', error);
      toast({
        title: "Error",
        description: "Failed to load player statistics",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddStat = async () => {
    if (!newStat.season || !newStat.league) {
      toast({
        title: "Validation Error",
        description: "Season and league are required",
        variant: "destructive"
      });
      return;
    }

    try {
      setSaving(true);
      const { data, error } = await supabase
        .from('player_performance' as any)
        .insert({
          player_id: newStat.player_id,
          season: newStat.season,
          league: newStat.league,
          matches_played: newStat.matches_played,
          goals: newStat.goals,
          assists: newStat.assists,
          yellow_cards: newStat.yellow_cards,
          red_cards: newStat.red_cards,
          minutes_played: newStat.minutes_played,
          clean_sheets: newStat.clean_sheets,
          saves: newStat.saves
        } as any)
        .select()
        .single();

      if (error) throw error;

      setStats(prev => [data, ...prev]);
      setNewStat({
        player_id: playerId,
        season: '',
        league: '',
        matches_played: 0,
        goals: 0,
        assists: 0,
        yellow_cards: 0,
        red_cards: 0,
        minutes_played: 0,
        clean_sheets: 0,
        saves: 0
      });

      toast({
        title: "Success",
        description: "Player statistics added successfully"
      });
    } catch (error) {
      console.error('Error adding stats:', error);
      toast({
        title: "Error",
        description: "Failed to add statistics",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStat = async (statId: string) => {
    try {
      const { error } = await supabase
        .from('player_performance' as any)
        .delete()
        .eq('id', statId);

      if (error) throw error;

      setStats(prev => prev.filter(stat => stat.id !== statId));
      toast({
        title: "Success",
        description: "Statistics deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting stats:', error);
      toast({
        title: "Error",
        description: "Failed to delete statistics",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-700 rounded mb-4"></div>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-4 bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add New Statistics */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add Statistics for {playerName}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="season" className="text-white">Season *</Label>
              <Input
                id="season"
                value={newStat.season}
                onChange={(e) => setNewStat(prev => ({ ...prev, season: e.target.value }))}
                className="bg-gray-700 text-white border-gray-600"
                placeholder="2023-24"
              />
            </div>
            <div>
              <Label htmlFor="league" className="text-white">League *</Label>
              <Input
                id="league"
                value={newStat.league}
                onChange={(e) => setNewStat(prev => ({ ...prev, league: e.target.value }))}
                className="bg-gray-700 text-white border-gray-600"
                placeholder="Premier League"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-white">Matches</Label>
              <Input
                type="number"
                value={newStat.matches_played}
                onChange={(e) => setNewStat(prev => ({ ...prev, matches_played: parseInt(e.target.value) || 0 }))}
                className="bg-gray-700 text-white border-gray-600"
              />
            </div>
            <div>
              <Label className="text-white">Goals</Label>
              <Input
                type="number"
                value={newStat.goals}
                onChange={(e) => setNewStat(prev => ({ ...prev, goals: parseInt(e.target.value) || 0 }))}
                className="bg-gray-700 text-white border-gray-600"
              />
            </div>
            <div>
              <Label className="text-white">Assists</Label>
              <Input
                type="number"
                value={newStat.assists}
                onChange={(e) => setNewStat(prev => ({ ...prev, assists: parseInt(e.target.value) || 0 }))}
                className="bg-gray-700 text-white border-gray-600"
              />
            </div>
            <div>
              <Label className="text-white">Minutes</Label>
              <Input
                type="number"
                value={newStat.minutes_played}
                onChange={(e) => setNewStat(prev => ({ ...prev, minutes_played: parseInt(e.target.value) || 0 }))}
                className="bg-gray-700 text-white border-gray-600"
              />
            </div>
            <div>
              <Label className="text-white">Yellow Cards</Label>
              <Input
                type="number"
                value={newStat.yellow_cards}
                onChange={(e) => setNewStat(prev => ({ ...prev, yellow_cards: parseInt(e.target.value) || 0 }))}
                className="bg-gray-700 text-white border-gray-600"
              />
            </div>
            <div>
              <Label className="text-white">Red Cards</Label>
              <Input
                type="number"
                value={newStat.red_cards}
                onChange={(e) => setNewStat(prev => ({ ...prev, red_cards: parseInt(e.target.value) || 0 }))}
                className="bg-gray-700 text-white border-gray-600"
              />
            </div>
            <div>
              <Label className="text-white">Clean Sheets</Label>
              <Input
                type="number"
                value={newStat.clean_sheets}
                onChange={(e) => setNewStat(prev => ({ ...prev, clean_sheets: parseInt(e.target.value) || 0 }))}
                className="bg-gray-700 text-white border-gray-600"
              />
            </div>
            <div>
              <Label className="text-white">Saves</Label>
              <Input
                type="number"
                value={newStat.saves}
                onChange={(e) => setNewStat(prev => ({ ...prev, saves: parseInt(e.target.value) || 0 }))}
                className="bg-gray-700 text-white border-gray-600"
              />
            </div>
          </div>

          <Button
            onClick={handleAddStat}
            disabled={saving}
            className="bg-rosegold hover:bg-rosegold/90 text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Adding...' : 'Add Statistics'}
          </Button>
        </CardContent>
      </Card>

      {/* Existing Statistics */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Player Statistics History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No statistics recorded yet
            </div>
          ) : (
            <div className="space-y-4">
              {stats.map((stat) => (
                <div key={stat.id} className="bg-gray-700 p-4 rounded-lg">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="text-white font-semibold">{stat.season}</h4>
                      <p className="text-gray-300 text-sm">{stat.league}</p>
                    </div>
                    <Button
                      onClick={() => handleDeleteStat(stat.id!)}
                      variant="outline"
                      size="sm"
                      className="text-red-400 border-red-400 hover:bg-red-400 hover:text-white"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div className="text-center">
                      <div className="text-white font-semibold">{stat.matches_played}</div>
                      <div className="text-gray-400">Matches</div>
                    </div>
                    <div className="text-center">
                      <div className="text-white font-semibold">{stat.goals}</div>
                      <div className="text-gray-400">Goals</div>
                    </div>
                    <div className="text-center">
                      <div className="text-white font-semibold">{stat.assists}</div>
                      <div className="text-gray-400">Assists</div>
                    </div>
                    <div className="text-center">
                      <div className="text-white font-semibold">{stat.minutes_played}</div>
                      <div className="text-gray-400">Minutes</div>
                    </div>
                    <div className="text-center">
                      <div className="text-white font-semibold">{stat.yellow_cards}</div>
                      <div className="text-gray-400">Yellow</div>
                    </div>
                    <div className="text-center">
                      <div className="text-white font-semibold">{stat.red_cards}</div>
                      <div className="text-gray-400">Red</div>
                    </div>
                    <div className="text-center">
                      <div className="text-white font-semibold">{stat.clean_sheets}</div>
                      <div className="text-gray-400">Clean Sheets</div>
                    </div>
                    <div className="text-center">
                      <div className="text-white font-semibold">{stat.saves}</div>
                      <div className="text-gray-400">Saves</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
