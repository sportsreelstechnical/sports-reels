import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, Video, DollarSign, Calendar, X, Shield, Clock, User, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';
import { Badge } from '@/components/ui/badge';

type DatabasePlayer = Tables<'players'>;

interface CreateTransferPitchProps {
  isOpen: boolean;
  onClose: () => void;
  onPitchCreated: () => void;
}

interface TeamRequirements {
  subscription_tier: string;
  subscription_status: string;
  international_transfers_enabled: boolean;
  max_pitches_per_month: number;
  pitches_used_this_month: number;
  member_association: string;
  contact_warnings: number;
}

interface PlayerValidation {
  isComplete: boolean;
  missingFields: string[];
  hasPhoto: boolean;
  hasVideos: boolean;
}

const CreateTransferPitch: React.FC<CreateTransferPitchProps> = ({
  isOpen,
  onClose,
  onPitchCreated
}) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [players, setPlayers] = useState<DatabasePlayer[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<DatabasePlayer | null>(null);
  const [selectedVideos, setSelectedVideos] = useState<string[]>([]);
  const [teamId, setTeamId] = useState<string>('');
  const [videoRequirements, setVideoRequirements] = useState<any>(null);
  const [teamRequirements, setTeamRequirements] = useState<TeamRequirements | null>(null);
  const [playerValidation, setPlayerValidation] = useState<PlayerValidation | null>(null);
  const [formData, setFormData] = useState({
    description: '',
    transfer_type: 'permanent' as 'permanent' | 'loan',
    asking_price: '',
    currency: 'USD',
    sign_on_bonus: '',
    performance_bonus: '',
    player_salary: '',
    relocation_support: '',
    loan_fee: '',
    loan_with_option: false,
    loan_with_obligation: false,
    is_international: false,
    expires_at: ''
  });

  useEffect(() => {
    if (isOpen) {
      fetchTeamData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedPlayer) {
      validatePlayerProfile(selectedPlayer);
    }
  }, [selectedPlayer]);

  const fetchTeamData = async () => {
    if (!profile?.id) return;

    try {
      // Get team ID and basic info (using existing columns only)
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select(`
          id, 
          member_association
        `)
        .eq('profile_id', profile.id)
        .single();

      if (teamError || !team) {
        toast({
          title: "Error",
          description: "Could not find your team profile",
          variant: "destructive"
        });
        return;
      }

      setTeamId(team.id);

      // Set default team requirements (will be enhanced when DB is updated)
      setTeamRequirements({
        subscription_tier: 'basic', // Default value
        subscription_status: 'active', // Default value
        international_transfers_enabled: false, // Default value
        max_pitches_per_month: 5, // Default value
        pitches_used_this_month: 0, // Default value
        member_association: team.member_association || '',
        contact_warnings: 0 // Default value
      });

      // TEMPORARY: Skip contact warnings query until DB is updated
      // TODO: Uncomment when database is updated
      /*
      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('contact_warnings')
          .eq('id', profile.id)
          .single();

        if (profileData) {
          setTeamRequirements(prev => prev ? {
            ...prev,
            contact_warnings: profileData.contact_warnings || 0
          } : null);
        }
      } catch (profileError) {
        console.log('Contact warnings column not available yet:', profileError);
      }
      */

      // Check video requirements (with fallback)
      try {
        const { data: videoReq, error: videoReqError } = await supabase
          .from('video_requirements')
          .select('video_count')
          .eq('team_id', team.id)
          .single();

        if (!videoReqError && videoReq) {
          setVideoRequirements(videoReq);
        } else {
          // Fallback: count videos manually
          const { data: videosData, error: videosError } = await supabase
            .from('videos')
            .select('id')
            .eq('team_id', team.id);

          if (!videosError && videosData) {
            setVideoRequirements({ video_count: videosData.length });
          } else {
            setVideoRequirements({ video_count: 0 });
          }
        }
      } catch (videoError) {
        console.log('Video requirements table not available yet:', videoError);
        // Fallback: count videos manually
        try {
          const { data: videosData } = await supabase
            .from('videos')
            .select('id')
            .eq('team_id', team.id);

          setVideoRequirements({ video_count: videosData?.length || 0 });
        } catch (fallbackError) {
          console.log('Fallback video count failed:', fallbackError);
          setVideoRequirements({ video_count: 0 });
        }
      }

      // Get eligible players (complete profiles only)
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('*')
        .eq('team_id', team.id)
        .not('full_name', 'is', null)
        .not('position', 'is', null)
        .not('citizenship', 'is', null)
        .not('date_of_birth', 'is', null)
        .not('height', 'is', null)
        .not('weight', 'is', null)
        .not('bio', 'is', null)
        .not('market_value', 'is', null);

      if (playersError) {
        console.error('Error fetching players:', playersError);
        return;
      }

      setPlayers(playersData || []);

      // Get team videos
      const { data: videosData, error: videosError } = await supabase
        .from('videos')
        .select('*')
        .eq('team_id', team.id)
        .order('created_at', { ascending: false });

      if (videosError) {
        console.error('Error fetching videos:', videosError);
        return;
      }

      setVideos(videosData || []);

    } catch (error) {
      console.error('Error fetching team data:', error);
      toast({
        title: "Error",
        description: "Failed to load team data. Please try again.",
        variant: "destructive"
      });
    }
  };

  const validatePlayerProfile = (player: DatabasePlayer) => {
    const requiredFields = [
      'full_name', 'position', 'citizenship', 'date_of_birth',
      'height', 'weight', 'bio', 'market_value'
    ] as const;

    const missingFields = requiredFields.filter(field =>
      !player[field] || player[field] === ''
    );

    const validation: PlayerValidation = {
      isComplete: missingFields.length === 0,
      missingFields,
      hasPhoto: !!(player.headshot_url || player.photo_url),
      hasVideos: selectedVideos.length > 0
    };

    setPlayerValidation(validation);
  };

  const validateRequirements = () => {
    const errors: string[] = [];

    // Check subscription status
    if (teamRequirements?.subscription_status !== 'active') {
      errors.push('Your team subscription is not active');
    }

    // Check contact warnings
    if (teamRequirements && teamRequirements.contact_warnings >= 3) {
      errors.push('Your team profile has been blocked due to contact violations');
    }

    // Check video requirements
    if (!videoRequirements || videoRequirements.video_count < 5) {
      errors.push('Your team needs at least 5 videos to create transfer pitches');
    }

    // Check monthly pitch limits
    if (teamRequirements && teamRequirements.pitches_used_this_month >= teamRequirements.max_pitches_per_month) {
      errors.push(`Monthly pitch limit reached (${teamRequirements.max_pitches_per_month} pitches)`);
    }

    // Check player selection
    if (!selectedPlayer) {
      errors.push('Please select a player to pitch');
    } else if (playerValidation && !playerValidation.isComplete) {
      errors.push(`Player profile incomplete. Missing: ${playerValidation.missingFields.join(', ')}`);
    }

    // Check video selection
    if (selectedVideos.length === 0) {
      errors.push('Please select at least one video to include in the pitch');
    }

    if (selectedVideos.length > 6) {
      errors.push('You can select a maximum of 6 videos per pitch');
    }

    // Check international transfer restrictions
    if (formData.is_international && teamRequirements?.subscription_tier === 'basic') {
      errors.push('International transfers are not allowed on the basic tier');
    }

    // Check currency for international transfers
    if (formData.is_international && !['USD', 'EUR', 'GBP'].includes(formData.currency)) {
      errors.push('International transfers must be billed in USD, EUR, or GBP only');
    }

    if (errors.length > 0) {
      errors.forEach(error => {
        toast({
          title: "Validation Error",
          description: error,
          variant: "destructive"
        });
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateRequirements()) {
      return;
    }

    setLoading(true);

    try {
      // Calculate expiration date (30 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      // Create basic pitch data (only use existing columns)
      const pitchData: any = {
        team_id: teamId,
        player_id: selectedPlayer!.id,
        description: formData.description,
        transfer_type: formData.transfer_type,
        asking_price: formData.asking_price ? parseFloat(formData.asking_price) : null,
        currency: formData.currency,
        sign_on_bonus: formData.sign_on_bonus ? parseFloat(formData.sign_on_bonus) : null,
        performance_bonus: formData.performance_bonus ? parseFloat(formData.performance_bonus) : null,
        player_salary: formData.player_salary ? parseFloat(formData.player_salary) : null,
        relocation_support: formData.relocation_support ? parseFloat(formData.relocation_support) : null,
        loan_fee: formData.loan_fee ? parseFloat(formData.loan_fee) : null,
        loan_with_option: formData.loan_with_option,
        loan_with_obligation: formData.loan_with_obligation,
        is_international: formData.is_international,
        tagged_videos: selectedVideos,
        expires_at: expiresAt.toISOString(),
        status: 'active' as const,
        service_charge_rate: 15.0,
        tier_level: 'basic' // Default value
      };

      // Try to add enhanced fields if they exist
      try {
        pitchData.pitch_duration_days = 30;
        pitchData.auto_expire_enabled = true;
        pitchData.international_currency = formData.is_international ? formData.currency : null;
        pitchData.domestic_currency = !formData.is_international ? formData.currency : null;
      } catch (enhancedError) {
        console.log('Enhanced fields not available yet:', enhancedError);
        // Continue with basic fields only
      }

      const { error } = await supabase
        .from('transfer_pitches')
        .insert(pitchData);

      if (error) throw error;

      // TEMPORARY: Skip monthly counter update until DB is updated
      // TODO: Uncomment when database is updated
      /*
      try {
        if (teamRequirements) {
          await supabase
            .from('teams')
            .update({ 
              pitches_used_this_month: teamRequirements.pitches_used_this_month + 1 
            })
            .eq('id', teamId);
        }
      } catch (counterError) {
        console.log('Monthly counter update failed:', counterError);
      }
      */

      toast({
        title: "Success",
        description: "Transfer pitch created successfully! It will expire in 30 days.",
      });

      onPitchCreated();
      onClose();
    } catch (error: any) {
      console.error('Error creating pitch:', error);
      toast({
        title: "Error",
        description: `Failed to create pitch: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleVideoSelection = (videoId: string) => {
    setSelectedVideos(prev =>
      prev.includes(videoId)
        ? prev.filter(id => id !== videoId)
        : prev.length < 6
          ? [...prev, videoId]
          : prev
    );
  };

  const getRequirementStatus = (type: string) => {
    switch (type) {
      case 'subscription':
        return teamRequirements?.subscription_status === 'active';
      case 'contact_warnings':
        return teamRequirements ? teamRequirements.contact_warnings < 3 : true;
      case 'videos':
        return videoRequirements && videoRequirements.video_count >= 5;
      case 'monthly_limit':
        return teamRequirements ? teamRequirements.pitches_used_this_month < teamRequirements.max_pitches_per_month : true;
      case 'player_profile':
        return playerValidation?.isComplete;
      case 'video_selection':
        return selectedVideos.length > 0 && selectedVideos.length <= 6;
      case 'international_allowed':
        return !formData.is_international || teamRequirements?.subscription_tier !== 'basic';
      case 'currency_valid':
        return !formData.is_international || ['USD', 'EUR', 'GBP'].includes(formData.currency);
      default:
        return false;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 border-0  flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-red-700   border-0">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white font-polysans">Create Transfer Pitch</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Requirements Check */}
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-yellow-400" />
              <h3 className="font-polysans text-white">Requirements Check</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className={`flex items-center gap-2 ${getRequirementStatus('subscription') ? 'text-green-400' : 'text-red-400'}`}>
                {getRequirementStatus('subscription') ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                Subscription Status: {teamRequirements?.subscription_status || 'Unknown'}
              </div>
              <div className={`flex items-center gap-2 ${getRequirementStatus('contact_warnings') ? 'text-green-400' : 'text-red-400'}`}>
                {getRequirementStatus('contact_warnings') ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                Contact Warnings: {teamRequirements?.contact_warnings || 0}/3
              </div>
              <div className={`flex items-center gap-2 ${getRequirementStatus('videos') ? 'text-green-400' : 'text-red-400'}`}>
                {getRequirementStatus('videos') ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                Team Videos: {videoRequirements?.video_count || 0}/5 required
              </div>
              <div className={`flex items-center gap-2 ${getRequirementStatus('monthly_limit') ? 'text-green-400' : 'text-red-400'}`}>
                {getRequirementStatus('monthly_limit') ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                Monthly Usage: {teamRequirements?.pitches_used_this_month || 0}/{teamRequirements?.max_pitches_per_month || 5}
              </div>
            </div>

            {/* Tier Information */}
            {teamRequirements && (
              <div className="mt-3 p-3 bg-gray-700 rounded">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={teamRequirements.subscription_tier === 'basic' ? 'secondary' : 'default'}>
                    {teamRequirements.subscription_tier.toUpperCase()} TIER
                  </Badge>
                  {teamRequirements.subscription_tier === 'basic' && (
                    <AlertTriangle className="h-4 w-4 text-yellow-400" />
                  )}
                </div>
                <p className="text-xs text-gray-300">
                  {teamRequirements.subscription_tier === 'basic'
                    ? 'Basic tier: Domestic transfers only, same member association'
                    : 'Premium/Enterprise: International transfers allowed'
                  }
                </p>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Player Selection */}
            <div className="space-y-2">
              <Label className="text-white">Select Player *</Label>
              <Select value={selectedPlayer?.id || ''} onValueChange={(value) => {
                const player = players.find(p => p.id === value);
                setSelectedPlayer(player || null);
              }}>
                <SelectTrigger className="bg-[#111111] border-0 text-white">
                  <SelectValue placeholder="Choose player to pitch" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-0">
                  {players.map((player) => (
                    <SelectItem key={player.id} value={player.id} className="text-white">
                      <div className="flex items-center gap-2">
                        <span>{player.full_name}</span>
                        {player.jersey_number && (
                          <Badge className="bg-bright-pink text-white text-xs px-1.5 py-0.5 font-bold">
                            #{player.jersey_number}
                          </Badge>
                        )}
                        <span className="text-gray-400">- {player.position}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Player Validation Status */}
              {selectedPlayer && playerValidation && (
                <div className="mt-2 p-3 bg-gray-700 rounded">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4" />
                    <span className="text-sm font-medium text-white">{selectedPlayer.full_name}</span>
                    <Badge variant={playerValidation.isComplete ? 'default' : 'destructive'}>
                      {playerValidation.isComplete ? 'Complete' : 'Incomplete'}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className={`flex items-center gap-1 ${playerValidation.hasPhoto ? 'text-green-400' : 'text-red-400'}`}>
                      {playerValidation.hasPhoto ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      Photo
                    </div>
                    <div className={`flex items-center gap-1 ${playerValidation.hasVideos ? 'text-green-400' : 'text-red-400'}`}>
                      {playerValidation.hasVideos ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      Videos Selected
                    </div>
                  </div>
                  {!playerValidation.isComplete && (
                    <p className="text-xs text-red-400 mt-1">
                      Missing: {playerValidation.missingFields.join(', ')}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Video Selection */}
            <div className="space-y-2">
              <Label className="text-white">Select Videos (Max 6) *</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-40 overflow-y-auto">
                {videos.map((video) => (
                  <div key={video.id} className="flex items-center space-x-2 p-2 border border-gray-600 rounded">
                    <Checkbox
                      id={`video-${video.id}`}
                      checked={selectedVideos.includes(video.id)}
                      onCheckedChange={() => toggleVideoSelection(video.id)}
                      disabled={selectedVideos.length >= 6 && !selectedVideos.includes(video.id)}
                    />
                    <label htmlFor={`video-${video.id}`} className="text-sm text-white cursor-pointer flex items-center gap-2">
                      <Video className="h-4 w-4" />
                      {video.title}
                    </label>
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-400">Selected: {selectedVideos.length}/6</p>
            </div>

            {/* Transfer Details */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white">Transfer Type *</Label>
                  <Select value={formData.transfer_type} onValueChange={(value) => setFormData(prev => ({ ...prev, transfer_type: value as 'permanent' | 'loan' }))}>
                    <SelectTrigger className="bg-[#111111] border-0 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1a] border-0">
                      <SelectItem value="permanent" className="text-white">Permanent Transfer</SelectItem>
                      <SelectItem value="loan" className="text-white">Loan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-white">Currency *</Label>
                  <Select value={formData.currency} onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}>
                    <SelectTrigger className="bg-[#111111] border-0 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1a] border-0">
                      <SelectItem value="USD" className="text-white">USD</SelectItem>
                      <SelectItem value="EUR" className="text-white">EUR</SelectItem>
                      <SelectItem value="GBP" className="text-white">GBP</SelectItem>
                      <SelectItem value="NGN" className="text-white">NGN</SelectItem>
                      <SelectItem value="KES" className="text-white">KES</SelectItem>
                      <SelectItem value="GHS" className="text-white">GHS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* International Transfer Warning */}
              {formData.is_international && teamRequirements?.subscription_tier === 'basic' && (
                <div className="p-3 bg-red-900/20 border border-red-500 rounded">
                  <div className="flex items-center gap-2 text-red-400">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm font-medium">International transfers not allowed on basic tier</span>
                  </div>
                </div>
              )}

              {/* Currency Warning for International */}
              {formData.is_international && !['USD', 'EUR', 'GBP'].includes(formData.currency) && (
                <div className="p-3 bg-yellow-900/20 border border-yellow-500 rounded">
                  <div className="flex items-center gap-2 text-yellow-400">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm">International transfers must be billed in USD, EUR, or GBP only</span>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-white">Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the transfer opportunity..."
                  className="bg-[#111111] border-0 text-white"
                  rows={3}
                />
              </div>

              {/* Financial Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {formData.transfer_type === 'permanent' ? (
                  <>
                    <div className="space-y-2">
                      <Label className="text-white">Asking Price</Label>
                      <Input
                        type="number"
                        value={formData.asking_price}
                        onChange={(e) => setFormData(prev => ({ ...prev, asking_price: e.target.value }))}
                        placeholder="0"
                        className="bg-[#111111] border-0 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white">Sign-on Bonus</Label>
                      <Input
                        type="number"
                        value={formData.sign_on_bonus}
                        onChange={(e) => setFormData(prev => ({ ...prev, sign_on_bonus: e.target.value }))}
                        placeholder="0"
                        className="bg-[#111111] border-0 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white">Player Salary (Annual)</Label>
                      <Input
                        type="number"
                        value={formData.player_salary}
                        onChange={(e) => setFormData(prev => ({ ...prev, player_salary: e.target.value }))}
                        placeholder="0"
                        className="bg-[#111111] border-0 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white">Performance Bonus</Label>
                      <Input
                        type="number"
                        value={formData.performance_bonus}
                        onChange={(e) => setFormData(prev => ({ ...prev, performance_bonus: e.target.value }))}
                        placeholder="0"
                        className="bg-[#111111] border-0 text-white"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label className="text-white">Loan Fee</Label>
                      <Input
                        type="number"
                        value={formData.loan_fee}
                        onChange={(e) => setFormData(prev => ({ ...prev, loan_fee: e.target.value }))}
                        placeholder="0"
                        className="bg-[#111111] border-0 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white">Relocation Support</Label>
                      <Input
                        type="number"
                        value={formData.relocation_support}
                        onChange={(e) => setFormData(prev => ({ ...prev, relocation_support: e.target.value }))}
                        placeholder="0"
                        className="bg-[#111111] border-0 text-white"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Loan Options */}
              {formData.transfer_type === 'loan' && (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="loan_with_option"
                      checked={formData.loan_with_option}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, loan_with_option: checked as boolean }))}
                    />
                    <label htmlFor="loan_with_option" className="text-sm text-white">
                      Option to buy
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="loan_with_obligation"
                      checked={formData.loan_with_obligation}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, loan_with_obligation: checked as boolean }))}
                    />
                    <label htmlFor="loan_with_obligation" className="text-sm text-white">
                      Obligation to buy
                    </label>
                  </div>
                </div>
              )}

              {/* International Transfer */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_international"
                  checked={formData.is_international}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_international: checked as boolean }))}
                  disabled={teamRequirements?.subscription_tier === 'basic'}
                />
                <label htmlFor="is_international" className="text-sm text-white">
                  International Transfer
                  {teamRequirements?.subscription_tier === 'basic' && (
                    <span className="text-red-400 ml-1">(Premium/Enterprise only)</span>
                  )}
                </label>
              </div>

              {/* Service Charge Notice */}
              <div className="p-3 bg-blue-900/20 border border-blue-500 rounded">
                <div className="flex items-center gap-2 text-blue-400">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-sm">15% service charge applies when contract is finalized</span>
                </div>
              </div>

              {/* Expiration Notice */}
              <div className="p-3 bg-gray-700 rounded">
                <div className="flex items-center gap-2 text-gray-300">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">Pitch will automatically expire in 30 days</span>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                type="submit"
                disabled={loading || !selectedPlayer || selectedVideos.length === 0 || !validateRequirements()}
                className="bg-rosegold hover:bg-rosegold/90 text-white font-polysans"
              >
                {loading ? 'Creating Pitch...' : 'Create Transfer Pitch'}
              </Button>
              <Button
                type="button"
                onClick={onClose}
                variant="outline"
                className="border-gray-600 text-gray-400 hover:bg-gray-700"
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateTransferPitch;
