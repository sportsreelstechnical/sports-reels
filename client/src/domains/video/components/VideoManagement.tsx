
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Video,
  Plus,
  Eye,
  Download,
  Search,
  Filter,
  Calendar,
  Clock,
  Users,
  Brain,
  FileText,
  Trash2,
  MoreVertical,
  Edit,
  Play
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import EnhancedVideoUploadForm from './EnhancedVideoUploadForm';
import VideoAnalysisResults from './VideoAnalysisResults';
import { SmartThumbnail } from './SmartThumbnail';

interface Video {
  id: string;
  title: string;
  video_url: string;
  thumbnail_url: string;
  video_type: 'match' | 'training' | 'highlight' | 'interview';
  ai_analysis_status: string;
  created_at: string;
  duration: number;
  opposing_team?: string;
  final_score?: string;
  league?: string;
}

const VideoManagement: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [videos, setVideos] = useState<Video[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.user_type === 'team') {
      loadTeamData();
    }
  }, [profile]);

  useEffect(() => {
    if (teamId) {
      loadVideos();
    }
  }, [teamId]);

  useEffect(() => {
    applyFilters();
  }, [videos, searchTerm, filterType, filterStatus]);

  const loadTeamData = async () => {
    try {
      const { data: teamData, error } = await supabase
        .from('teams')
        .select('id')
        .eq('profile_id', profile?.id)
        .single();

      if (error) throw error;
      setTeamId(teamData.id);
    } catch (error) {
      console.error('Error loading team data:', error);
      toast({
        title: "Loading Error",
        description: "Failed to load team information",
        variant: "destructive"
      });
    }
  };

  const loadVideos = async () => {
    if (!teamId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transformedVideos = (data || []).map(video => ({
        id: video.id,
        title: video.title,
        video_url: video.video_url,
        thumbnail_url: video.thumbnail_url || '',
        video_type: video.video_type as 'match' | 'training' | 'highlight' | 'interview',
        ai_analysis_status: video.ai_analysis_status,
        created_at: video.created_at,
        duration: video.duration || 0,
        opposing_team: video.opposing_team || undefined,
        final_score: video.final_score_home && video.final_score_away
          ? `${video.final_score_home}-${video.final_score_away}`
          : undefined,
        league: undefined,
      }));

      setVideos(transformedVideos);
    } catch (error) {
      console.error('Error loading videos:', error);
      toast({
        title: "Loading Error",
        description: "Failed to load videos",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = videos;

    if (searchTerm) {
      filtered = filtered.filter(video =>
        video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        video.opposing_team?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        video.league?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterType !== 'all') {
      filtered = filtered.filter(video => video.video_type === filterType);
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(video => video.ai_analysis_status === filterStatus);
    }

    setFilteredVideos(filtered);
  };

  const deleteVideo = async (videoId: string) => {
    if (!confirm('Are you sure you want to delete this video? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('videos')
        .delete()
        .eq('id', videoId);

      if (error) throw error;

      toast({
        title: "Video Deleted",
        description: "Video has been successfully deleted",
      });

      loadVideos();
    } catch (error) {
      console.error('Error deleting video:', error);
      toast({
        title: "Delete Error",
        description: "Failed to delete video",
        variant: "destructive"
      });
    }
  };

  const editVideo = (video: Video) => {
    // TODO: Implement edit functionality
    toast({
      title: "Edit Video",
      description: `Edit functionality for "${video.title}" will be implemented soon`,
    });
  };

  const playVideo = (video: Video) => {
    // TODO: Implement video playback
    toast({
      title: "Play Video",
      description: `Playing "${video.title}"`,
    });
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500 text-white border-0 text-[10px] sm:text-xs px-1.5 sm:px-2">Analyzed</Badge>;
      case 'analyzing':
        return <Badge className="bg-yellow-500 text-white border-0 text-[10px] sm:text-xs px-1.5 sm:px-2">Analyzing</Badge>;
      case 'failed':
        return <Badge className="bg-red-500 text-white border-0 text-[10px] sm:text-xs px-1.5 sm:px-2">Failed</Badge>;
      default:
        return <Badge className="bg-white/40 text-white border-0 text-[10px] sm:text-xs px-1.5 sm:px-2">Pending</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    const colors = {
      match: 'bg-blue-500',
      training: 'bg-green-500',
      interview: 'bg-purple-500',
      highlight: 'bg-orange-500'
    };

    return (
      <Badge className={`${colors[type as keyof typeof colors]} text-white border-0 text-[10px] sm:text-xs px-1.5 sm:px-2`}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    );
  };

  if (profile?.user_type !== 'team') {
    return (
      <Card className="bg-[#111111] border-0">
        <CardContent className="p-6 sm:p-8 text-center">
          <Video className="w-10 h-10 sm:w-12 sm:h-12 text-white/40 mx-auto mb-3 sm:mb-4" />
          <h3 className="text-white font-medium mb-2 text-sm sm:text-base">Team Access Only</h3>
          <p className="text-white/60 text-xs sm:text-sm">This feature is only available for team accounts.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1 sm:mb-2">Video Management</h1>
          <p className="text-xs sm:text-sm text-white/60">Upload, analyze, and manage your team's video content</p>
        </div>

        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogTrigger asChild>
            <Button className="bg-rosegold text-white border-0 w-full sm:w-auto h-9 sm:h-10 text-xs sm:text-sm">
              <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
              <span className="hidden sm:inline">Upload Videos</span>
              <span className="sm:hidden">Upload</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-[#111111] border-0">
            <DialogHeader>
              <DialogTitle className="text-white">Upload Videos</DialogTitle>
            </DialogHeader>
            {teamId && (
              <EnhancedVideoUploadForm
                teamId={teamId}
                onUploadComplete={() => {
                  setShowUploadDialog(false);
                  loadVideos();
                  toast({
                    title: "Upload Complete",
                    description: "Video(s) uploaded successfully!",
                  });
                }}
                onCancel={() => setShowUploadDialog(false)}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-[#111111] border-0">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <div className="flex-1 min-w-0">
              <div className="relative">
                <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-white/60 w-3 h-3 sm:w-4 sm:h-4" />
                <Input
                  placeholder="Search videos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 sm:pl-10 bg-[#1a1a1a] border-0 text-white text-xs sm:text-sm h-9 sm:h-10"
                />
              </div>
            </div>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-[140px] bg-[#1a1a1a] border-0 text-white text-xs sm:text-sm h-9 sm:h-10">
                <SelectValue placeholder="Video Type" />
              </SelectTrigger>
              <SelectContent className="bg-[#111111] border-0">
                <SelectItem value="all" className="text-white text-xs sm:text-sm">All Types</SelectItem>
                <SelectItem value="match" className="text-white text-xs sm:text-sm">Match</SelectItem>
                <SelectItem value="training" className="text-white text-xs sm:text-sm">Training</SelectItem>
                <SelectItem value="interview" className="text-white text-xs sm:text-sm">Interview</SelectItem>
                <SelectItem value="highlight" className="text-white text-xs sm:text-sm">Highlight</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[140px] bg-[#1a1a1a] border-0 text-white text-xs sm:text-sm h-9 sm:h-10">
                <SelectValue placeholder="Analysis Status" />
              </SelectTrigger>
              <SelectContent className="bg-[#111111] border-0">
                <SelectItem value="all" className="text-white text-xs sm:text-sm">All Status</SelectItem>
                <SelectItem value="completed" className="text-white text-xs sm:text-sm">Analyzed</SelectItem>
                <SelectItem value="analyzing" className="text-white text-xs sm:text-sm">Analyzing</SelectItem>
                <SelectItem value="pending" className="text-white text-xs sm:text-sm">Pending</SelectItem>
                <SelectItem value="failed" className="text-white text-xs sm:text-sm">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
          {[...Array(6)].map((_, index) => (
            <Card key={index} className="bg-[#111111] border-0 animate-pulse">
              <div className="aspect-video bg-[#1a1a1a] rounded-t-lg" />
              <CardContent className="p-3 sm:p-4">
                <div className="h-3 sm:h-4 bg-[#1a1a1a] rounded mb-2" />
                <div className="h-2 sm:h-3 bg-[#1a1a1a] rounded w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredVideos.length === 0 ? (
        <Card className="bg-[#111111] border-0">
          <CardContent className="p-8 sm:p-12 text-center">
            <Video className="w-12 h-12 sm:w-16 sm:h-16 text-white/40 mx-auto mb-3 sm:mb-4" />
            <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">
              {videos.length === 0 ? 'No Videos Yet' : 'No Matching Videos'}
            </h3>
            <p className="text-xs sm:text-sm text-white/60 mb-4 sm:mb-6">
              {videos.length === 0
                ? 'Upload your first video to get started with AI analysis'
                : 'Try adjusting your filters to see more videos'
              }
            </p>
            {videos.length === 0 && (
              <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-rosegold text-white border-0 h-9 sm:h-10 text-xs sm:text-sm">
                    <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                    Upload Your First Videos
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-[#111111] border-0">
                  <DialogHeader>
                    <DialogTitle className="text-white">Upload Videos</DialogTitle>
                  </DialogHeader>
                  {teamId && (
                    <EnhancedVideoUploadForm
                      teamId={teamId}
                      onUploadComplete={() => {
                        setShowUploadDialog(false);
                        loadVideos();
                        toast({
                          title: "Upload Complete",
                          description: "Video(s) uploaded successfully!",
                        });
                      }}
                      onCancel={() => setShowUploadDialog(false)}
                    />
                  )}
                </DialogContent>
              </Dialog>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
          {filteredVideos.map((video) => (
            <Card key={video.id} className="bg-[#111111] border-0 overflow-hidden">
              <div className="relative aspect-video bg-[#1a1a1a]">
                <SmartThumbnail
                  thumbnailUrl={video.thumbnail_url}
                  title={video.title}
                  className="w-full h-full object-cover"
                />

                {video.duration > 0 && (
                  <div className="absolute bottom-1.5 sm:bottom-2 right-1.5 sm:right-2 bg-black/70 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-white text-[10px] sm:text-xs">
                    {formatDuration(video.duration)}
                  </div>
                )}

                <div className="absolute top-1.5 sm:top-2 left-1.5 sm:left-2">
                  {getStatusBadge(video.ai_analysis_status)}
                </div>
              </div>

              <CardContent className="p-3 sm:p-4">
                <div className="flex items-start justify-between mb-2 gap-2">
                  <h3 className="text-white font-medium line-clamp-2 flex-1 text-sm sm:text-base leading-tight">
                    {video.title}
                  </h3>
                  <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => playVideo(video)}
                      className="text-white/60 border-0 h-7 w-7 sm:h-8 sm:w-8 p-0"
                      title="Play Video"
                    >
                      <Play className="w-3 h-3 sm:w-4 sm:h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => editVideo(video)}
                      className="text-white/60 border-0 h-7 w-7 sm:h-8 sm:w-8 p-0"
                      title="Edit Video"
                    >
                      <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteVideo(video.id)}
                      className="text-red-400 border-0 h-7 w-7 sm:h-8 sm:w-8 p-0"
                      title="Delete Video"
                    >
                      <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                  {getTypeBadge(video.video_type)}
                </div>

                {video.video_type === 'match' && video.opposing_team && (
                  <div className="text-xs sm:text-sm text-white/60 mb-2">
                    vs {video.opposing_team}
                    {video.final_score && (
                      <span className="ml-2 text-white">({video.final_score})</span>
                    )}
                  </div>
                )}

                <div className="flex items-center text-[10px] sm:text-xs text-white/40 mb-3 sm:mb-4">
                  <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1" />
                  {new Date(video.created_at).toLocaleDateString()}
                </div>

                <div className="flex gap-1.5 sm:gap-2">
                  {video.ai_analysis_status === 'completed' ? (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          className="flex-1 bg-rosegold text-white border-0 h-8 sm:h-9 text-xs sm:text-sm"
                        >
                          <Brain className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                          <span className="hidden sm:inline">View Analysis</span>
                          <span className="sm:hidden">Analysis</span>
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-[#111111] border-0">
                        <DialogHeader>
                          <DialogTitle className="text-white">{video.title} - AI Analysis</DialogTitle>
                        </DialogHeader>
                        {teamId && (
                          <VideoAnalysisResults
                            videoId={video.id}
                            teamId={teamId}
                            videoType={video.video_type}
                          />
                        )}
                      </DialogContent>
                    </Dialog>
                  ) : (
                    <Button
                      size="sm"
                      className="flex-1 bg-[#1a1a1a] text-white/60 border-0 h-8 sm:h-9 text-xs sm:text-sm"
                      disabled
                    >
                      {video.ai_analysis_status === 'analyzing' ? (
                        <>
                          <div className="animate-spin w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1 border border-current border-t-transparent rounded-full" />
                          <span className="hidden sm:inline">Analyzing...</span>
                          <span className="sm:hidden">...</span>
                        </>
                      ) : (
                        <>
                          <span className="hidden sm:inline">Analysis Pending</span>
                          <span className="sm:hidden">Pending</span>
                        </>
                      )}
                    </Button>
                  )}

                  <Button
                    size="sm"
                    className="bg-[#1a1a1a] text-white/60 border-0 h-8 sm:h-9 w-8 sm:w-9 p-0"
                    onClick={() => window.open(video.video_url, '_blank')}
                  >
                    <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="bg-[#111111] border-0">
        <CardHeader className="p-3 sm:p-4 md:p-6">
          <CardTitle className="text-white text-base sm:text-lg">Video Statistics</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div className="text-center bg-[#1a1a1a] p-3 sm:p-4 rounded-lg">
              <div className="text-xl sm:text-2xl font-bold text-rosegold">
                {videos.length}
              </div>
              <div className="text-white/60 text-xs sm:text-sm mt-1">Total Videos</div>
            </div>
            <div className="text-center bg-[#1a1a1a] p-3 sm:p-4 rounded-lg">
              <div className="text-xl sm:text-2xl font-bold text-green-500">
                {videos.filter(v => v.ai_analysis_status === 'completed').length}
              </div>
              <div className="text-white/60 text-xs sm:text-sm mt-1">Analyzed</div>
            </div>
            <div className="text-center bg-[#1a1a1a] p-3 sm:p-4 rounded-lg">
              <div className="text-xl sm:text-2xl font-bold text-yellow-500">
                {videos.filter(v => v.ai_analysis_status === 'analyzing').length}
              </div>
              <div className="text-white/60 text-xs sm:text-sm mt-1">Processing</div>
            </div>
            <div className="text-center bg-[#1a1a1a] p-3 sm:p-4 rounded-lg">
              <div className="text-xl sm:text-2xl font-bold text-blue-500">
                {videos.filter(v => v.video_type === 'match').length}
              </div>
              <div className="text-white/60 text-xs sm:text-sm mt-1">Match Videos</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VideoManagement;
