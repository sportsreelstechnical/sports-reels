import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CountrySelect } from '@/components/ui/CountrySelect';
import { LeagueSelect } from '@/components/ui/LeagueSelect';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { useSports } from '@/hooks/useSports';
import { useSportData, getSportDisplayName, getSportIcon } from '@/hooks/useSportData';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, X, Upload, MapPin, Trophy, Users, Calendar, DollarSign, Flag, Image, FileImage } from 'lucide-react';

type DatabasePlayer = Tables<'players'>;

interface PlayerFormProps {
  player?: DatabasePlayer | null;
  onSave: () => void;
  onCancel: () => void;
  teamId: string;
}


interface TransferHistory {
  year: string;
  club: string;
  transfer_value: string;
}

interface InternationalDuty {
  season: string;
  category: string;
  country: string;
  debut: string;
  appearances: number;
  goals: number;
  assists: number;
  yellow_cards: number;
  second_yellow: number;
  red_cards: number;
}

const PlayerForm: React.FC<PlayerFormProps> = ({ player, onSave, onCancel, teamId }) => {
  const { toast } = useToast();
  const { profile } = useAuth();
  const { sports } = useSports();
  const [loading, setLoading] = useState(false);
  const [teamSport, setTeamSport] = useState<string>('');
  const [activeTab, setActiveTab] = useState('basic');
  const [formData, setFormData] = useState({
    full_name: player?.full_name || '',
    position: player?.position || '',
    jersey_number: player?.jersey_number?.toString() || '',
    date_of_birth: player?.date_of_birth || '',
    citizenship: player?.citizenship || '',
    place_of_birth: player?.place_of_birth || '',
    height: player?.height?.toString() || '',
    weight: player?.weight?.toString() || '',
    foot: player?.foot || '',
    fifa_id: player?.fifa_id || '',
    bio: player?.bio || '',
    market_value: player?.market_value?.toString() || '',
    player_agent: player?.player_agent || '',
    current_club: player?.current_club || '',
    contract_expires: player?.contract_expires || '',
    joined_date: player?.joined_date || '',
    gender: player?.gender || 'male' as const,
    photo_url: player?.photo_url || '',
    headshot_url: player?.headshot_url || '',
    portrait_url: player?.portrait_url || '',
    full_body_url: player?.full_body_url || '',
    leagues_participated: player?.leagues_participated || [],
    titles_seasons: player?.titles_seasons || [],
    transfer_history: Array.isArray(player?.transfer_history) ? (player.transfer_history as unknown as TransferHistory[]) : [],
    international_duty: Array.isArray(player?.international_duty) ? (player.international_duty as unknown as InternationalDuty[]) : [],
    match_stats: player?.match_stats || null
  });

  const [newLeague, setNewLeague] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newTransfer, setNewTransfer] = useState({ year: '', club: '', transfer_value: '' });
  const [newInternational, setNewInternational] = useState({
    season: '', category: '', country: '', debut: '', appearances: 0, goals: 0, assists: 0, yellow_cards: 0, second_yellow: 0, red_cards: 0
  });

  // File upload states
  const [uploadingFiles, setUploadingFiles] = useState({
    photo: false,
    headshot: false,
    portrait: false,
    fullBody: false
  });

  // Get sport-specific data based on team sport and player gender
  const sportData = useSportData(teamSport, formData.gender);

  useEffect(() => {
    fetchTeamSport();
  }, [teamId]);

  const fetchTeamSport = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('sport_type')
        .eq('id', teamId)
        .single();

      if (error) {
        console.error('Error fetching team sport:', error);
        return;
      }

      setTeamSport(data.sport_type);
    } catch (error) {
      console.error('Error fetching team sport:', error);
    }
  };

  // Helper function to check if sport is football
  const isFootballSport = (sportType: string): boolean => {
    return sportType === 'football';
  };

  // Image compression function using FileReader and Canvas
  const compressImage = (file: File, maxWidth: number = 800, quality: number = 0.8): Promise<string> => {
    return new Promise((resolve, reject) => {
      console.log('Starting compression for file:', file.name, 'Size:', file.size);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        console.error('Canvas context not available');
        reject(new Error('Canvas context not available'));
        return;
      }

      // Use FileReader to read the file
      const reader = new FileReader();

      reader.onload = (e) => {
        console.log('FileReader loaded, creating image...');
        const img = new window.Image();

        img.onload = () => {
          try {
            console.log('Image loaded, original dimensions:', img.width, 'x', img.height);

            // Calculate new dimensions
            let { width, height } = img;

            if (width > maxWidth) {
              height = (height * maxWidth) / width;
              width = maxWidth;
              console.log('Resizing to:', width, 'x', height);
            }

            // Set canvas dimensions
            canvas.width = width;
            canvas.height = height;

            // Draw and compress
            ctx.drawImage(img, 0, 0, width, height);
            console.log('Image drawn to canvas');

            // Convert to base64 with compression
            const base64 = canvas.toDataURL('image/jpeg', quality);
            console.log('Base64 generated, length:', base64.length);
            resolve(base64);
          } catch (error) {
            console.error('Error in image processing:', error);
            reject(new Error('Failed to process image: ' + error));
          }
        };

        img.onerror = (error) => {
          console.error('Image load error:', error);
          reject(new Error('Failed to load image'));
        };

        console.log('Setting image source...');
        img.src = e.target?.result as string;
      };

      reader.onerror = (error) => {
        console.error('FileReader error:', error);
        reject(new Error('Failed to read file'));
      };

      console.log('Starting FileReader...');
      reader.readAsDataURL(file);
    });
  };

  // File upload handler with base64 compression
  const handleFileUpload = async (file: File, fieldName: 'photo_url' | 'headshot_url' | 'portrait_url' | 'full_body_url') => {
    console.log('File upload started:', { file, fieldName, fileSize: file.size, fileType: file.type });

    if (!file) {
      console.log('No file provided');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      console.log('Invalid file type:', file.type);
      toast({
        title: "Invalid File Type",
        description: "Please upload an image file (JPG, PNG, GIF, etc.)",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 5MB before compression)
    if (file.size > 5 * 1024 * 1024) {
      console.log('File too large:', file.size);
      toast({
        title: "File Too Large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('Starting image compression...');
      setUploadingFiles(prev => ({ ...prev, [fieldName.replace('_url', '')]: true }));

      // Compress image to base64
      const compressedBase64 = await compressImage(file, 800, 0.8);
      console.log('Image compressed successfully, base64 length:', compressedBase64.length);

      // Update form data with the compressed base64 image
      setFormData(prev => {
        const updated = {
          ...prev,
          [fieldName]: compressedBase64
        };
        console.log('Form data updated:', { fieldName, hasValue: !!updated[fieldName] });
        return updated;
      });

      toast({
        title: "Image Processed",
        description: `${fieldName.replace('_url', '').replace('_', ' ')} compressed and ready`,
      });

    } catch (error: any) {
      console.error('Error processing image:', error);
      toast({
        title: "Processing Failed",
        description: `Failed to process ${fieldName.replace('_url', '').replace('_', ' ')}: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setUploadingFiles(prev => ({ ...prev, [fieldName.replace('_url', '')]: false }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.full_name || !formData.position || !formData.citizenship) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields (Name, Position, Citizenship)",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const playerData = {
        team_id: teamId,
        full_name: formData.full_name,
        position: formData.position,
        jersey_number: formData.jersey_number ? parseInt(formData.jersey_number) : null,
        date_of_birth: formData.date_of_birth || null,
        citizenship: formData.citizenship,
        place_of_birth: formData.place_of_birth || null,
        height: formData.height ? parseInt(formData.height) : null,
        weight: formData.weight ? parseInt(formData.weight) : null,
        foot: isFootballSport(teamSport) ? formData.foot || null : null,
        fifa_id: isFootballSport(teamSport) ? formData.fifa_id || null : null,
        bio: formData.bio || null,
        market_value: formData.market_value ? parseFloat(formData.market_value) : null,
        player_agent: formData.player_agent || null,
        current_club: formData.current_club || null,
        contract_expires: formData.contract_expires || null,
        joined_date: formData.joined_date || null,
        gender: formData.gender,
        photo_url: formData.photo_url || null,
        headshot_url: formData.headshot_url || null,
        portrait_url: formData.portrait_url || null,
        full_body_url: formData.full_body_url || null,
        leagues_participated: formData.leagues_participated,
        titles_seasons: formData.titles_seasons,
        transfer_history: formData.transfer_history as any,
        international_duty: formData.international_duty as any,
        match_stats: formData.match_stats
      };

      let result;
      if (player) {
        // Log activity for update
        const { PlayerActivityService } = await import('@/domains/players/services/playerActivityService');
        const activityService = new PlayerActivityService(teamId, profile?.id || '');

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
          const activityService = new PlayerActivityService(teamId, profile?.id || '');
          await activityService.logPlayerCreated(result.data);
        }
      }

      if (result.error) throw result.error;

      toast({
        title: "Success",
        description: `Player ${player ? 'updated' : 'created'} successfully`,
      });

      onSave();
    } catch (error: any) {
      console.error('Error saving player:', error);
      toast({
        title: "Error",
        description: `Failed to ${player ? 'update' : 'create'} player: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addLeague = () => {
    if (newLeague && !formData.leagues_participated.includes(newLeague)) {
      setFormData({
        ...formData,
        leagues_participated: [...formData.leagues_participated, newLeague]
      });
      setNewLeague('');
    }
  };

  const removeLeague = (league: string) => {
    setFormData({
      ...formData,
      leagues_participated: formData.leagues_participated.filter(l => l !== league)
    });
  };

  const addTitle = () => {
    if (newTitle && !formData.titles_seasons.includes(newTitle)) {
      setFormData({
        ...formData,
        titles_seasons: [...formData.titles_seasons, newTitle]
      });
      setNewTitle('');
    }
  };

  const removeTitle = (title: string) => {
    setFormData({
      ...formData,
      titles_seasons: formData.titles_seasons.filter(t => t !== title)
    });
  };

  const addTransfer = () => {
    if (newTransfer.year && newTransfer.club) {
      setFormData({
        ...formData,
        transfer_history: [...formData.transfer_history, { ...newTransfer }]
      });
      setNewTransfer({ year: '', club: '', transfer_value: '' });
    }
  };

  const removeTransfer = (index: number) => {
    setFormData({
      ...formData,
      transfer_history: formData.transfer_history.filter((_, i) => i !== index)
    });
  };

  const addInternational = () => {
    if (newInternational.season && newInternational.country) {
      setFormData({
        ...formData,
        international_duty: [...formData.international_duty, { ...newInternational }]
      });
      setNewInternational({
        season: '', category: '', country: '', debut: '', appearances: 0, goals: 0, assists: 0, yellow_cards: 0, second_yellow: 0, red_cards: 0
      });
    }
  };

  const removeInternational = (index: number) => {
    setFormData({
      ...formData,
      international_duty: formData.international_duty.filter((_, i) => i !== index)
    });
  };

  const isFootball = isFootballSport(teamSport);

  return (
    <Card className="w-full max-w-6xl mx-auto bg-[#1a1a1a] border-0">
      <CardHeader className="p-3 sm:p-4 md:p-6">
        <CardTitle className="text-white font-polysans flex flex-wrap items-center gap-2 text-base sm:text-lg md:text-xl">
          <span>{getSportIcon(teamSport)}</span>
          {player ? 'Edit Player Profile' : 'Add New Player'}
          {teamSport && (
            <Badge variant="outline" className="ml-0 sm:ml-2 text-rosegold border-rosegold text-xs sm:text-sm">
              {getSportDisplayName(teamSport)}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 md:p-6">
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 bg-card border-0 gap-1 p-1 h-auto">
              <TabsTrigger
                value="basic"
                className="data-[state=active]:bg-rosegold data-[state=active]:text-white text-xs sm:text-sm px-2 py-2 min-h-[44px]"
              >
                <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
                <span className="hidden sm:inline">Basic Info</span>
                <span className="sm:hidden">Basic</span>
              </TabsTrigger>
              <TabsTrigger
                value="career"
                className="data-[state=active]:bg-rosegold data-[state=active]:text-white text-xs sm:text-sm px-2 py-2 min-h-[44px]"
              >
                <Trophy className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
                Career
              </TabsTrigger>
              <TabsTrigger
                value="international"
                className="data-[state=active]:bg-rosegold data-[state=active]:text-white text-xs sm:text-sm px-2 py-2 min-h-[44px]"
              >
                <Flag className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
                <span className="hidden sm:inline">International</span>
                <span className="sm:hidden">Intl</span>
              </TabsTrigger>
              <TabsTrigger
                value="media"
                className="data-[state=active]:bg-rosegold data-[state=active]:text-white text-xs sm:text-sm px-2 py-2 min-h-[44px]"
              >
                <Upload className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
                Media
              </TabsTrigger>
            </TabsList>

            {/* Basic Information Tab */}
            <TabsContent value="basic" className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
                <div className="space-y-2">
                  <Label htmlFor="full_name" className="text-white">Full Name *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="bg-[#111111] border-0 text-white"
                    placeholder="Player's full name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="position" className="text-white">Primary Position *</Label>
                  <Select value={formData.position} onValueChange={(value) => setFormData({ ...formData, position: value })}>
                    <SelectTrigger className="bg-[#111111] border-0 text-white">
                      <SelectValue placeholder="Select position" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1a] border-0">
                      {sportData.positions.map((position) => (
                        <SelectItem key={position} value={position} className="text-white">
                          {position}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="jersey_number" className="text-white">Jersey Number</Label>
                  <Input
                    id="jersey_number"
                    type="number"
                    min="1"
                    max="99"
                    value={formData.jersey_number}
                    onChange={(e) => setFormData({ ...formData, jersey_number: e.target.value })}
                    className="bg-[#111111] border-0 text-white"
                    placeholder="1-99"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-white">Gender *</Label>
                  <Select value={formData.gender} onValueChange={(value: 'male' | 'female') => setFormData({ ...formData, gender: value })}>
                    <SelectTrigger className="bg-[#111111] border-0 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1a] border-0">
                      <SelectItem value="male" className="text-white">Male</SelectItem>
                      <SelectItem value="female" className="text-white">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date_of_birth" className="text-white">Date of Birth</Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                    className="bg-[#111111] border-0 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="citizenship" className="text-white">Citizenship *</Label>
                  <CountrySelect
                    value={formData.citizenship}
                    onValueChange={(value) => setFormData({ ...formData, citizenship: value })}
                    placeholder="Select citizenship"
                    triggerClassName="bg-[#111111] border-0 text-white"
                    contentClassName="bg-[#1a1a1a] border-0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="place_of_birth" className="text-white">Place of Birth</Label>
                  <Input
                    id="place_of_birth"
                    value={formData.place_of_birth}
                    onChange={(e) => setFormData({ ...formData, place_of_birth: e.target.value })}
                    className="bg-[#111111] border-0 text-white"
                    placeholder="City, Country"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="height" className="text-white">Height (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    min="140"
                    max="220"
                    value={formData.height}
                    onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                    className="bg-[#111111] border-0 text-white"
                    placeholder="e.g., 180"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="weight" className="text-white">Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    min="40"
                    max="150"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                    className="bg-[#111111] border-0 text-white"
                    placeholder="e.g., 75"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="market_value" className="text-white">Current Market Value (USD)</Label>
                  <Input
                    id="market_value"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.market_value}
                    onChange={(e) => setFormData({ ...formData, market_value: e.target.value })}
                    className="bg-[#111111] border-0 text-white"
                    placeholder="e.g., 50000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="player_agent" className="text-white">Player Agent</Label>
                  <Input
                    id="player_agent"
                    value={formData.player_agent}
                    onChange={(e) => setFormData({ ...formData, player_agent: e.target.value })}
                    className="bg-[#111111] border-0 text-white"
                    placeholder="Agent name (if any)"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="current_club" className="text-white">Current Club</Label>
                  <Input
                    id="current_club"
                    value={formData.current_club}
                    onChange={(e) => setFormData({ ...formData, current_club: e.target.value })}
                    className="bg-[#111111] border-0 text-white"
                    placeholder="Current club name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="joined_date" className="text-white">Joined Date</Label>
                  <Input
                    id="joined_date"
                    type="date"
                    value={formData.joined_date}
                    onChange={(e) => setFormData({ ...formData, joined_date: e.target.value })}
                    className="bg-[#111111] border-0 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contract_expires" className="text-white">Contract Expires</Label>
                  <Input
                    id="contract_expires"
                    type="date"
                    value={formData.contract_expires}
                    onChange={(e) => setFormData({ ...formData, contract_expires: e.target.value })}
                    className="bg-[#111111] border-0 text-white"
                  />
                </div>

                {/* Football-specific fields */}
                {isFootball && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-white">Preferred Foot</Label>
                      <Select value={formData.foot} onValueChange={(value) => setFormData({ ...formData, foot: value })}>
                        <SelectTrigger className="bg-[#111111] border-0 text-white">
                          <SelectValue placeholder="Select preferred foot" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1a1a] border-0">
                          <SelectItem value="left" className="text-white">Left</SelectItem>
                          <SelectItem value="right" className="text-white">Right</SelectItem>
                          <SelectItem value="both" className="text-white">Both</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fifa_id" className="text-white">FIFA ID</Label>
                      <Input
                        id="fifa_id"
                        value={formData.fifa_id}
                        onChange={(e) => setFormData({ ...formData, fifa_id: e.target.value })}
                        className="bg-[#111111] border-0 text-white"
                        placeholder="FIFA player ID (if available)"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio" className="text-white text-sm sm:text-base">Player Bio</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  className="bg-[#111111] border-0 text-white resize-none text-sm sm:text-base"
                  placeholder="Brief description of the player's career and achievements..."
                  rows={3}
                />
              </div>
            </TabsContent>

            {/* Career Tab */}
            <TabsContent value="career" className="space-y-4 sm:space-y-6">
              {/* Leagues Participated */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-rosegold" />
                  <Label className="text-white text-lg font-semibold">Leagues & Competitions</Label>
                </div>

                <div className="flex gap-2">
                  <div className="w-64">
                    <LeagueSelect
                      value={newLeague}
                      onValueChange={setNewLeague}
                      leagues={sportData.leagues}
                      placeholder="Select league"
                      triggerClassName="bg-[#111111] border-0 text-white"
                    />
                  </div>
                  <Button type="button" onClick={addLeague} className="bg-rosegold hover:bg-rosegold/90">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {formData.leagues_participated.map((league, index) => (
                    <Badge key={index} variant="secondary" className="bg-gray-700 text-white">
                      {league}
                      <button
                        type="button"
                        onClick={() => removeLeague(league)}
                        className="ml-2 hover:text-red-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Titles and Seasons */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-rosegold" />
                  <Label className="text-white text-lg font-semibold">Titles & Seasons</Label>
                </div>

                <div className="flex gap-2">
                  <Select value={newTitle} onValueChange={setNewTitle}>
                    <SelectTrigger className="bg-[#111111] border-0 text-white w-64">
                      <SelectValue placeholder="Select title" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1a] border-0">
                      {sportData.titles.map((title) => (
                        <SelectItem key={title} value={title} className="text-white">
                          {title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" onClick={addTitle} className="bg-rosegold hover:bg-rosegold/90">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {formData.titles_seasons.map((title, index) => (
                    <Badge key={index} variant="secondary" className="bg-gray-700 text-white">
                      {title}
                      <button
                        type="button"
                        onClick={() => removeTitle(title)}
                        className="ml-2 hover:text-red-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Transfer History */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-rosegold" />
                  <Label className="text-white text-base sm:text-lg font-semibold">Transfer History</Label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3">
                  <Input
                    value={newTransfer.year}
                    onChange={(e) => setNewTransfer({ ...newTransfer, year: e.target.value })}
                    placeholder="Year"
                    className="bg-[#111111] border-0 text-white"
                  />
                  <Input
                    value={newTransfer.club}
                    onChange={(e) => setNewTransfer({ ...newTransfer, club: e.target.value })}
                    placeholder="Club"
                    className="bg-[#111111] border-0 text-white"
                  />
                  <div className="flex gap-2">
                    <Input
                      value={newTransfer.transfer_value}
                      onChange={(e) => setNewTransfer({ ...newTransfer, transfer_value: e.target.value })}
                      placeholder="Transfer Value"
                      className="bg-[#111111] border-0 text-white"
                    />
                    <Button type="button" onClick={addTransfer} className="bg-rosegold hover:bg-rosegold/90">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  {formData.transfer_history.map((transfer, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                      <div className="flex gap-4">
                        <span className="text-white">{transfer.year}</span>
                        <span className="text-gray-300">{transfer.club}</span>
                        <span className="text-green-400">${transfer.transfer_value}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeTransfer(index)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* International Duty Tab */}
            <TabsContent value="international" className="space-y-4 sm:space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Flag className="w-4 h-4 sm:w-5 sm:h-5 text-rosegold" />
                  <Label className="text-white text-base sm:text-lg font-semibold">International Duty</Label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label className="text-white text-sm">Season *</Label>
                    <Input
                      value={newInternational.season}
                      onChange={(e) => setNewInternational({ ...newInternational, season: e.target.value })}
                      placeholder="e.g., 2023/24"
                      className="bg-[#111111] border-0 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white text-sm">Category *</Label>
                    <Input
                      value={newInternational.category}
                      onChange={(e) => setNewInternational({ ...newInternational, category: e.target.value })}
                      placeholder="e.g., Senior, U23, U20"
                      className="bg-[#111111] border-0 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white text-sm">Country *</Label>
                    <CountrySelect
                      value={newInternational.country}
                      onValueChange={(value) => setNewInternational({ ...newInternational, country: value })}
                      placeholder="Select country"
                      triggerClassName="bg-[#111111] border-0 text-white"
                      contentClassName="bg-[#1a1a1a] border-0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white text-sm">Debut Date</Label>
                    <Input
                      value={newInternational.debut}
                      onChange={(e) => setNewInternational({ ...newInternational, debut: e.target.value })}
                      placeholder="Debut date"
                      type="date"
                      className="bg-[#111111] border-0 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white text-sm">Appearances</Label>
                    <Input
                      value={newInternational.appearances.toString()}
                      onChange={(e) => setNewInternational({ ...newInternational, appearances: parseInt(e.target.value) || 0 })}
                      placeholder="Number of appearances"
                      type="number"
                      min="0"
                      className="bg-[#111111] border-0 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white text-sm">Goals</Label>
                    <Input
                      value={newInternational.goals.toString()}
                      onChange={(e) => setNewInternational({ ...newInternational, goals: parseInt(e.target.value) || 0 })}
                      placeholder="Goals scored"
                      type="number"
                      min="0"
                      className="bg-[#111111] border-0 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white text-sm">Assists</Label>
                    <Input
                      value={newInternational.assists.toString()}
                      onChange={(e) => setNewInternational({ ...newInternational, assists: parseInt(e.target.value) || 0 })}
                      placeholder="Assists provided"
                      type="number"
                      min="0"
                      className="bg-[#111111] border-0 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white text-sm">Yellow Cards</Label>
                    <Input
                      value={newInternational.yellow_cards.toString()}
                      onChange={(e) => setNewInternational({ ...newInternational, yellow_cards: parseInt(e.target.value) || 0 })}
                      placeholder="Yellow cards received"
                      type="number"
                      min="0"
                      className="bg-[#111111] border-0 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white text-sm">Second Yellow Cards</Label>
                    <Input
                      value={newInternational.second_yellow.toString()}
                      onChange={(e) => setNewInternational({ ...newInternational, second_yellow: parseInt(e.target.value) || 0 })}
                      placeholder="Second yellow cards"
                      type="number"
                      min="0"
                      className="bg-[#111111] border-0 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white text-sm">Red Cards</Label>
                    <Input
                      value={newInternational.red_cards.toString()}
                      onChange={(e) => setNewInternational({ ...newInternational, red_cards: parseInt(e.target.value) || 0 })}
                      placeholder="Red cards received"
                      type="number"
                      min="0"
                      className="bg-[#111111] border-0 text-white"
                    />
                  </div>
                  <Button type="button" onClick={addInternational} className="bg-rosegold hover:bg-rosegold/90 col-span-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Add International Record
                  </Button>
                </div>

                <div className="space-y-2">
                  {formData.international_duty.map((duty, index) => (
                    <div key={index} className="p-4 bg-gray-800 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-white font-semibold">{duty.country} - {duty.season}</h4>
                        <button
                          type="button"
                          onClick={() => removeInternational(index)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                        <span className="text-gray-300">Category: {duty.category}</span>
                        <span className="text-gray-300">Debut: {duty.debut}</span>
                        <span className="text-gray-300">Apps: {duty.appearances}</span>
                        <span className="text-gray-300">Goals: {duty.goals}</span>
                        <span className="text-gray-300">Assists: {duty.assists}</span>
                        <span className="text-gray-300">YC: {duty.yellow_cards}</span>
                        <span className="text-gray-300">2YC: {duty.second_yellow}</span>
                        <span className="text-gray-300">RC: {duty.red_cards}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Media Tab */}
            <TabsContent value="media" className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
                {/* Player Photo Upload */}
                <div className="space-y-2">
                  <Label className="text-white">Player Photo</Label>
                  <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-rosegold transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, 'photo_url');
                      }}
                      className="hidden"
                      id="photo-upload"
                      disabled={uploadingFiles.photo}
                    />
                    <label htmlFor="photo-upload" className="cursor-pointer">
                      {formData.photo_url ? (
                        <div className="space-y-2">
                          <div className="w-32 h-32 mx-auto overflow-hidden rounded-lg border-2 border-gray-600">
                            <img
                              src={formData.photo_url}
                              alt="Player photo"
                              className="w-full h-full object-cover object-center"
                            />
                          </div>
                          <p className="text-sm text-gray-400 text-center">Click to change photo</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Image className="w-12 h-12 text-gray-400 mx-auto" />
                          <p className="text-gray-400 text-center">Upload player photo</p>
                          <p className="text-xs text-gray-500 text-center">JPG, PNG, GIF up to 5MB</p>
                        </div>
                      )}
                    </label>
                    {uploadingFiles.photo && (
                      <div className="mt-2">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-rosegold mx-auto"></div>
                        <p className="text-sm text-gray-400 mt-1">Processing...</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Headshot Upload */}
                <div className="space-y-2">
                  <Label className="text-white">Professional Headshot</Label>
                  <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-rosegold transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, 'headshot_url');
                      }}
                      className="hidden"
                      id="headshot-upload"
                      disabled={uploadingFiles.headshot}
                    />
                    <label htmlFor="headshot-upload" className="cursor-pointer">
                      {formData.headshot_url ? (
                        <div className="space-y-2">
                          <div className="w-32 h-32 mx-auto overflow-hidden rounded-lg border-2 border-gray-600">
                            <img
                              src={formData.headshot_url}
                              alt="Headshot"
                              className="w-full h-full object-cover object-center"
                            />
                          </div>
                          <p className="text-sm text-gray-400 text-center">Click to change headshot</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <FileImage className="w-12 h-12 text-gray-400 mx-auto" />
                          <p className="text-gray-400 text-center">Upload headshot</p>
                          <p className="text-xs text-gray-500 text-center">JPG, PNG, GIF up to 5MB</p>
                        </div>
                      )}
                    </label>
                    {uploadingFiles.headshot && (
                      <div className="mt-2">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-rosegold mx-auto"></div>
                        <p className="text-sm text-gray-400 mt-1">Processing...</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Portrait Upload */}
                <div className="space-y-2">
                  <Label className="text-white">Portrait Photo</Label>
                  <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-rosegold transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, 'portrait_url');
                      }}
                      className="hidden"
                      id="portrait-upload"
                      disabled={uploadingFiles.portrait}
                    />
                    <label htmlFor="portrait-upload" className="cursor-pointer">
                      {formData.portrait_url ? (
                        <div className="space-y-2">
                          <div className="w-32 h-32 mx-auto overflow-hidden rounded-lg border-2 border-gray-600">
                            <img
                              src={formData.portrait_url}
                              alt="Portrait"
                              className="w-full h-full object-cover object-center"
                            />
                          </div>
                          <p className="text-sm text-gray-400 text-center">Click to change portrait</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Image className="w-12 h-12 text-gray-400 mx-auto" />
                          <p className="text-gray-400 text-center">Upload portrait</p>
                          <p className="text-xs text-gray-500 text-center">JPG, PNG, GIF up to 5MB</p>
                        </div>
                      )}
                    </label>
                    {uploadingFiles.portrait && (
                      <div className="mt-2">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-rosegold mx-auto"></div>
                        <p className="text-sm text-gray-400 mt-1">Processing...</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Full Body Photo Upload */}
                <div className="space-y-2">
                  <Label className="text-white">Full Body Photo</Label>
                  <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-rosegold transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, 'full_body_url');
                      }}
                      className="hidden"
                      id="fullbody-upload"
                      disabled={uploadingFiles.fullBody}
                    />
                    <label htmlFor="fullbody-upload" className="cursor-pointer">
                      {formData.full_body_url ? (
                        <div className="space-y-2">
                          <div className="w-32 h-32 mx-auto overflow-hidden rounded-lg border-2 border-gray-600">
                            <img
                              src={formData.full_body_url}
                              alt="Full body photo"
                              className="w-full h-full object-cover object-center"
                            />
                          </div>
                          <p className="text-sm text-gray-400 text-center">Click to change full body photo</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Users className="w-12 h-12 text-gray-400 mx-auto" />
                          <p className="text-gray-400 text-center">Upload full body photo</p>
                          <p className="text-xs text-gray-500 text-center">JPG, PNG, GIF up to 5MB</p>
                        </div>
                      )}
                    </label>
                    {uploadingFiles.fullBody && (
                      <div className="mt-2">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-rosegold mx-auto"></div>
                        <p className="text-sm text-gray-400 mt-1">Processing...</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Image Preview Section */}
              {(formData.photo_url || formData.headshot_url || formData.portrait_url || formData.full_body_url) && (
                <div className="mt-6">
                  <h3 className="text-white text-lg font-semibold mb-4">Image Previews</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {formData.photo_url && (
                      <div className="text-center">
                        <div className="w-full h-24 overflow-hidden rounded-lg border border-gray-600 mb-2">
                          <img
                            src={formData.photo_url}
                            alt="Player photo"
                            className="w-full h-full object-cover object-center"
                          />
                        </div>
                        <p className="text-xs text-gray-400">Player Photo</p>
                      </div>
                    )}
                    {formData.headshot_url && (
                      <div className="text-center">
                        <div className="w-full h-24 overflow-hidden rounded-lg border border-gray-600 mb-2">
                          <img
                            src={formData.headshot_url}
                            alt="Headshot"
                            className="w-full h-full object-cover object-center"
                          />
                        </div>
                        <p className="text-xs text-gray-400">Headshot</p>
                      </div>
                    )}
                    {formData.portrait_url && (
                      <div className="text-center">
                        <div className="w-full h-24 overflow-hidden rounded-lg border border-gray-600 mb-2">
                          <img
                            src={formData.portrait_url}
                            alt="Portrait"
                            className="w-full h-full object-cover object-center"
                          />
                        </div>
                        <p className="text-xs text-gray-400">Portrait</p>
                      </div>
                    )}
                    {formData.full_body_url && (
                      <div className="text-center">
                        <div className="w-full h-24 overflow-hidden rounded-lg border border-gray-600 mb-2">
                          <img
                            src={formData.full_body_url}
                            alt="Full body"
                            className="w-full h-full object-cover object-center"
                          />
                        </div>
                        <p className="text-xs text-gray-400">Full Body</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 sm:pt-6 border-t border-gray-700">
            <Button
              type="submit"
              disabled={loading}
              className="bg-rosegold hover:bg-rosegold/90 text-white font-polysans border-0 w-full sm:w-auto text-sm sm:text-base h-10 sm:h-11"
            >
              {loading ? 'Saving...' : (player ? 'Update Player' : 'Add Player')}
            </Button>
            <Button
              type="button"
              onClick={onCancel}
              variant="outline"
              className="border-0 text-gray-400 hover:bg-gray-700 hover:text-white w-full sm:w-auto text-sm sm:text-base h-10 sm:h-11"
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default PlayerForm;
