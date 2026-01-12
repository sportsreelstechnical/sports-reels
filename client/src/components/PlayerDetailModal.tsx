import React, { useState, useEffect } from 'react';
// import { supabase } from '@/integrations/supabase/client'; // Removed
import { fileUploadService } from '@/services/fileUploadService';
import { SmartThumbnail } from '@/domains/video/components/SmartThumbnail';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { r2VideoRetrievalService } from '@/domains/video/services/r2VideoRetrievalService';
import {
  User,
  Calendar,
  MapPin,
  Ruler,
  Weight,
  DollarSign,
  Video,
  MessageSquare,
  Star,
  Trophy,
  Target,
  X,
  Play,
  Edit,
  Image,
  Upload,
  Plus,
  Trash2,
  Eye,
  Download,
  BarChart3,
  Brain
} from 'lucide-react';
// type DatabasePlayer = Tables<'players'>; // Removed Supabase type
// type DatabaseVideo = Tables<'videos'>; // Removed Supabase type
import type { Player, Video, Team } from '@shared/schema';

type DatabasePlayer = Player; // Aliasing for compatibility or refactor prop types
type DatabaseVideo = Video;

interface PlayerPhoto {
  id: string;
  url: string;
  title: string;
  description?: string;
  uploadedAt: string;
  type: 'headshot' | 'action' | 'team' | 'other';
}

interface PlayerDetailModalProps {
  player: DatabasePlayer;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void;
}

