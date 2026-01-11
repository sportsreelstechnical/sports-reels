import React, { useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { usePlayerData } from '@/domains/players/hooks/usePlayerData';
import { usePlayerVideoTags } from '@/domains/players/hooks/usePlayerVideoTags';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  User,
  Calendar,
  MapPin,
  Ruler,
  Weight,
  Trophy,
  Flag,
  Building,
  Clock,
  FileText,
  Activity,
  Star,
  TrendingUp,
  Play,
  Eye,
  Brain,
  X
} from 'lucide-react';
import Layout from './Layout';
import VideoAnalysisResults from '@/domains/video/components/VideoAnalysisResults';
import { SmartThumbnail } from '@/domains/video/components/SmartThumbnail';

const PlayerProfilePage: React.FC = () => {
  const { playerId } = useParams<{ playerId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const playerName = location.state?.playerName;

  const { player, loading, error } = usePlayerData(playerId || null);
  const { videos, loading: videosLoading } = usePlayerVideoTags(playerId || '');
  const [showVideoAnalysis, setShowVideoAnalysis] = useState(false);
  const [selectedVideoForAnalysis, setSelectedVideoForAnalysis] = useState<any>(null);
  const [showAllVideosDialog, setShowAllVideosDialog] = useState(false);

  const handleVideoPlay = (video: any) => {
    // Navigate to VideoAnalysisResults page, similar to video management
    navigate(`/videos/${encodeURIComponent(video.title)}`);
  };

  const handleVideoAnalysis = (video: any) => {
    setSelectedVideoForAnalysis(video);
    setShowVideoAnalysis(true);
  };

  const closeVideoAnalysis = () => {
    setShowVideoAnalysis(false);
    setSelectedVideoForAnalysis(null);
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="animate-pulse space-y-8">
            {/* Header skeleton */}
            <div className="relative h-64 bg-gradient-to-r from-gray-800/50 to-gray-700/50 rounded-2xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-bright-pink/5 to-rosegold/5"></div>
              <div className="p-8 flex items-center space-x-8">
                <div className="w-32 h-32 bg-gray-600 rounded-full"></div>
                <div className="space-y-4 flex-1">
                  <div className="h-10 bg-gray-600 rounded-lg w-80"></div>
                  <div className="h-6 bg-gray-600 rounded w-64"></div>
                  <div className="flex space-x-4">
                    <div className="h-8 bg-gray-600 rounded-full w-20"></div>
                    <div className="h-8 bg-gray-600 rounded-full w-16"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cards skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-80 bg-gray-800/50 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !player) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <Card className="border-0 bg-red-950/20 backdrop-blur-sm shadow-2xl rounded-2xl overflow-hidden">
            <CardContent className="p-12 text-center">
              <div className="w-24 h-24 mx-auto mb-8 rounded-full bg-red-500/20 flex items-center justify-center">
                <User className="w-12 h-12 text-red-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-4">
                Player Not Found
              </h2>
              <p className="text-gray-300 text-lg max-w-md mx-auto">
                {error || 'The requested player profile could not be found. Please check the URL and try again.'}
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const StatCard = ({ icon: Icon, label, value }: { icon: any, label: string, value: string | number }) => (
    <div className="bg-gray-800/60 backdrop-blur-sm rounded-xl p-4 border-0 transition-all duration-300 hover:transform hover:scale-[1.02]">
      <div className="flex items-center space-x-3">
        <div className="p-2 rounded-lg bg-bright-pink/20">
          <Icon className="w-5 h-5 text-bright-pink" />
        </div>
        <div>
          <p className="text-gray-400 text-sm font-medium">{label}</p>
          <p className="text-white font-semibold text-lg">{value}</p>
        </div>
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-7xl space-y-6 sm:space-y-8">
        {/* Enhanced Header with Hero Background */}
        <div className="relative rounded-2xl overflow-hidden shadow-2xl">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-bright-pink/20 via-rosegold/15 to-purple-900/20"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-gray-900/80 to-gray-800/60 backdrop-blur-sm"></div>

          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-bright-pink/10 to-transparent rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-rosegold/10 to-transparent rounded-full blur-2xl"></div>

          <div className="relative p-8 lg:p-12">
            <div className="flex flex-col lg:flex-row items-center lg:items-start space-y-6 lg:space-y-0 lg:space-x-10">
              {/* Enhanced Avatar */}
              <div className="relative group">
                <div className="absolute -inset-4 bg-gradient-to-r from-bright-pink/30 to-rosegold/30 rounded-full blur-lg opacity-60 group-hover:opacity-100 transition-opacity duration-300"></div>
                <Avatar className="relative w-28 h-28 sm:w-32 sm:h-32 lg:w-40 lg:h-40 border-0 shadow-2xl">
                  <AvatarImage
                    src={player.profile_image}
                    alt={player.full_name}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-gradient-to-br from-bright-pink to-rosegold text-white text-4xl font-bold">
                    {getInitials(player.full_name)}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Enhanced Player Info */}
              <div className="flex-1 w-full text-center lg:text-left space-y-6">
                <div>
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-3 bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
                    {player.full_name}
                  </h1>

                  <div className="flex flex-wrap justify-center lg:justify-start items-center gap-4">
                    {player.position && (
                      <Badge className="bg-gradient-to-r from-bright-pink to-rosegold text-white px-4 py-2 text-sm font-semibold border-0 shadow-lg hover:shadow-bright-pink/25 transition-shadow duration-300">
                        {player.position}
                      </Badge>
                    )}

                    {player.jersey_number && (
                      <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border-0">
                        <span className="text-gray-300 text-sm font-medium">#</span>
                        <span className="text-white font-bold text-lg">{player.jersey_number}</span>
                      </div>
                    )}

                    {player.team && (
                      <div className="flex items-center gap-2 text-gray-200 bg-white/5 backdrop-blur-sm rounded-full px-4 py-2 border-0">
                        {(player as any).teams?.logo_url ? (
                          <img
                            src={(player as any).teams.logo_url}
                            alt={player.team}
                            className="w-4 h-4 rounded object-contain"
                          />
                        ) : (
                          <Building className="w-4 h-4 text-bright-pink" />
                        )}
                        <span className="font-medium">{player.team}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Stats */}
                {(player.age || player.nationality) && (
                  <div className="flex flex-wrap justify-center lg:justify-start gap-2 sm:gap-3">
                    {player.age && (
                      <div className="flex items-center gap-2 text-gray-200 bg-white/5 backdrop-blur-sm rounded-lg px-3 py-2">
                        <Calendar className="w-4 h-4 text-rosegold" />
                        <span className="text-sm font-medium">{player.age} years</span>
                      </div>
                    )}
                    {player.nationality && (
                      <div className="flex items-center gap-2 text-gray-200 bg-white/5 backdrop-blur-sm rounded-lg px-3 py-2">
                        <Flag className="w-4 h-4 text-rosegold" />
                        <span className="text-sm font-medium">{player.nationality}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {player.height && (
            <StatCard icon={Ruler} label="Height" value={player.height} />
          )}
          {player.weight && (
            <StatCard icon={Weight} label="Weight" value={player.weight} />
          )}
          {player.preferred_foot && (
            <StatCard icon={Activity} label="Preferred Foot" value={player.preferred_foot} />
          )}
          {player.market_value && (
            <StatCard icon={TrendingUp} label="Market Value" value={`$${player.market_value.toLocaleString()}`} />
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Enhanced Career Information */}
          <Card className="xl:col-span-2 bg-gray-800/60 backdrop-blur-sm border-0 shadow-xl rounded-2xl overflow-hidden transition-colors duration-300">
            <CardHeader className=" bg-[#0c0c0c] border-0">
              <CardTitle className="flex items-center gap-3 text-white text-xl">
                <div className="p-2 rounded-lg bg-bright-pink/20">
                  <Trophy className="w-5 h-5 text-bright-pink" />
                </div>
                Career Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 sm:p-8 space-y-5 sm:space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {player.current_club && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-gray-400 text-sm font-medium">
                      <Building className="w-4 h-4" />
                      Current Club
                    </div>
                    <div className="flex items-center gap-2">
                      {(player as any).teams?.logo_url && (
                        <img
                          src={(player as any).teams.logo_url}
                          alt={player.current_club}
                          className="w-5 h-5 rounded object-contain"
                        />
                      )}
                      <p className="text-white font-semibold text-lg">{player.current_club}</p>
                    </div>
                  </div>
                )}

                {player.contract_expires && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-gray-400 text-sm font-medium">
                      <Clock className="w-4 h-4" />
                      Contract Expires
                    </div>
                    <p className="text-white font-semibold text-lg">
                      {new Date(player.contract_expires).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>

              {player.achievements && player.achievements.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-gray-400 text-sm font-medium">
                    <Star className="w-4 h-4" />
                    Achievements
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {player.achievements.map((achievement, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="border-0 text-bright-pink  transition-colors duration-200 px-3 py-1"
                      >
                        {achievement}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Enhanced Videos Section */}
          <Card className="bg-gray-800/60 backdrop-blur-sm border-0 shadow-xl rounded-2xl overflow-hidden hover:border-bright-pink/30 transition-colors duration-300">
            <CardHeader className="bg-[#0c0c0c] border-0 px-5 sm:px-6 py-4">
              <CardTitle className="flex items-center gap-3 text-white text-lg sm:text-xl">
                <div className="p-2 rounded-lg bg-bright-pink/20">
                  <Play className="w-5 h-5 text-bright-pink" />
                </div>
                Tagged Videos
                <Badge className="bg-bright-pink/20 text-bright-pink border-0 ml-auto">
                  {videos.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 sm:p-6 space-y-4">
              {videosLoading ? (
                <div className="space-y-3 max-h-72 overflow-y-auto">
                  {[1, 2].map((i) => (
                    <div key={i} className="animate-pulse flex gap-3">
                      <div className="w-32 h-20 bg-gray-700/50 rounded-lg flex-shrink-0"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-700/50 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-700/50 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : videos.length > 0 ? (
                <>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {videos.slice(0, 2).map((video) => (
                      <div
                        key={video.id}
                        className="group flex flex-col sm:flex-row gap-3 bg-gray-700/30 hover:bg-gray-700/50 rounded-xl border-0 transition-all duration-300 overflow-hidden hover:shadow-lg hover:shadow-bright-pink/20 p-3"
                      >
                        <div className="w-full sm:w-32 h-44 sm:h-20 bg-black rounded-lg relative overflow-hidden flex-shrink-0">
                          <SmartThumbnail
                            thumbnailUrl={video.thumbnail_url}
                            title={video.title}
                            className="w-full h-full object-cover"
                          />
                          {video.ai_analysis_status === 'completed' && (
                            <div className="absolute top-1 right-1">
                              <Badge className="bg-black/60 text-green-400 border-green-400 border-0 text-xs px-1 py-0">
                                <Brain className="w-2 h-2 mr-0.5" />
                                AI
                              </Badge>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <h4 className="font-semibold text-white mb-1 line-clamp-1 group-hover:text-bright-pink transition-colors duration-200 text-sm">
                              {video.title}
                            </h4>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                              {video.team_name && (
                                <span className="flex items-center gap-1.5">
                                  {video.team_logo_url ? (
                                    <img
                                      src={video.team_logo_url}
                                      alt={video.team_name}
                                      className="w-4 h-4 rounded object-contain"
                                    />
                                  ) : (
                                    <Building className="w-3 h-3" />
                                  )}
                                  {video.team_name}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(video.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <div className="mt-auto pt-2 flex flex-col sm:flex-row sm:items-center sm:gap-2">
                            <Button
                              size="sm"
                              className="bg-bright-pink hover:bg-bright-pink/90 text-white h-8 px-3 text-xs sm:text-sm w-full sm:w-auto"
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
                        className="w-full border-bright-pink/30 text-bright-pink hover:bg-bright-pink/10"
                        onClick={() => setShowAllVideosDialog(true)}
                      >
                        View All Videos ({videos.length})
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <Play className="w-12 h-12 mx-auto text-gray-600 mb-4" />
                  <p className="text-gray-400">
                    No videos found for this player.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Biography */}
        {player.bio && (
          <Card className="bg-gray-800/60 backdrop-blur-sm border-0 shadow-xl rounded-2xl overflow-hidden transition-colors duration-300">
            <CardHeader className="bg-[#0c0c0c] border-0 px-5 sm:px-6 py-4">
              <CardTitle className="flex items-center gap-3 text-white text-lg sm:text-xl">
                <div className="p-2 rounded-lg bg-bright-pink/20">
                  <FileText className="w-5 h-5 text-bright-pink" />
                </div>
                Biography
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 sm:p-8">
              <div className="prose prose-gray max-w-none">
                <p className="text-gray-300 leading-relaxed text-base sm:text-lg">
                  {player.bio}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Video Analysis Dialog */}
      {showVideoAnalysis && selectedVideoForAnalysis && (
        <Dialog open={showVideoAnalysis} onOpenChange={closeVideoAnalysis}>
          <DialogContent className="max-w-7xl w-full max-h-[95vh] overflow-hidden bg-gray-800 border-gray-700 px-3 sm:px-6">
            <DialogHeader className="flex flex-row items-center justify-between">
              <DialogTitle className="text-white font-polysans text-xl flex items-center gap-2">
                <Brain className="h-5 w-5 text-bright-pink" />
                AI Video Analysis - {selectedVideoForAnalysis.title}
              </DialogTitle>
              <Button variant="ghost" size="sm" onClick={closeVideoAnalysis}>
                <X className="h-4 w-4" />
              </Button>
            </DialogHeader>
            <div className="overflow-y-auto max-h-[calc(95vh-120px)]">
              <VideoAnalysisResults
                videoId={selectedVideoForAnalysis.id}
                videoType={selectedVideoForAnalysis.video_type as 'match' | 'training' | 'highlight' | 'interview' || 'highlight'}
                teamId={selectedVideoForAnalysis.team_id || ''}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* All Videos Dialog */}
      <Dialog open={showAllVideosDialog} onOpenChange={setShowAllVideosDialog}>
        <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-hidden bg-gray-800 border-gray-700 px-3 sm:px-6">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Play className="w-5 h-5 text-bright-pink" />
              All Tagged Videos ({videos.length})
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[calc(90vh-120px)] pr-1 sm:pr-2">
            <div className="space-y-3">
              {videos.map((video) => (
                <div
                  key={video.id}
                  className="group flex flex-col sm:flex-row gap-3 bg-gray-700/30 hover:bg-gray-700/50 rounded-xl border-0 transition-all duration-300 overflow-hidden hover:shadow-lg hover:shadow-bright-pink/20 p-3"
                >
                  <div className="w-full sm:w-32 h-44 sm:h-20 bg-black rounded-lg relative overflow-hidden flex-shrink-0">
                    <SmartThumbnail
                      thumbnailUrl={video.thumbnail_url}
                      title={video.title}
                      className="w-full h-full object-cover"
                    />
                    {video.ai_analysis_status === 'completed' && (
                      <div className="absolute top-1 right-1">
                        <Badge className="bg-black/60 text-green-400 border-green-400 border-0 text-xs px-1 py-0">
                          <Brain className="w-2 h-2 mr-0.5" />
                          AI
                        </Badge>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <h4 className="font-semibold text-white mb-1 line-clamp-1 group-hover:text-bright-pink transition-colors duration-200 text-sm">
                        {video.title}
                      </h4>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                        {video.team_name && (
                          <span className="flex items-center gap-1">
                            <Building className="w-3 h-3" />
                            {video.team_name}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(video.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="mt-auto pt-2 flex flex-col sm:flex-row sm:items-center sm:gap-2">
                      <Button
                        size="sm"
                        className="bg-bright-pink hover:bg-bright-pink/90 text-white h-8 px-3 text-xs sm:text-sm w-full sm:w-auto"
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
    </Layout>
  );
};

export default PlayerProfilePage;