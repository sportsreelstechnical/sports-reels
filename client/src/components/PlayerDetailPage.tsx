import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { SmartThumbnail } from '@/domains/video/components/SmartThumbnail';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft, User, MapPin, Calendar, DollarSign, Trophy,
  Star, Play, MessageSquare, Heart, Eye, TrendingUp,
  Building2, Flag, Clock, Video, Brain, Activity
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import MessageModal from './MessageModal';
import { ShortlistManager } from './ShortlistManager';

interface PlayerDetail {
  id: string;
  full_name: string;
  position: string;
  citizenship: string;
  date_of_birth: string;
  photo_url?: string;
  headshot_url?: string;
  market_value?: number;
  team_id: string;
  ai_analysis?: any;
  created_at: string;
  teams: {
    team_name: string;
    country: string;
    logo_url?: string;
  };
}

interface TransferPitch {
  id: string;
  asking_price: number;
  currency: string;
  transfer_type: string;
  deal_stage: string;
  expires_at: string;
  description: string;
  tagged_videos: any; // Changed from string[] to any to match Json type
  created_at: string;
  view_count: number;
  message_count: number;
  shortlist_count: number;
  is_international: boolean;
}

interface PlayerVideo {
  id: string;
  title: string;
  video_url: string;
  thumbnail_url?: string;
  video_type: string;
  duration: number;
  created_at: string;
  ai_analysis_status: string;
}

