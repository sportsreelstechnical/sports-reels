import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { User, Save, Upload, X } from 'lucide-react';
import FifaIdIntegration from '@/components/FifaIdIntegration';
import { useDataChangeNotification } from '@/hooks/useDataChangeNotification';

interface EnhancedPlayerFormProps {
  player?: any;
  onPlayerSaved?: () => void;
  onCancel?: () => void;
}

export const EnhancedPlayerForm: React.FC<EnhancedPlayerFormProps> = ({
  player,
  onPlayerSaved,
  onCancel
}) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const { sendChangeNotification } = useDataChangeNotification();

  const [formData, setFormData] = useState({
    full_name: '',
    position: '',
    age: '',
    height: '',
    weight: '',
    citizenship: '',
    gender: 'male' as 'male' | 'female',
    date_of_birth: '',
    jersey_number: '',
    place_of_birth: '',
    foot: '',
    player_agent: '',
    current_club: '',
    joined_date: '',
    contract_expires: '',
    fifa_id: '',
    bio: '',
    market_value: '',
    headshot_url: '',
    portrait_url: '',
    full_body_url: '',
    photo_url: ''
  });

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [teamId, setTeamId] = useState<string>('');

  useEffect(() => {
    if (player) {
      setFormData({
        full_name: player.full_name || '',
        position: player.position || '',
        age: player.age?.toString() || '',
        height: player.height?.toString() || '',
        weight: player.weight?.toString() || '',
        citizenship: player.citizenship || '',
        gender: player.gender || 'male',
        date_of_birth: player.date_of_birth || '',
        jersey_number: player.jersey_number?.toString() || '',
        place_of_birth: player.place_of_birth || '',
        foot: player.foot || '',
        player_agent: player.player_agent || '',
        current_club: player.current_club || '',
        joined_date: player.joined_date || '',
        contract_expires: player.contract_expires || '',
        fifa_id: player.fifa_id || '',
        bio: player.bio || '',
        market_value: player.market_value?.toString() || '',
        headshot_url: player.headshot_url || '',
        portrait_url: player.portrait_url || '',
        full_body_url: player.full_body_url || '',
        photo_url: player.photo_url || ''
      });
    }
    fetchTeamId();
  }, [player]);

  const fetchTeamId = async () => {
    if (!profile?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('id')
        .eq('profile_id', profile.id)
        .single();

      if (error) throw error;
      if (data) setTeamId(data.id);
    } catch (error) {
      console.error('Error fetching team ID:', error);
    }
  };

  const handleImageUpload = async (file: File, type: string) => {
    if (!file || !teamId) return null;

    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${teamId}_${type}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('player-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('player-photos')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Upload Error",
        description: "Failed to upload image. Please try again.",
        variant: "destructive"
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamId) {
      toast({
        title: "Error",
        description: "Team information not found",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);

      const playerData = {
        team_id: teamId,
        full_name: formData.full_name,
        position: formData.position,
        age: formData.age ? parseInt(formData.age) : null,
        height: formData.height ? parseInt(formData.height) : null,
        weight: formData.weight ? parseInt(formData.weight) : null,
        citizenship: formData.citizenship,
        gender: formData.gender,
        date_of_birth: formData.date_of_birth || null,
        jersey_number: formData.jersey_number ? parseInt(formData.jersey_number) : null,
        place_of_birth: formData.place_of_birth || null,
        foot: formData.foot || null,
        player_agent: formData.player_agent || null,
        current_club: formData.current_club || null,
        joined_date: formData.joined_date || null,
        contract_expires: formData.contract_expires || null,
        fifa_id: formData.fifa_id || null,
        bio: formData.bio || null,
        market_value: formData.market_value ? parseFloat(formData.market_value) : null,
        headshot_url: formData.headshot_url || null,
        portrait_url: formData.portrait_url || null,
        full_body_url: formData.full_body_url || null,
        photo_url: formData.photo_url || null
      };

      let result;
      if (player?.id) {
        // Log activity for update
        const { PlayerActivityService } = await import('@/domains/players/services/playerActivityService');
        const activityService = new PlayerActivityService(teamId);
        
        const changedFields = PlayerActivityService.getChangedFields(player, playerData);
        if (changedFields.length > 0) {
          await activityService.logPlayerUpdated(player.id, player, playerData, changedFields);
        }

        result = await supabase
          .from('players')
          .update(playerData)
          .eq('id', player.id)
          .select()
          .single();
      } else {
        result = await supabase
          .from('players')
          .insert(playerData)
          .select()
          .single();

        // Log activity for creation
        if (result.data) {
          const { PlayerActivityService } = await import('@/domains/players/services/playerActivityService');
          const activityService = new PlayerActivityService(teamId);
          await activityService.logPlayerCreated(result.data);
        }
      }

      if (result.error) throw result.error;

      // Send data change notification
      if (profile?.email) {
        await sendChangeNotification({
          userId: profile.user_id,
          email: profile.email,
          changeType: player?.id ? 'Updated' : 'Created',
          entityType: 'player',
          entityName: formData.full_name
        });
      }

      toast({
        title: "Success",
        description: `Player ${player?.id ? 'updated' : 'created'} successfully`,
      });

      onPlayerSaved?.();
    } catch (error: any) {
      console.error('Error saving player:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save player",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFifaIdUpdate = (fifaId: string) => {
    setFormData(prev => ({ ...prev, fifa_id: fifaId }));
  };

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <User className="w-5 h-5" />
          {player?.id ? 'Edit Player' : 'Add New Player'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="full_name" className="text-white">Full Name *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                className="bg-gray-700 text-white border-gray-600"
                required
              />
            </div>
            <div>
              <Label htmlFor="position" className="text-white">Position *</Label>
              <Select
                value={formData.position}
                onValueChange={(value) => setFormData(prev => ({ ...prev, position: value }))}
              >
                <SelectTrigger className="bg-gray-700 text-white border-gray-600">
                  <SelectValue placeholder="Select position" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="goalkeeper">Goalkeeper</SelectItem>
                  <SelectItem value="defender">Defender</SelectItem>
                  <SelectItem value="midfielder">Midfielder</SelectItem>
                  <SelectItem value="forward">Forward</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Gender and Physical Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="gender" className="text-white">Gender *</Label>
              <Select
                value={formData.gender}
                onValueChange={(value: 'male' | 'female') => setFormData(prev => ({ ...prev, gender: value }))}
              >
                <SelectTrigger className="bg-gray-700 text-white border-gray-600">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="age" className="text-white">Age</Label>
              <Input
                id="age"
                type="number"
                value={formData.age}
                onChange={(e) => setFormData(prev => ({ ...prev, age: e.target.value }))}
                className="bg-gray-700 text-white border-gray-600"
              />
            </div>
            <div>
              <Label htmlFor="height" className="text-white">Height (cm)</Label>
              <Input
                id="height"
                type="number"
                value={formData.height}
                onChange={(e) => setFormData(prev => ({ ...prev, height: e.target.value }))}
                className="bg-gray-700 text-white border-gray-600"
              />
            </div>
            <div>
              <Label htmlFor="weight" className="text-white">Weight (kg)</Label>
              <Input
                id="weight"
                type="number"
                value={formData.weight}
                onChange={(e) => setFormData(prev => ({ ...prev, weight: e.target.value }))}
                className="bg-gray-700 text-white border-gray-600"
              />
            </div>
          </div>

          {/* FIFA ID Integration */}
          <FifaIdIntegration
            playerId={player?.id || ''}
            currentFifaId={formData.fifa_id}
            playerName={formData.full_name}
            onFifaIdUpdate={handleFifaIdUpdate}
          />

          {/* Bio */}
          <div>
            <Label htmlFor="bio" className="text-white">Biography</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
              className="bg-gray-700 text-white border-gray-600"
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={loading}
              className="bg-rosegold hover:bg-rosegold/90 text-white flex-1"
            >
              <Save className="w-4 h-4 mr-2" />
              {loading ? 'Saving...' : (player?.id ? 'Update Player' : 'Create Player')}
            </Button>
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
