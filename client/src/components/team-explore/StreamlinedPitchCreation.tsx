import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Target, Clock } from 'lucide-react';

interface StreamlinedPitchCreationProps {
  isOpen?: boolean;
  onClose?: () => void;
  onPitchCreated?: () => void;
}

interface PitchFormData {
  playerId: string;
  transferType: 'permanent' | 'loan';
  askingPrice: string;
  currency: string;
  description: string;
  expiresAt: string;
}

interface Player {
  id: string;
  full_name: string;
  position: string;
  citizenship: string;
  photo_url?: string;
  jersey_number?: string;
}

const StreamlinedPitchCreation: React.FC<StreamlinedPitchCreationProps> = ({
  isOpen = true,
  onClose = () => { },
  onPitchCreated = () => { }
}) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);

  const [formData, setFormData] = useState<PitchFormData>({
    playerId: '',
    transferType: 'permanent',
    askingPrice: '',
    currency: 'USD',
    description: '',
    expiresAt: ''
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    fetchEligiblePlayers();
    setDefaultExpiryDate();
  }, []);

  const setDefaultExpiryDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setFormData(prev => ({
      ...prev,
      expiresAt: tomorrow.toISOString().split('T')[0]
    }));
  };

  const fetchEligiblePlayers = async () => {
    if (!profile?.id) return;

    try {
      const { data: team } = await supabase
        .from('teams')
        .select('id')
        .eq('profile_id', profile.id)
        .single();

      if (!team) return;

      // Simple query without complex filters
      const { data: players, error } = await supabase
        .from('players')
        .select('id, full_name, position, citizenship, photo_url')
        .eq('team_id', team.id);

      if (error) {
        console.error('Error fetching players:', error);
        return;
      }

      setPlayers(players || []);
    } catch (error) {
      console.error('Error fetching players:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!profile?.id) {
      toast({
        title: "Error",
        description: "Please log in to create a pitch",
        variant: "destructive"
      });
      return;
    }

    // Validate form
    const newErrors: { [key: string]: string } = {};
    if (!formData.playerId) newErrors.playerId = 'Please select a player';
    if (!formData.askingPrice) newErrors.askingPrice = 'Please enter asking price';
    if (!formData.description) newErrors.description = 'Please enter description';
    if (!formData.expiresAt) newErrors.expiresAt = 'Please select expiry date';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    try {
      const { data: team } = await supabase
        .from('teams')
        .select('id')
        .eq('profile_id', profile.id)
        .single();

      if (!team) {
        throw new Error('Team not found');
      }

      // Simplified pitch data with correct status type
      const pitchData = {
        team_id: team.id,
        player_id: formData.playerId,
        transfer_type: formData.transferType,
        asking_price: parseFloat(formData.askingPrice),
        currency: formData.currency,
        description: formData.description,
        expires_at: formData.expiresAt,
        status: 'active' as 'active' | 'expired' | 'completed' | 'cancelled'
      };

      const { error } = await supabase
        .from('transfer_pitches')
        .insert(pitchData);

      if (error) {
        throw error;
      }

      toast({
        title: "Success!",
        description: "Transfer pitch created successfully",
      });

      // Reset form
      setFormData({
        playerId: '',
        transferType: 'permanent',
        askingPrice: '',
        currency: 'USD',
        description: '',
        expiresAt: ''
      });

      onPitchCreated();
    } catch (error: any) {
      console.error('Error creating pitch:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create pitch",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof PitchFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="border-0">
        <CardHeader>
          <CardTitle className="text-white text-2xl flex items-center gap-2">
            <Target className="w-6 h-6" />
            Create Transfer Pitch
          </CardTitle>
          <p className="text-gray-400">
            Create a compelling transfer pitch to showcase your player to potential buyers
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Player Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Select Player *</label>
              <Select
                value={formData.playerId}
                onValueChange={(value) => handleInputChange('playerId', value)}
              >
                <SelectTrigger className="border-gray-600 bg-gray-800 text-white">
                  <SelectValue placeholder="Choose a player" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  {players.map((player) => (
                    <SelectItem key={player.id} value={player.id} className="text-white">
                      <div className="flex items-center gap-3">
                        {player.photo_url && (
                          <img
                            src={player.photo_url}
                            alt={player.full_name}
                            className="w-8 h-8 rounded-full"
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{player.full_name}</span>
                            {player.jersey_number && (
                              <Badge className="bg-bright-pink text-white text-xs px-1.5 py-0.5 font-bold">
                                #{player.jersey_number}
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-gray-400">
                            {player.position} • {player.citizenship}
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.playerId && (
                <p className="text-red-400 text-sm">{errors.playerId}</p>
              )}
            </div>

            {/* Transfer Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Transfer Type *</label>
              <Select
                value={formData.transferType}
                onValueChange={(value: 'permanent' | 'loan') => handleInputChange('transferType', value)}
              >
                <SelectTrigger className="border-gray-600 bg-gray-800 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="permanent" className="text-white">Permanent Transfer</SelectItem>
                  <SelectItem value="loan" className="text-white">Loan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Asking Price */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Asking Price *</label>
              <div className="flex gap-2">
                <Select
                  value={formData.currency}
                  onValueChange={(value) => handleInputChange('currency', value)}
                >
                  <SelectTrigger className="w-24 border-gray-600 bg-gray-800 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="USD" className="text-white">USD</SelectItem>
                    <SelectItem value="EUR" className="text-white">EUR</SelectItem>
                    <SelectItem value="GBP" className="text-white">GBP</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formData.askingPrice}
                  onChange={(e) => handleInputChange('askingPrice', e.target.value)}
                  className="border-gray-600 bg-gray-800 text-white"
                />
              </div>
              {errors.askingPrice && (
                <p className="text-red-400 text-sm">{errors.askingPrice}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Description *</label>
              <Textarea
                placeholder="Describe the player's strengths, achievements, and why they would be a great addition..."
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="border-gray-600 bg-gray-800 text-white min-h-[100px]"
              />
              {errors.description && (
                <p className="text-red-400 text-sm">{errors.description}</p>
              )}
            </div>

            {/* Expiry Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Expires At *</label>
              <Input
                type="date"
                value={formData.expiresAt}
                onChange={(e) => handleInputChange('expiresAt', e.target.value)}
                className="border-gray-600 bg-gray-800 text-white"
              />
              {errors.expiresAt && (
                <p className="text-red-400 text-sm">{errors.expiresAt}</p>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={loading}
                className="bg-rosegold hover:bg-rosegold/90 text-white flex-1"
              >
                {loading ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Target className="w-4 h-4 mr-2" />
                    Create Pitch
                  </>
                )}
              </Button>

              {onClose && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="border-gray-600 text-white"
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default StreamlinedPitchCreation;
