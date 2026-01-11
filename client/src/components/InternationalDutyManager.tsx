import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Flag, Plus, Save, Trash2, Award } from 'lucide-react';

interface InternationalDuty {
  id?: string;
  player_id: string;
  season: string;
  category: string;
  country: string;
  debut_date?: string;
  appearances: number;
  goals: number;
  assists: number;
  yellow_cards: number;
  second_yellow_cards: number;
  red_cards: number;
}

interface InternationalDutyManagerProps {
  playerId: string;
  playerName: string;
}

export const InternationalDutyManager: React.FC<InternationalDutyManagerProps> = ({
  playerId,
  playerName
}) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [dutyRecords, setDutyRecords] = useState<InternationalDuty[]>([]);
  const [newRecord, setNewRecord] = useState<InternationalDuty>({
    player_id: playerId,
    season: '',
    category: '',
    country: '',
    debut_date: '',
    appearances: 0,
    goals: 0,
    assists: 0,
    yellow_cards: 0,
    second_yellow_cards: 0,
    red_cards: 0
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchInternationalDutyRecords();
  }, [playerId]);

  const fetchInternationalDutyRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('player_international_duty')
        .select('*')
        .eq('player_id', playerId)
        .order('season', { ascending: false });

      if (error) throw error;
      setDutyRecords(data || []);
    } catch (error) {
      console.error('Error fetching international duty records:', error);
      toast({
        title: "Error",
        description: "Failed to load international duty records",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddRecord = async () => {
    if (!newRecord.season || !newRecord.category || !newRecord.country) {
      toast({
        title: "Validation Error",
        description: "Season, category, and country are required",
        variant: "destructive"
      });
      return;
    }

    try {
      setSaving(true);
      const { data, error } = await supabase
        .from('player_international_duty')
        .insert({
          player_id: newRecord.player_id,
          season: newRecord.season,
          category: newRecord.category,
          country: newRecord.country,
          debut_date: newRecord.debut_date || null,
          appearances: newRecord.appearances,
          goals: newRecord.goals,
          assists: newRecord.assists,
          yellow_cards: newRecord.yellow_cards,
          second_yellow_cards: newRecord.second_yellow_cards,
          red_cards: newRecord.red_cards
        })
        .select()
        .single();

      if (error) throw error;

      setDutyRecords(prev => [data, ...prev]);
      setNewRecord({
        player_id: playerId,
        season: '',
        category: '',
        country: '',
        debut_date: '',
        appearances: 0,
        goals: 0,
        assists: 0,
        yellow_cards: 0,
        second_yellow_cards: 0,
        red_cards: 0
      });

      toast({
        title: "Success",
        description: "International duty record added successfully"
      });
    } catch (error) {
      console.error('Error adding international duty record:', error);
      toast({
        title: "Error",
        description: "Failed to add international duty record",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    try {
      const { error } = await supabase
        .from('player_international_duty')
        .delete()
        .eq('id', recordId);

      if (error) throw error;

      setDutyRecords(prev => prev.filter(record => record.id !== recordId));
      toast({
        title: "Success",
        description: "International duty record deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting international duty record:', error);
      toast({
        title: "Error",
        description: "Failed to delete international duty record",
        variant: "destructive"
      });
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'senior':
        return 'bg-green-100 text-green-800';
      case 'u21':
        return 'bg-blue-100 text-blue-800';
      case 'u19':
        return 'bg-yellow-100 text-yellow-800';
      case 'u17':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
      {/* Add New International Duty Record */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add International Duty Record for {playerName}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="season" className="text-white">Season *</Label>
              <Input
                id="season"
                value={newRecord.season}
                onChange={(e) => setNewRecord(prev => ({ ...prev, season: e.target.value }))}
                className="bg-gray-700 text-white border-gray-600"
                placeholder="2023-24"
              />
            </div>
            <div>
              <Label htmlFor="category" className="text-white">Category *</Label>
              <Select
                value={newRecord.category}
                onValueChange={(value) => setNewRecord(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger className="bg-gray-700 text-white border-gray-600">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Senior">Senior</SelectItem>
                  <SelectItem value="U21">U21</SelectItem>
                  <SelectItem value="U19">U19</SelectItem>
                  <SelectItem value="U17">U17</SelectItem>
                  <SelectItem value="U16">U16</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="country" className="text-white">Country *</Label>
              <Input
                id="country"
                value={newRecord.country}
                onChange={(e) => setNewRecord(prev => ({ ...prev, country: e.target.value }))}
                className="bg-gray-700 text-white border-gray-600"
                placeholder="Nigeria"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="debut_date" className="text-white">Debut Date</Label>
            <Input
              id="debut_date"
              type="date"
              value={newRecord.debut_date}
              onChange={(e) => setNewRecord(prev => ({ ...prev, debut_date: e.target.value }))}
              className="bg-gray-700 text-white border-gray-600"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-white">Appearances</Label>
              <Input
                type="number"
                value={newRecord.appearances}
                onChange={(e) => setNewRecord(prev => ({ ...prev, appearances: parseInt(e.target.value) || 0 }))}
                className="bg-gray-700 text-white border-gray-600"
              />
            </div>
            <div>
              <Label className="text-white">Goals</Label>
              <Input
                type="number"
                value={newRecord.goals}
                onChange={(e) => setNewRecord(prev => ({ ...prev, goals: parseInt(e.target.value) || 0 }))}
                className="bg-gray-700 text-white border-gray-600"
              />
            </div>
            <div>
              <Label className="text-white">Assists</Label>
              <Input
                type="number"
                value={newRecord.assists}
                onChange={(e) => setNewRecord(prev => ({ ...prev, assists: parseInt(e.target.value) || 0 }))}
                className="bg-gray-700 text-white border-gray-600"
              />
            </div>
            <div>
              <Label className="text-white">Yellow Cards</Label>
              <Input
                type="number"
                value={newRecord.yellow_cards}
                onChange={(e) => setNewRecord(prev => ({ ...prev, yellow_cards: parseInt(e.target.value) || 0 }))}
                className="bg-gray-700 text-white border-gray-600"
              />
            </div>
            <div>
              <Label className="text-white">Second Yellow Cards</Label>
              <Input
                type="number"
                value={newRecord.second_yellow_cards}
                onChange={(e) => setNewRecord(prev => ({ ...prev, second_yellow_cards: parseInt(e.target.value) || 0 }))}
                className="bg-gray-700 text-white border-gray-600"
              />
            </div>
            <div>
              <Label className="text-white">Red Cards</Label>
              <Input
                type="number"
                value={newRecord.red_cards}
                onChange={(e) => setNewRecord(prev => ({ ...prev, red_cards: parseInt(e.target.value) || 0 }))}
                className="bg-gray-700 text-white border-gray-600"
              />
            </div>
          </div>

          <Button
            onClick={handleAddRecord}
            disabled={saving}
            className="bg-rosegold hover:bg-rosegold/90 text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Adding...' : 'Add International Duty Record'}
          </Button>
        </CardContent>
      </Card>

      {/* Existing International Duty Records */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Flag className="w-5 h-5" />
            International Duty History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dutyRecords.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No international duty records found
            </div>
          ) : (
            <div className="space-y-4">
              {dutyRecords.map((record) => (
                <div key={record.id} className="bg-gray-700 p-4 rounded-lg">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="text-white font-semibold flex items-center gap-2">
                        <Flag className="w-4 h-4" />
                        {record.country} {record.category}
                      </h4>
                      <p className="text-gray-300 text-sm">{record.season}</p>
                      {record.debut_date && (
                        <p className="text-gray-400 text-xs">
                          Debut: {new Date(record.debut_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getCategoryColor(record.category)}`}>
                        {record.category}
                      </span>
                      <Button
                        onClick={() => handleDeleteRecord(record.id!)}
                        variant="outline"
                        size="sm"
                        className="text-red-400 border-red-400 hover:bg-red-400 hover:text-white"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    <div className="text-center">
                      <div className="text-white font-semibold">{record.appearances}</div>
                      <div className="text-gray-400">Appearances</div>
                    </div>
                    <div className="text-center">
                      <div className="text-white font-semibold">{record.goals}</div>
                      <div className="text-gray-400">Goals</div>
                    </div>
                    <div className="text-center">
                      <div className="text-white font-semibold">{record.assists}</div>
                      <div className="text-gray-400">Assists</div>
                    </div>
                    <div className="text-center">
                      <div className="text-white font-semibold">{record.yellow_cards}</div>
                      <div className="text-gray-400">Yellow Cards</div>
                    </div>
                    <div className="text-center">
                      <div className="text-white font-semibold">{record.second_yellow_cards}</div>
                      <div className="text-gray-400">Second Yellow</div>
                    </div>
                    <div className="text-center">
                      <div className="text-white font-semibold">{record.red_cards}</div>
                      <div className="text-gray-400">Red Cards</div>
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
