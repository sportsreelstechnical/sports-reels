
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { SmartThumbnail } from '@/domains/video/components/SmartThumbnail';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft, ChevronRight, Check, User, Video, DollarSign, Eye } from 'lucide-react';
import { useTransferRestrictions } from '@/domains/transfers/hooks/useTransferRestrictions';

interface Player {
  id: string;
  full_name: string;
  position: string;
  market_value: number;
  photo_url?: string;
}

interface Video {
  id: string;
  title: string;
  thumbnail_url?: string;
}

interface PitchData {
  playerId: string;
  videoIds: string[];
  transferType: 'permanent' | 'loan';
  askingPrice: number;
  currency: string;
  description: string;
  signOnBonus?: number;
  performanceBonus?: number;
  playerSalary?: number;
  relocationSupport?: number;
  loanFee?: number;
  loanWithOption?: boolean;
  loanWithObligation?: boolean;
}

const CreatePitchFlow = ({ onClose }: { onClose: () => void }) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const { restrictions, checkPitchCreationEligibility } = useTransferRestrictions();
  const [step, setStep] = useState(1);
  const [players, setPlayers] = useState<Player[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [pitchData, setPitchData] = useState<PitchData>({
    playerId: '',
    videoIds: [],
    transferType: 'permanent',
    askingPrice: 0,
    currency: 'USD',
    description: '',
  });

  useEffect(() => {
    fetchEligiblePlayers();
    fetchVideos();
  }, [profile]);

  const fetchEligiblePlayers = async () => {
    if (!profile?.id) return;

    try {
      const { data: teamData } = await supabase
        .from('teams')
        .select('id')
        .eq('profile_id', profile.id)
        .single();

      if (!teamData) return;

      // Only get players with complete profiles
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('team_id', teamData.id)
        .not('full_name', 'is', null)
        .not('position', 'is', null)
        .not('citizenship', 'is', null)
        .not('date_of_birth', 'is', null)
        .not('height', 'is', null)
        .not('weight', 'is', null)
        .not('bio', 'is', null)
        .not('market_value', 'is', null);

      if (error) throw error;
      setPlayers(data || []);
    } catch (error) {
      console.error('Error fetching players:', error);
    }
  };

  const fetchVideos = async () => {
    if (!profile?.id) return;

    try {
      const { data: teamData } = await supabase
        .from('teams')
        .select('id')
        .eq('profile_id', profile.id)
        .single();

      if (!teamData) return;

      const { data, error } = await supabase
        .from('videos')
        .select('id, title, thumbnail_url')
        .eq('team_id', teamData.id);

      if (error) throw error;
      setVideos(data || []);
    } catch (error) {
      console.error('Error fetching videos:', error);
    }
  };

  const canProceedToNextStep = () => {
    switch (step) {
      case 1:
        return pitchData.playerId !== '';
      case 2:
        return pitchData.videoIds.length > 0 && pitchData.videoIds.length <= 6;
      case 3:
        return pitchData.askingPrice > 0 && pitchData.description.trim() !== '';
      default:
        return true;
    }
  };

  const handleSubmitPitch = async () => {
    const eligibility = checkPitchCreationEligibility();
    if (!eligibility.canCreate) {
      toast({
        title: "Cannot Create Pitch",
        description: eligibility.reason,
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data: teamData } = await supabase
        .from('teams')
        .select('id')
        .eq('profile_id', profile.id)
        .single();

      if (!teamData) throw new Error('Team not found');

      const { error } = await supabase
        .from('transfer_pitches')
        .insert({
          team_id: teamData.id,
          player_id: pitchData.playerId,
          transfer_type: pitchData.transferType,
          asking_price: pitchData.askingPrice,
          currency: pitchData.currency,
          description: pitchData.description,
          tagged_videos: pitchData.videoIds,
          sign_on_bonus: pitchData.signOnBonus,
          performance_bonus: pitchData.performanceBonus,
          player_salary: pitchData.playerSalary,
          relocation_support: pitchData.relocationSupport,
          loan_fee: pitchData.loanFee,
          loan_with_option: pitchData.loanWithOption,
          loan_with_obligation: pitchData.loanWithObligation,
          is_international: pitchData.currency !== 'USD', // Simplified logic
          status: 'active',
          deal_stage: 'pitch'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Transfer pitch created successfully"
      });

      onClose();
    } catch (error) {
      console.error('Error creating pitch:', error);
      toast({
        title: "Error",
        description: "Failed to create transfer pitch",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedPlayer = players.find(p => p.id === pitchData.playerId);

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-white">
          <span>Create Transfer Pitch</span>
          <div className="flex items-center gap-2 text-sm">
            Step {step} of 4
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Step Progress */}
        <div className="flex items-center justify-between mb-8">
          {[1, 2, 3, 4].map((stepNum) => (
            <div key={stepNum} className="flex items-center">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                ${stepNum <= step ? 'bg-rosegold text-white' : 'bg-gray-600 text-gray-400'}
              `}>
                {stepNum < step ? <Check className="w-4 h-4" /> : stepNum}
              </div>
              {stepNum < 4 && (
                <div className={`w-16 h-0.5 ${stepNum < step ? 'bg-rosegold' : 'bg-gray-600'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Select Player */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-rosegold" />
              <h3 className="text-lg font-semibold text-white">Select Player</h3>
            </div>
            {players.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400">No eligible players found. Please complete player profiles first.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {players.map((player) => (
                  <Card
                    key={player.id}
                    className={`cursor-pointer transition-colors ${pitchData.playerId === player.id ? 'border-rosegold bg-rosegold/10' : 'border-gray-600 hover:border-gray-500'
                      }`}
                    onClick={() => setPitchData({ ...pitchData, playerId: player.id })}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        {player.photo_url && (
                          <img
                            src={player.photo_url}
                            alt={player.full_name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        )}
                        <div>
                          <h4 className="font-semibold text-white">{player.full_name}</h4>
                          <p className="text-sm text-gray-400">{player.position}</p>
                          <p className="text-xs text-gray-500">
                            Value: ${player.market_value?.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Attach Videos */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Video className="w-5 h-5 text-rosegold" />
              <h3 className="text-lg font-semibold text-white">Attach Videos (Max 6)</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {videos.map((video) => {
                const isSelected = pitchData.videoIds.includes(video.id);
                return (
                  <Card
                    key={video.id}
                    className={`cursor-pointer transition-colors ${isSelected ? 'border-rosegold bg-rosegold/10' : 'border-gray-600 hover:border-gray-500'
                      }`}
                    onClick={() => {
                      if (isSelected) {
                        setPitchData({
                          ...pitchData,
                          videoIds: pitchData.videoIds.filter(id => id !== video.id)
                        });
                      } else if (pitchData.videoIds.length < 6) {
                        setPitchData({
                          ...pitchData,
                          videoIds: [...pitchData.videoIds, video.id]
                        });
                      }
                    }}
                  >
                    <CardContent className="p-3">
                      <div className="w-full h-24 rounded mb-2 overflow-hidden">
                        <SmartThumbnail
                          thumbnailUrl={video.thumbnail_url}
                          title={video.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <p className="text-sm text-white font-medium">{video.title}</p>
                      {isSelected && (
                        <Badge className="mt-2 bg-rosegold text-white">Selected</Badge>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            <p className="text-sm text-gray-400">
              Selected: {pitchData.videoIds.length}/6 videos
            </p>
          </div>
        )}

        {/* Step 3: Transfer Details */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-rosegold" />
              <h3 className="text-lg font-semibold text-white">Transfer Details</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Transfer Type</label>
                <Select
                  value={pitchData.transferType}
                  onValueChange={(value: 'permanent' | 'loan') =>
                    setPitchData({ ...pitchData, transferType: value })
                  }
                >
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="permanent" className="text-white hover:bg-gray-700">
                      Permanent Transfer
                    </SelectItem>
                    <SelectItem value="loan" className="text-white hover:bg-gray-700">
                      Loan
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Currency</label>
                <Select
                  value={pitchData.currency}
                  onValueChange={(value) => setPitchData({ ...pitchData, currency: value })}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="USD" className="text-white hover:bg-gray-700">USD</SelectItem>
                    <SelectItem value="EUR" className="text-white hover:bg-gray-700">EUR</SelectItem>
                    <SelectItem value="GBP" className="text-white hover:bg-gray-700">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  {pitchData.transferType === 'loan' ? 'Loan Fee' : 'Transfer Fee'}
                </label>
                <Input
                  type="number"
                  value={pitchData.askingPrice}
                  onChange={(e) => setPitchData({ ...pitchData, askingPrice: Number(e.target.value) })}
                  className="bg-gray-800 border-gray-600 text-white"
                  placeholder="Enter amount"
                />
              </div>

              {pitchData.transferType === 'permanent' && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Sign-on Bonus</label>
                    <Input
                      type="number"
                      value={pitchData.signOnBonus || ''}
                      onChange={(e) => setPitchData({ ...pitchData, signOnBonus: Number(e.target.value) })}
                      className="bg-gray-800 border-gray-600 text-white"
                      placeholder="Optional"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Performance Bonus</label>
                    <Input
                      type="number"
                      value={pitchData.performanceBonus || ''}
                      onChange={(e) => setPitchData({ ...pitchData, performanceBonus: Number(e.target.value) })}
                      className="bg-gray-800 border-gray-600 text-white"
                      placeholder="Optional"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Player Salary</label>
                    <Input
                      type="number"
                      value={pitchData.playerSalary || ''}
                      onChange={(e) => setPitchData({ ...pitchData, playerSalary: Number(e.target.value) })}
                      className="bg-gray-800 border-gray-600 text-white"
                      placeholder="Optional"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Relocation Support</label>
                    <Input
                      type="number"
                      value={pitchData.relocationSupport || ''}
                      onChange={(e) => setPitchData({ ...pitchData, relocationSupport: Number(e.target.value) })}
                      className="bg-gray-800 border-gray-600 text-white"
                      placeholder="Optional"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Description</label>
              <Textarea
                value={pitchData.description}
                onChange={(e) => setPitchData({ ...pitchData, description: e.target.value })}
                className="bg-gray-800 border-gray-600 text-white resize-none"
                placeholder="Describe the player and transfer details..."
                rows={4}
              />
            </div>
          </div>
        )}

        {/* Step 4: Preview */}
        {step === 4 && selectedPlayer && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="w-5 h-5 text-rosegold" />
              <h3 className="text-lg font-semibold text-white">Preview</h3>
            </div>
            <Card className="border-gray-600">
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    {selectedPlayer.photo_url && (
                      <img
                        src={selectedPlayer.photo_url}
                        alt={selectedPlayer.full_name}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    )}
                    <div>
                      <h3 className="text-xl font-bold text-white">{selectedPlayer.full_name}</h3>
                      <p className="text-gray-400">{selectedPlayer.position}</p>
                      <div className="text-2xl font-bold text-rosegold">
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: pitchData.currency,
                          minimumFractionDigits: 0,
                        }).format(pitchData.askingPrice)}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Badge className="bg-blue-500 text-white">
                      {pitchData.transferType.toUpperCase()}
                    </Badge>
                    <Badge variant="outline" className="text-gray-300 border-gray-600">
                      {pitchData.videoIds.length} videos attached
                    </Badge>
                  </div>

                  <p className="text-gray-300">{pitchData.description}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-600">
          <Button
            variant="outline"
            onClick={() => step > 1 ? setStep(step - 1) : onClose()}
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            {step > 1 ? 'Previous' : 'Cancel'}
          </Button>

          {step < 4 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!canProceedToNextStep()}
              className="bg-rosegold hover:bg-rosegold/90 text-white"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmitPitch}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {loading ? 'Publishing...' : 'Publish Pitch'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CreatePitchFlow;