const PlayerDetailPage: React.FC = () => {
  const { playerId } = useParams<{ playerId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();

  const [player, setPlayer] = useState<PlayerDetail | null>(null);
  const [transferPitch, setTransferPitch] = useState<TransferPitch | null>(null);
  const [videos, setVideos] = useState<PlayerVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showAllVideosDialog, setShowAllVideosDialog] = useState(false);

  useEffect(() => {
    if (playerId) {
      fetchPlayerData();
      fetchTransferPitch();
      fetchPlayerVideos();
    }
  }, [playerId]);

  const fetchPlayerData = async () => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select(`
          *,
          teams (
            team_name,
            country,
            logo_url
          )
        `)
        .eq('id', playerId)
        .single();

      if (error) throw error;
      setPlayer(data);
    } catch (error) {
      console.error('Error fetching player data:', error);
      toast({
        title: "Error",
        description: "Failed to load player data",
        variant: "destructive"
      });
    }
  };

  const fetchTransferPitch = async () => {
    try {
      const { data, error } = await supabase
        .from('transfer_pitches')
        .select('*')
        .eq('player_id', playerId)
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setTransferPitch(data);
    } catch (error) {
      console.error('Error fetching transfer pitch:', error);
    }
  };

  const fetchPlayerVideos = async () => {
    try {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('player_id', playerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVideos(data || []);
    } catch (error) {
      console.error('Error fetching player videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleMessage = () => {
    if (profile?.user_type !== 'agent') {
      toast({
        title: "Access Denied",
        description: "Only agents can send messages to players",
        variant: "destructive"
      });
      return;
    }
    setShowMessageModal(true);
  };

  const handleShortlist = () => {
    if (profile?.user_type !== 'agent') {
      toast({
        title: "Access Denied",
        description: "Only agents can shortlist players",
        variant: "destructive"
      });
      return;
    }
    // ShortlistManager will handle this
  };

  const handleVideoPlay = (video: PlayerVideo) => {
    // Navigate to VideoAnalysisResults page, similar to video management
    navigate(`/videos/${encodeURIComponent(video.title)}`);
  };

  const canEditPitch = () => {
    return profile?.user_type === 'team' && profile?.id === player?.team_id;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-700 rounded w-1/4"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <div className="h-64 bg-gray-700 rounded"></div>
                <div className="h-32 bg-gray-700 rounded"></div>
              </div>
              <div className="space-y-4">
                <div className="h-48 bg-gray-700 rounded"></div>
                <div className="h-32 bg-gray-700 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Player Not Found</h1>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </div>
    );
  }

  const age = calculateAge(player.date_of_birth);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-white">{player.full_name}</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Player Overview Card */}
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-start gap-6">
                  <div className="flex-shrink-0">
                    {player.photo_url ? (
                      <img
                        src={player.photo_url}
                        alt={player.full_name}
                        className="w-32 h-32 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-32 h-32 rounded-lg bg-gray-700 flex items-center justify-center">
                        <User className="w-16 h-16 text-gray-400" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-4">
                    <div>
                      <h2 className="text-2xl font-bold text-white mb-2">{player.full_name}</h2>
                      <div className="flex items-center gap-4 text-gray-400">
                        <div className="flex items-center gap-2">
                          {player.teams.logo_url ? (
                            <img 
                              src={player.teams.logo_url} 
                              alt={player.teams.team_name}
                              className="w-5 h-5 rounded object-contain"
                            />
                          ) : (
                            <Building2 className="w-4 h-4" />
                          )}
                          <span>{player.teams.team_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Flag className="w-4 h-4" />
                          <span>{player.teams.country}</span>
                        </div>
                        {age && (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>{age} years old</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <Badge variant="outline" className="text-rosegold border-rosegold">
                        {player.position}
                      </Badge>
                      <Badge variant="outline" className="text-blue-400 border-blue-400">
                        {player.citizenship}
                      </Badge>
                    </div>

                    {player.market_value && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-green-400" />
                        <span className="text-lg font-semibold text-green-400">
                          Market Value: {formatCurrency(player.market_value, 'USD')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Transfer Pitch Details */}
            {transferPitch && (
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-rosegold" />
                    Transfer Pitch Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-400">Asking Price</p>
                      <p className="text-xl font-bold text-rosegold">
                        {formatCurrency(transferPitch.asking_price, transferPitch.currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Transfer Type</p>
                      <p className="text-white font-medium">
                        {transferPitch.transfer_type.charAt(0).toUpperCase() + transferPitch.transfer_type.slice(1)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Deal Stage</p>
                      <Badge variant="outline" className="text-white">
                        {transferPitch.deal_stage.charAt(0).toUpperCase() + transferPitch.deal_stage.slice(1)}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Expires</p>
                      <p className="text-white">
                        {formatDistanceToNow(new Date(transferPitch.expires_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>

                  {transferPitch.description && (
                    <div>
                      <p className="text-sm text-gray-400 mb-2">Description</p>
                      <p className="text-white">{transferPitch.description}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      {transferPitch.view_count} views
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="w-4 h-4" />
                      {transferPitch.message_count} messages
                    </div>
                    <div className="flex items-center gap-1">
                      <Heart className="w-4 h-4" />
                      {transferPitch.shortlist_count} shortlisted
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Videos Section */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Video className="w-5 h-5 text-rosegold" />
                  Player Videos ({videos.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {videos.length === 0 ? (
                  <div className="text-center py-8">
                    <Video className="w-16 h-16 mx-auto mb-4 text-gray-500" />
                    <p className="text-gray-400">No videos available for this player</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {videos.slice(0, 2).map((video) => (
                        <div
                          key={video.id}
                          className="group flex gap-3 bg-gray-700 border border-gray-600 hover:border-rosegold/50 rounded-xl transition-all duration-300 overflow-hidden p-3"
                        >
                          <div className="w-32 h-20 bg-black rounded-lg relative overflow-hidden flex-shrink-0">
                            <SmartThumbnail
                              thumbnailUrl={video.thumbnail_url}
                              title={video.title}
                              className="w-full h-full object-cover"
                            />
                            {video.ai_analysis_status === 'completed' && (
                              <div className="absolute top-1 right-1">
                                <Badge variant="outline" className="bg-black/60 text-green-400 border-green-400 text-xs px-1 py-0">
                                  <Brain className="w-2 h-2 mr-0.5" />
                                  AI
                                </Badge>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col justify-between">
                            <div>
                              <h4 className="font-medium text-white mb-1 line-clamp-1 group-hover:text-rosegold transition-colors duration-200 text-sm">{video.title}</h4>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                                <span className="capitalize">{video.video_type}</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {Math.round(video.duration / 60)} min
                                </span>
                              </div>
                            </div>
                            <div className="mt-auto pt-1">
                              <Button
                                size="sm"
                                className="bg-rosegold hover:bg-rosegold/90 text-white h-7 px-3 text-xs"
                                onClick={() => handleVideoPlay(video)}
                              >
                                <Play className="w-3 h-3 mr-1" />
                                Watch & Analyze
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {videos.length > 2 && (
                      <div className="mt-4 pt-4 border-t border-gray-700">
                        <Button
                          variant="outline"
                          className="w-full border-rosegold/30 text-rosegold hover:bg-rosegold/10"
                          onClick={() => setShowAllVideosDialog(true)}
                        >
                          View All Videos ({videos.length})
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* AI Analysis */}
            {player.ai_analysis && (
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Brain className="w-5 h-5 text-yellow-400" />
                    AI Performance Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(player.ai_analysis as Record<string, any>).map(([key, value]) => (
                      <div key={key} className="border-l-4 border-rosegold pl-4">
                        <p className="text-gray-400 text-sm capitalize font-medium">
                          {key.replace('_', ' ')}
                        </p>
                        <p className="text-white">{value}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Action Buttons */}
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4 space-y-3">
                {profile?.user_type === 'agent' ? (
                  <>
                    <Button
                      className="w-full bg-rosegold hover:bg-rosegold/90 text-white"
                      onClick={handleMessage}
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Send Message
                    </Button>
                    <div className="w-full">
                      <ShortlistManager
                        playerId={player.id}
                        pitchId={transferPitch?.id}
                      />
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-400 text-center">
                    Only agents can message and shortlist players
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Team Information */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white text-lg">Team Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  {player.teams.logo_url && (
                    <img
                      src={player.teams.logo_url}
                      alt={player.teams.team_name}
                      className="w-12 h-12 rounded-lg object-contain"
                    />
                  )}
                  <div>
                    <h4 className="font-medium text-white">{player.teams.team_name}</h4>
                    <p className="text-sm text-gray-400">{player.teams.country}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white text-lg">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Videos</span>
                  <span className="text-white font-medium">{videos.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Views</span>
                  <span className="text-white font-medium">{transferPitch?.view_count || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Messages</span>
                  <span className="text-white font-medium">{transferPitch?.message_count || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Shortlisted</span>
                  <span className="text-white font-medium">{transferPitch?.shortlist_count || 0}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Message Modal */}
      {showMessageModal && (
        <MessageModal
          isOpen={showMessageModal}
          onClose={() => setShowMessageModal(false)}
          receiverId={player.id}
          playerName={player.full_name}
          pitchId={transferPitch?.id}
          currentUserId={profile?.id || ''}
        />
      )}

      {/* All Videos Dialog */}
      <Dialog open={showAllVideosDialog} onOpenChange={setShowAllVideosDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Video className="w-5 h-5 text-rosegold" />
              All Player Videos ({videos.length})
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[calc(90vh-120px)] pr-2">
            <div className="space-y-3">
              {videos.map((video) => (
                <div
                  key={video.id}
                  className="group flex gap-3 bg-gray-700 border border-gray-600 hover:border-rosegold/50 rounded-xl transition-all duration-300 overflow-hidden p-3"
                >
                  <div className="w-32 h-20 bg-black rounded-lg relative overflow-hidden flex-shrink-0">
                    <SmartThumbnail
                      thumbnailUrl={video.thumbnail_url}
                      title={video.title}
                      className="w-full h-full object-cover"
                    />
                    {video.ai_analysis_status === 'completed' && (
                      <div className="absolute top-1 right-1">
                        <Badge variant="outline" className="bg-black/60 text-green-400 border-green-400 text-xs px-1 py-0">
                          <Brain className="w-2 h-2 mr-0.5" />
                          AI
                        </Badge>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <h4 className="font-medium text-white mb-1 line-clamp-1 group-hover:text-rosegold transition-colors duration-200 text-sm">{video.title}</h4>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                        <span className="capitalize">{video.video_type}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {Math.round(video.duration / 60)} min
                        </span>
                      </div>
                    </div>
                    <div className="mt-auto pt-1">
                      <Button
                        size="sm"
                        className="bg-rosegold hover:bg-rosegold/90 text-white h-7 px-3 text-xs"
                        onClick={() => {
                          setShowAllVideosDialog(false);
                          handleVideoPlay(video);
                        }}
                      >
                        <Play className="w-3 h-3 mr-1" />
                        Watch & Analyze
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default PlayerDetailPage;
