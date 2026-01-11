
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { SmartThumbnail } from '@/domains/video/components/SmartThumbnail';
import { useToast } from '@/hooks/use-toast';
import {
  User,
  MapPin,
  Calendar,
  Ruler,
  Weight,
  Trophy,
  Video,
  Play,
  BarChart3,
  Eye,
  ArrowRight
} from 'lucide-react';
import { usePlayerVideoTags } from '@/domains/players/hooks/usePlayerVideoTags';
import { useNavigate } from 'react-router-dom';
import VideoAnalysisPageTabs from './VideoAnalysisPageTabs';

interface PlayerProfileWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  playerId: string;
  playerName: string;
}

interface PlayerVideo {
  id: string;
  title: string;
  video_url: string;
  thumbnail_url?: string;
  created_at: string;
  team_name?: string;
}

const PlayerProfileWrapper: React.FC<PlayerProfileWrapperProps> = ({
  isOpen,
  onClose,
  playerId,
  playerName
}) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [player, setPlayer] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [showVideoAnalysis, setShowVideoAnalysis] = useState(false);
  const { videos, loading: videosLoading } = usePlayerVideoTags(playerId);

  useEffect(() => {
    if (isOpen && playerId) {
      fetchPlayerData();
    }
  }, [isOpen, playerId]);

  const fetchPlayerData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('players')
        .select(`
          *,
          teams (
            team_name,
            country
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
    } finally {
      setLoading(false);
    }
  };

  const handleVideoAnalysis = (videoId: string) => {
    setSelectedVideoId(videoId);
    setShowVideoAnalysis(true);
  };

  const handleViewFullVideoAnalysis = (videoId: string) => {
    onClose();
    navigate(`/video-analysis/${videoId}`);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age;
  };

  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen && !showVideoAnalysis} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <User className="w-5 h-5" />
              {playerName || 'Player Profile'}
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-bright-pink"></div>
              <p className="text-gray-400 ml-4">Loading player data...</p>
            </div>
          ) : !player ? (
            <div className="text-center py-12">
              <p className="text-gray-400">Player not found</p>
            </div>
          ) : (
            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-gray-700">
                <TabsTrigger value="profile" className="text-white data-[state=active]:bg-bright-pink">
                  Player Profile
                </TabsTrigger>
                <TabsTrigger value="videos" className="text-white data-[state=active]:bg-bright-pink">
                  Videos ({videos.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Basic Information */}
                  <Card className="bg-gray-700 border-gray-600">
                    <CardHeader>
                      <CardTitle className="text-white">Basic Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-300">{player.position || 'N/A'}</span>
                      </div>

                      {player.date_of_birth && (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-300">
                            Age: {calculateAge(player.date_of_birth)}
                            ({formatDate(player.date_of_birth)})
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-300">{player.citizenship || 'N/A'}</span>
                      </div>

                      {player.height && (
                        <div className="flex items-center gap-2">
                          <Ruler className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-300">{player.height}cm</span>
                        </div>
                      )}

                      {player.weight && (
                        <div className="flex items-center gap-2">
                          <Weight className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-300">{player.weight}kg</span>
                        </div>
                      )}

                      {player.current_club && (
                        <div className="flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-300">{player.current_club}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Additional Information */}
                  <Card className="bg-gray-700 border-gray-600">
                    <CardHeader>
                      <CardTitle className="text-white">Additional Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {player.foot && (
                        <div>
                          <span className="text-gray-400 text-sm">Preferred Foot:</span>
                          <p className="text-gray-300">{player.foot}</p>
                        </div>
                      )}

                      {player.market_value && (
                        <div>
                          <span className="text-gray-400 text-sm">Market Value:</span>
                          <p className="text-gray-300">
                            {new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: 'USD',
                              minimumFractionDigits: 0
                            }).format(player.market_value)}
                          </p>
                        </div>
                      )}

                      {player.contract_expires && (
                        <div>
                          <span className="text-gray-400 text-sm">Contract Expires:</span>
                          <p className="text-gray-300">{formatDate(player.contract_expires)}</p>
                        </div>
                      )}

                      {player.bio && (
                        <div>
                          <span className="text-gray-400 text-sm">Biography:</span>
                          <p className="text-gray-300 text-sm">{player.bio}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="videos" className="mt-6">
                <Card className="bg-gray-700 border-gray-600">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Video className="w-5 h-5" />
                      Player Videos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {videosLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-bright-pink"></div>
                        <p className="text-gray-400 ml-4">Loading videos...</p>
                      </div>
                    ) : videos.length === 0 ? (
                      <div className="text-center py-12">
                        <Video className="w-16 h-16 mx-auto mb-4 text-gray-500" />
                        <p className="text-gray-400">No videos found for this player</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {videos.map((video) => (
                          <Card key={video.id} className="bg-gray-600 border-gray-500 hover:border-bright-pink/50 transition-colors">
                            <CardContent className="p-4">
                              <div className="aspect-video bg-gray-800 rounded-lg mb-3 relative overflow-hidden">
                                <SmartThumbnail
                                  thumbnailUrl={video.thumbnail_url}
                                  title={video.title}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                  <Button
                                    size="sm"
                                    onClick={() => handleVideoAnalysis(video.id)}
                                    className="bg-bright-pink hover:bg-bright-pink/90"
                                  >
                                    <Play className="w-4 h-4 mr-2" />
                                    Watch & Analyze
                                  </Button>
                                </div>
                              </div>

                              <h4 className="text-white font-medium text-sm mb-2 truncate">
                                {video.title}
                              </h4>

                              <div className="flex items-center justify-between text-xs text-gray-400">
                                <span>{video.team_name || 'Unknown Team'}</span>
                                <span>{formatDate(video.created_at)}</span>
                              </div>

                              <div className="flex gap-2 mt-3">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleVideoAnalysis(video.id)}
                                  className="flex-1 text-xs border-gray-500 hover:bg-gray-500"
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  Quick View
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleViewFullVideoAnalysis(video.id)}
                                  className="flex-1 text-xs bg-bright-pink hover:bg-bright-pink/90"
                                >
                                  <BarChart3 className="w-3 h-3 mr-1" />
                                  Full Analysis
                                  <ArrowRight className="w-3 h-3 ml-1" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Video Analysis Dialog */}
      {showVideoAnalysis && selectedVideoId && (
        <Dialog
          open={showVideoAnalysis}
          onOpenChange={(open) => {
            if (!open) {
              setShowVideoAnalysis(false);
              setSelectedVideoId(null);
            }
          }}
        >
          <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto bg-gray-800 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center justify-between">
                <span>Video Analysis</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewFullVideoAnalysis(selectedVideoId)}
                  className="border-gray-600 hover:bg-gray-700"
                >
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Open Full Page
                </Button>
              </DialogTitle>
            </DialogHeader>
            <VideoAnalysisPageTabs videoId={selectedVideoId} />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default PlayerProfileWrapper;
