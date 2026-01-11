import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, Calendar, Trophy, User, Play, MessageCircle, Star } from 'lucide-react';
import VideoPlayer from './VideoPlayer';
import { supabase } from '@/integrations/supabase/client';
import { SmartThumbnail } from '@/domains/video/components/SmartThumbnail';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface Player {
  id: string;
  full_name: string;
  sport_type: string;
  position?: string;
  age?: number;
  nationality?: string;
  team?: string;
  height?: string;
  weight?: string;
  preferred_foot?: string;
  market_value?: number;
  profile_image?: string;
  achievements?: string[];
  bio?: string;
  stats?: any;
}

interface Video {
  id: string;
  title: string;
  video_url: string;
  thumbnail_url?: string;
  description?: string;
  tagged_players?: any;
  match_date?: string;
  opposing_team?: string;
  score?: string;
}

interface PlayerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player | null;
  onMessagePlayer?: (playerId: string, playerName: string) => void;
}

export const PlayerProfileModal: React.FC<PlayerProfileModalProps> = ({
  isOpen,
  onClose,
  player,
  onMessagePlayer
}) => {
  const { profile } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(false);
  const [isShortlisted, setIsShortlisted] = useState(false);
  const [teamOwnerProfile, setTeamOwnerProfile] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (player && isOpen) {
      fetchPlayerVideos();
      checkIfShortlisted();
      fetchTeamOwnerProfile();
    }
  }, [player, isOpen]);

  const fetchTeamOwnerProfile = async () => {
    if (!player) return;

    try {
      // Get the team that owns this player
      const { data: teamData } = await supabase
        .from('teams')
        .select('profile_id, profiles!inner(*)')
        .eq('id', player.team)
        .single();

      if (teamData) {
        setTeamOwnerProfile(teamData.profiles);
      }
    } catch (error) {
      console.error('Error fetching team owner profile:', error);
    }
  };

  const fetchPlayerVideos = async () => {
    if (!player) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .contains('tagged_players', `["${player.full_name}"]`)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching videos:', error);
        return;
      }

      setVideos(data || []);
    } catch (error) {
      console.error('Error in fetchPlayerVideos:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkIfShortlisted = async () => {
    if (!player || !profile?.id) return;

    try {
      const { data, error } = await supabase
        .from('shortlist')
        .select('id')
        .eq('player_id', player.id)
        .single();

      setIsShortlisted(!!data && !error);
    } catch (error) {
      console.error('Error checking shortlist status:', error);
    }
  };

  const handleAddToShortlist = async () => {
    if (!player || !profile?.id) return;

    try {
      // Get the current user's agent ID
      const { data: agent } = await supabase
        .from('agents')
        .select('id')
        .eq('profile_id', profile.id)
        .single();

      if (!agent) {
        toast({
          title: "Error",
          description: "You must be an agent to add players to shortlist.",
          variant: "destructive"
        });
        return;
      }

      // Find an active pitch for this player
      const { data: pitch } = await supabase
        .from('transfer_pitches')
        .select('id')
        .eq('player_id', player.id)
        .eq('status', 'active')
        .single();

      if (!pitch) {
        toast({
          title: "Error",
          description: "No active pitch found for this player.",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase
        .from('shortlist')
        .insert({
          agent_id: agent.id,
          player_id: player.id,
          pitch_id: pitch.id
        });

      if (error) throw error;

      setIsShortlisted(true);
      toast({
        title: "Added to Shortlist",
        description: `${player.full_name} has been added to your shortlist.`,
      });
    } catch (error: any) {
      console.error('Error adding to shortlist:', error);
      toast({
        title: "Error",
        description: "Failed to add player to shortlist.",
        variant: "destructive"
      });
    }
  };

  const handleRemoveFromShortlist = async () => {
    if (!player) return;

    try {
      const { error } = await supabase
        .from('shortlist')
        .delete()
        .eq('player_id', player.id);

      if (error) throw error;

      setIsShortlisted(false);
      toast({
        title: "Removed from Shortlist",
        description: `${player.full_name} has been removed from your shortlist.`,
      });
    } catch (error: any) {
      console.error('Error removing from shortlist:', error);
      toast({
        title: "Error",
        description: "Failed to remove player from shortlist.",
        variant: "destructive"
      });
    }
  };

  const handleMessageTeam = () => {
    if (!player || !teamOwnerProfile) return;

    if (onMessagePlayer) {
      onMessagePlayer(teamOwnerProfile.id, `Team Owner - ${player.full_name}`);
    }
  };

  if (!player) return null;

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const metadata = selectedVideo ? {
    playerTags: [player.full_name],
    matchDetails: {
      homeTeam: 'Home Team',
      awayTeam: selectedVideo.opposing_team || 'Away Team',
      league: 'League',
      finalScore: selectedVideo.score || '0-0'
    },
    duration: 300
  } : {
    playerTags: [],
    matchDetails: {
      homeTeam: '',
      awayTeam: '',
      league: '',
      finalScore: ''
    },
    duration: 0
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-full max-h-[90vh] overflow-y-auto bg-[#1a1a1a] border border-rosegold/20">
        <DialogHeader className="border-b border-rosegold/20 pb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src={player.profile_image} alt={player.full_name} />
                <AvatarFallback className="bg-rosegold text-black font-bold text-lg">
                  {getInitials(player.full_name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="text-2xl font-bold text-white mb-2">
                  {player.full_name}
                </DialogTitle>
                <div className="flex flex-wrap gap-2 mb-2">
                  <Badge variant="outline" className="border-rosegold text-rosegold">
                    {player.sport_type}
                  </Badge>
                  {player.position && (
                    <Badge variant="outline" className="border-rosegold text-rosegold">
                      {player.position}
                    </Badge>
                  )}
                  {player.nationality && (
                    <Badge variant="outline" className="border-rosegold text-rosegold">
                      {player.nationality}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={isShortlisted ? handleRemoveFromShortlist : handleAddToShortlist}
                className={isShortlisted
                  ? "bg-gray-600 hover:bg-gray-700 text-white"
                  : "bg-rosegold hover:bg-rosegold/90 text-black"
                }
              >
                <Star className={`w-4 h-4 mr-2 ${isShortlisted ? 'fill-current' : ''}`} />
                {isShortlisted ? 'Remove from Shortlist' : 'Add to Shortlist'}
              </Button>
              {teamOwnerProfile && (
                <Button
                  onClick={handleMessageTeam}
                  variant="outline"
                  className="border-rosegold text-rosegold hover:bg-rosegold hover:text-black"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Message Team
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="py-6">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="videos">Videos ({videos.length})</TabsTrigger>
              <TabsTrigger value="stats">Statistics</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-gray-800 border-rosegold/20">
                  <CardHeader className="pb-3">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <User className="w-5 h-5 text-rosegold" />
                      Personal Info
                    </h3>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {player.age && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Age:</span>
                        <span className="text-white">{player.age}</span>
                      </div>
                    )}
                    {player.height && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Height:</span>
                        <span className="text-white">{player.height}</span>
                      </div>
                    )}
                    {player.weight && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Weight:</span>
                        <span className="text-white">{player.weight}</span>
                      </div>
                    )}
                    {player.preferred_foot && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Preferred Foot:</span>
                        <span className="text-white">{player.preferred_foot}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-gray-800 border-rosegold/20">
                  <CardHeader className="pb-3">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-rosegold" />
                      Career Info
                    </h3>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {player.team && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Current Team:</span>
                        <span className="text-white">{player.team}</span>
                      </div>
                    )}
                    {player.market_value && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Market Value:</span>
                        <span className="text-rosegold font-bold">
                          {formatCurrency(player.market_value)}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-gray-800 border-rosegold/20">
                  <CardHeader className="pb-3">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-rosegold" />
                      Achievements
                    </h3>
                  </CardHeader>
                  <CardContent>
                    {player.achievements && player.achievements.length > 0 ? (
                      <div className="space-y-2">
                        {player.achievements.slice(0, 5).map((achievement, index) => (
                          <div key={index} className="text-sm text-gray-300">
                            • {achievement}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-400 text-sm">No achievements recorded</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {player.bio && (
                <Card className="bg-gray-800 border-rosegold/20">
                  <CardHeader>
                    <h3 className="text-lg font-semibold text-white">Biography</h3>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-300 leading-relaxed">{player.bio}</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="videos" className="space-y-6">
              {selectedVideo ? (
                <div className="space-y-4">
                  <Button
                    onClick={() => setSelectedVideo(null)}
                    variant="outline"
                    className="border-rosegold text-rosegold hover:bg-rosegold hover:text-black"
                  >
                    ← Back to Videos
                  </Button>
                  <VideoPlayer
                    videoUrl={selectedVideo.video_url}
                    title={selectedVideo.title}
                    videoId={selectedVideo.id}
                    metadata={metadata}
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rosegold mx-auto mb-2"></div>
                      <p className="text-gray-400">Loading videos...</p>
                    </div>
                  ) : videos.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {videos.map((video) => (
                        <Card key={video.id} className="bg-gray-800 border-rosegold/20 cursor-pointer hover:border-rosegold/50 transition-all">
                          <div className="relative aspect-video bg-black rounded-t-lg overflow-hidden">
                            <SmartThumbnail
                              thumbnailUrl={video.thumbnail_url}
                              title={video.title}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                              <Button
                                onClick={() => setSelectedVideo(video)}
                                size="sm"
                                className="bg-rosegold hover:bg-rosegold/90 text-black"
                              >
                                <Play className="w-4 h-4 mr-2" />
                                Watch
                              </Button>
                            </div>
                          </div>
                          <CardContent className="p-4">
                            <h4 className="font-semibold text-white mb-2 line-clamp-2">
                              {video.title}
                            </h4>
                            {video.description && (
                              <p className="text-gray-400 text-sm line-clamp-2 mb-2">
                                {video.description}
                              </p>
                            )}
                            <div className="flex justify-between items-center text-xs text-gray-500">
                              {video.match_date && (
                                <span>{new Date(video.match_date).toLocaleDateString()}</span>
                              )}
                              {video.opposing_team && (
                                <span>vs {video.opposing_team}</span>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Play className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                      <p className="text-gray-400 mb-2">No videos found for this player</p>
                      <p className="text-gray-500 text-sm">Videos will appear here when the player is tagged</p>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="stats" className="space-y-6">
              {player.stats ? (
                <Card className="bg-gray-800 border-rosegold/20">
                  <CardHeader>
                    <h3 className="text-lg font-semibold text-white">Performance Statistics</h3>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.entries(player.stats).map(([key, value]) => (
                        <div key={key} className="text-center">
                          <div className="text-2xl font-bold text-rosegold mb-1">
                            {typeof value === 'number' ? value : String(value)}
                          </div>
                          <div className="text-sm text-gray-400 capitalize">
                            {key.replace(/_/g, ' ')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="text-center py-8">
                  <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-400 mb-2">No statistics available</p>
                  <p className="text-gray-500 text-sm">Player statistics will be displayed here when available</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PlayerProfileModal;