const PlayerDetailModal: React.FC<PlayerDetailModalProps> = ({
  player,
  isOpen,
  onClose,
  onEdit
}) => {
  const { profile, team: authTeam } = useAuth();
  const { toast } = useToast();
  const [videos, setVideos] = useState<DatabaseVideo[]>([]);
  const [photos, setPhotos] = useState<PlayerPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [age, setAge] = useState<number | null>(null);
  const [isOwnPlayer, setIsOwnPlayer] = useState(false);
  const [showVideoAnalysis, setShowVideoAnalysis] = useState(false);
  const [selectedVideoForAnalysis, setSelectedVideoForAnalysis] = useState<DatabaseVideo | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<PlayerPhoto | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  useEffect(() => {
    if (isOpen && player) {
      calculateAge();
      checkOwnership();
      fetchPlayerVideos();
      fetchPlayerPhotos();
    }
  }, [isOpen, player, profile]);

  const calculateAge = () => {
    if (player.dateOfBirth) {
      const birthDate = new Date(player.dateOfBirth);
      const today = new Date();
      const calculatedAge = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();

      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        setAge(calculatedAge - 1);
      } else {
        setAge(calculatedAge);
      }
    }
  };

  const checkOwnership = () => {
    if (!authTeam || !player.teamId) return;
    if (authTeam.id === player.teamId) {
      setIsOwnPlayer(true);
    }
  };

  const fetchPlayerVideos = async () => {
    try {
      setLoading(true);

      // Only fetch videos if player has a valid team_id
      if (!player.teamId) {
        setVideos([]);
        return;
      }

      const response = await fetch(`/api/videos?playerId=${player.id}`);
      if (!response.ok) throw new Error('Failed to fetch videos');
      const data = await response.json();

      setVideos(data);
    } catch (error) {
      console.error('Error fetching videos:', error);
      setVideos([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlayerPhotos = async () => {
    try {
      setPhotoLoading(true);

      const response = await fetch(`/api/players/${player.id}/photos`);
      if (!response.ok) {
        throw new Error('Failed to fetch photos');
      }
      const photoList = await response.json();

      // Add existing photo URLs from player data if strictly needed, or rely on the photos table
      const existingPhotos: PlayerPhoto[] = [];
      // ... existing logic for legacy fields photo_url/headshot_url if desired, or skip

      setPhotos(photoList);
    } catch (error) {
      console.error('Error fetching player photos:', error);
      toast({
        title: "Error",
        description: "Failed to fetch photos",
        variant: "destructive"
      });
    } finally {
      setPhotoLoading(false);
    }
  };

  const handleVideoAnalysis = (video: DatabaseVideo) => {
    setSelectedVideoForAnalysis(video);
    setShowVideoAnalysis(true);
  };

  const closeVideoAnalysis = () => {
    setShowVideoAnalysis(false);
    setSelectedVideoForAnalysis(null);
  };

  const getPhotoType = (filename: string): 'headshot' | 'action' | 'team' | 'other' => {
    const lowerName = filename.toLowerCase();
    if (lowerName.includes('headshot') || lowerName.includes('portrait')) return 'headshot';
    if (lowerName.includes('action') || lowerName.includes('game')) return 'action';
    if (lowerName.includes('team') || lowerName.includes('group')) return 'team';
    return 'other';
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    try {
      setPhotoLoading(true);

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // 1. Upload to Object Storage
        const objectPath = await fileUploadService.uploadFile(file);

        // 2. Create DB record
        const response = await fetch(`/api/players/${player.id}/photos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: objectPath, // This will be the relative path, can be served via /objects/...
            title: file.name,
            description: 'Uploaded via player modal',
            type: getPhotoType(file.name),
            objectPath: objectPath
          })
        });

        if (!response.ok) {
          throw new Error(`Failed to save photo record for ${file.name}`);
        }

        toast({
          title: "Success",
          description: `${file.name} uploaded successfully`,
        });
      }

      // Refresh photos
      fetchPlayerPhotos();
    } catch (error) {
      console.error('Error uploading photos:', error);
      toast({
        title: "Error",
        description: "Failed to upload photos",
        variant: "destructive"
      });
    } finally {
      setPhotoLoading(false);
    }
  };

  const handleDeletePhoto = async (photoId: string, photoUrl: string) => {
    try {
      const response = await fetch(`/api/player-photos/${photoId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete photo');
      }

      // Remove from local state
      setPhotos(photos.filter(photo => photo.id !== photoId));

      toast({
        title: "Success",
        description: "Photo deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast({
        title: "Error",
        description: "Failed to delete photo",
        variant: "destructive"
      });
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-[#1a1a1a] border-gray-700">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle className="text-white font-polysans text-2xl">
              {player.firstName} {player.lastName}
            </DialogTitle>
            <div className="flex gap-2">
              {isOwnPlayer && onEdit && (
                <Button variant="outline" size="sm" onClick={onEdit}>
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* Player Header */}
            <div className="flex items-start gap-6">
              <div className="w-32 h-32 rounded-lg overflow-hidden bg-gray-700 flex-shrink-0">
                {player.profileImageUrl ? (
                  <img
                    src={player.profileImageUrl}
                    alt={`${player.firstName} ${player.lastName}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-16 h-16 text-gray-400" />
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge variant="outline" className="text-rosegold border-rosegold text-lg px-3 py-1">
                    {player.position}
                  </Badge>
                  {player.jerseyNumber && (
                    <Badge variant="outline" className="text-blue-400 border-blue-400 text-lg px-3 py-1">
                      #{player.jerseyNumber}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-gray-300 border-gray-300">
                    {/* Gender not explicitly in schema viewed, assuming omitted or mapped if present */}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-gray-400">Age</p>
                      <p className="text-white font-semibold">{age || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-gray-400">Nationality</p>
                      <p className="text-white font-semibold">{player.nationality}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Ruler className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-gray-400">Height</p>
                      <p className="text-white font-semibold">{player.height ? `${player.height} cm` : 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Weight className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-gray-400">Weight</p>
                      <p className="text-white font-semibold">{player.weight ? `${player.weight} kg` : 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-gray-400">Market Value</p>
                      <p className="text-white font-semibold">
                        {player.marketValue ? formatCurrency(player.marketValue) : 'N/A'}
                      </p>
                    </div>
                  </div>
                  {player.preferredFoot && (
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-gray-400">Preferred Foot</p>
                        <p className="text-white font-semibold capitalize">{player.preferredFoot}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-5 bg-gray-800">
                <TabsTrigger value="overview" className="text-white">Overview</TabsTrigger>
                <TabsTrigger value="career" className="text-white">Career</TabsTrigger>
                <TabsTrigger value="videos" className="text-white">Videos</TabsTrigger>
                <TabsTrigger value="media" className="text-white">Media</TabsTrigger>
                <TabsTrigger value="stats" className="text-white">Stats</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                {/* Bio */}
                {/* Bio not in schema viewed, possibly need to add or remove */}

                {/* Personal Information */}
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white font-polysans">Personal Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {player.dateOfBirth && (
                        <div>
                          <p className="text-gray-400 text-sm">Date of Birth</p>
                          <p className="text-white">{formatDate(player.dateOfBirth)}</p>
                        </div>
                      )}
                      {player.birthPlace && (
                        <div>
                          <p className="text-gray-400 text-sm">Place of Birth</p>
                          <p className="text-white">{player.birthPlace}</p>
                        </div>
                      )}
                      {/* fifa_id not in schema viewed */}
                      {player.agentName && (
                        <div>
                          <p className="text-gray-400 text-sm">Agent</p>
                          <p className="text-white">{player.agentName}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="career" className="space-y-4">
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white font-polysans">Career Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {player.currentClubName && (
                        <div>
                          <p className="text-gray-400 text-sm">Current Club</p>
                          <p className="text-white">{player.currentClubName}</p>
                        </div>
                      )}
                      {player.contractEndDate && (
                        <div>
                          <p className="text-gray-400 text-sm">Contract Expires</p>
                          <p className="text-white">{formatDate(player.contractEndDate)}</p>
                        </div>
                      )}
                    </div>

                    {/* Leagues */}
                    {player.leagues_participated && player.leagues_participated.length > 0 && (
                      <div>
                        <p className="text-gray-400 text-sm mb-2">Leagues Participated</p>
                        <div className="flex flex-wrap gap-2">
                          {player.leagues_participated.map((league, index) => (
                            <Badge key={index} variant="outline" className="text-blue-400 border-blue-400">
                              {league}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Titles */}
                    {player.titles_seasons && player.titles_seasons.length > 0 && (
                      <div>
                        <p className="text-gray-400 text-sm mb-2">Titles & Seasons</p>
                        <div className="flex flex-wrap gap-2">
                          {player.titles_seasons.map((title, index) => (
                            <Badge key={index} variant="outline" className="text-yellow-400 border-yellow-400">
                              <Trophy className="h-3 w-3 mr-1" />
                              {title}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="videos" className="space-y-4">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rosegold mx-auto"></div>
                    <p className="text-gray-400 mt-2">Loading videos...</p>
                  </div>
                ) : videos.length === 0 ? (
                  <Card className="bg-gray-800 border-gray-700">
                    <CardContent className="p-8 text-center">
                      <Video className="w-12 h-12 mx-auto mb-4 text-gray-500" />
                      <p className="text-gray-400">No videos available</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {videos.map((video) => (
                      <Card key={video.id} className="bg-gray-800 border-gray-700 hover:border-rosegold/50 transition-colors group">
                        <CardContent className="p-4">
                          <div className="aspect-video bg-gray-700 rounded-lg mb-3 relative overflow-hidden">
                            <SmartThumbnail
                              thumbnailUrl={video.thumbnailUrl}
                              title={video.title}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="bg-white/20 hover:bg-white/30 text-white border-0"
                                  onClick={async () => {
                                    // Get signed URL before opening
                                    const videoRetrieval = await r2VideoRetrievalService.getVideoForPlayback(video.fileUrl);
                                    if (videoRetrieval.success && videoRetrieval.videoUrl) {
                                      window.open(videoRetrieval.videoUrl, '_blank');
                                    } else {
                                      console.error('Failed to get video URL:', videoRetrieval.error);
                                    }
                                  }}
                                >
                                  <Play className="w-4 h-4 mr-1" />
                                  Play
                                </Button>
                                <Button
                                  size="sm"
                                  className="bg-bright-pink/80 hover:bg-bright-pink text-white border-0"
                                  onClick={() => handleVideoAnalysis(video)}
                                >
                                  <Brain className="w-4 h-4 mr-1" />
                                  Analyze
                                </Button>
                              </div>
                            </div>
                          </div>
                          <h4 className="text-white font-polysans font-semibold truncate">{video.title}</h4>
                          {video.description && (
                            <p className="text-gray-400 text-sm mt-1 line-clamp-2">{video.description}</p>
                          )}
                          <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                            <span>{video.duration ? `${video.duration}s` : 'N/A'}</span>
                            <span>{video.videoType || 'highlight'}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="media" className="space-y-4">
                {/* Upload Section */}
                {isOwnPlayer && (
                  <Card className="bg-gray-800 border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-white font-polysans flex items-center gap-2">
                        <Upload className="h-5 w-5" />
                        Upload Photos
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4">
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="hidden"
                          id="photo-upload"
                          disabled={photoLoading}
                        />
                        <label
                          htmlFor="photo-upload"
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed border-gray-600 hover:border-rosegold/50 transition-colors cursor-pointer ${photoLoading ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                        >
                          <Plus className="h-4 w-4" />
                          <span className="text-white">Select Photos</span>
                        </label>
                        {photoLoading && (
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-rosegold"></div>
                            <span className="text-gray-400 text-sm">Uploading...</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Photo Gallery */}
                {photoLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rosegold mx-auto"></div>
                    <p className="text-gray-400 mt-2">Loading photos...</p>
                  </div>
                ) : photos.length === 0 ? (
                  <Card className="bg-gray-800 border-gray-700">
                    <CardContent className="p-8 text-center">
                      <Image className="w-12 h-12 mx-auto mb-4 text-gray-500" />
                      <p className="text-gray-400">No photos available</p>
                      {isOwnPlayer && (
                        <p className="text-gray-500 text-sm mt-2">Upload photos to showcase the player</p>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {photos.map((photo) => (
                      <Card key={photo.id} className="bg-gray-800 border-gray-700 hover:border-rosegold/50 transition-colors group">
                        <CardContent className="p-2">
                          <div className="aspect-square bg-gray-700 rounded-lg relative overflow-hidden">
                            <img
                              src={photo.url}
                              alt={photo.title}
                              className="w-full h-full object-cover cursor-pointer"
                              onClick={() => {
                                setSelectedPhoto(photo);
                                setShowPhotoModal(true);
                              }}
                            />
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-white hover:text-rosegold"
                                  onClick={() => {
                                    setSelectedPhoto(photo);
                                    setShowPhotoModal(true);
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {isOwnPlayer && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-white hover:text-red-400"
                                    onClick={() => handleDeletePhoto(photo.id, photo.url)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="mt-2">
                            <h4 className="text-white font-polysans text-sm font-semibold truncate">{photo.title}</h4>
                            <div className="flex items-center justify-between mt-1">
                              <Badge variant="outline" className="text-xs text-gray-400 border-gray-600">
                                {photo.type}
                              </Badge>
                              <span className="text-xs text-gray-400">
                                {new Date(photo.uploaded_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="stats" className="space-y-4">
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white font-polysans">Performance Statistics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {player.match_stats ? (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {Object.entries(player.match_stats as Record<string, any>).map(([key, value]) => (
                          <div key={key} className="text-center">
                            <p className="text-2xl font-bold text-rosegold">{value}</p>
                            <p className="text-gray-400 text-sm capitalize">{key.replace('_', ' ')}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-400 text-center py-8">No statistics available</p>
                    )}
                  </CardContent>
                </Card>

                {/* AI Analysis */}
                {player.ai_analysis && (
                  <Card className="bg-gray-800 border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-white font-polysans flex items-center gap-2">
                        <Star className="h-5 w-5 text-yellow-400" />
                        AI Analysis
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Object.entries(player.ai_analysis as Record<string, any>).map(([key, value]) => (
                          <div key={key}>
                            <p className="text-gray-400 text-sm capitalize">{key.replace('_', ' ')}</p>
                            <p className="text-white">{value}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      {/* Photo Modal */}
      {selectedPhoto && (
        <Dialog open={showPhotoModal} onOpenChange={setShowPhotoModal}>
          <DialogContent className="max-w-4xl bg-[#1a1a1a] border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-white font-polysans flex items-center justify-between">
                <span>{selectedPhoto.title}</span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = selectedPhoto.url;
                      link.download = selectedPhoto.title;
                      link.click();
                    }}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowPhotoModal(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="aspect-video bg-gray-700 rounded-lg overflow-hidden">
                <img
                  src={selectedPhoto.url}
                  alt={selectedPhoto.title}
                  className="w-full h-full object-contain"
                />
              </div>
              {selectedPhoto.description && (
                <p className="text-gray-300">{selectedPhoto.description}</p>
              )}
              <div className="flex items-center justify-between text-sm text-gray-400">
                <span>Type: {selectedPhoto.type}</span>
                <span>Uploaded: {new Date(selectedPhoto.uploadedAt).toLocaleDateString()}</span>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Video Analysis Dialog */}
      {showVideoAnalysis && selectedVideoForAnalysis && (
        <Dialog open={showVideoAnalysis} onOpenChange={closeVideoAnalysis}>
          <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden bg-gray-800 border-gray-700">
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
                videoType={selectedVideoForAnalysis.videoType as 'match' | 'training' | 'highlight' | 'interview' || 'highlight'}
                teamId={selectedVideoForAnalysis.teamId || ''}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default PlayerDetailModal;
