import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import {
  Plus,
  Search,
  Filter,
  Grid3X3,
  List,
  Play,
  Clock,
  Calendar,
  Users,
  BarChart3,
  Tags,
  Eye,
  Trash2,
  Edit3,
  Download,
  Share2,
  Zap,
  TrendingUp,
  Target,
  Award,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SmartThumbnail } from './SmartThumbnail';
import EnhancedVideoUploadForm from './EnhancedVideoUploadForm';
import { usePlayersData } from '@/domains/players/hooks/usePlayersData';
import PlayerTagDisplay from './PlayerTagDisplay';

interface Video {
  id: string;
  title: string;
  video_url: string;
  thumbnail_url?: string;
  duration: number;
  video_type: 'match' | 'training' | 'interview' | 'highlight';
  description?: string;
  tags: string[];
  ai_analysis_status: 'pending' | 'analyzing' | 'completed' | 'failed';
  created_at: string;
  opposing_team?: string;
  match_date?: string;
  score?: string;
  league_competition?: string;
}

interface Team {
  id: string;
  team_name: string;
  profile_id: string;
}

interface TeamPlayer {
  id: string;
  full_name: string;
  position: string;
  jersey_number?: number;
}

type ViewMode = 'grid' | 'list';
type SortOption = 'newest' | 'oldest' | 'title_asc' | 'title_desc' | 'duration_asc' | 'duration_desc';

const EnhancedVideoManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [videos, setVideos] = useState<Video[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<Video[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [currentTeamId, setCurrentTeamId] = useState<string>('');
  const [teamPlayers, setTeamPlayers] = useState<TeamPlayer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [deleteConfirmVideo, setDeleteConfirmVideo] = useState<Video | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showTaggedPlayersModal, setShowTaggedPlayersModal] = useState(false);
  const [selectedVideoForPlayers, setSelectedVideoForPlayers] = useState<Video | null>(null);

  // Edit form state
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    video_type: 'match' as 'match' | 'training' | 'interview' | 'highlight',
    playerTags: [] as string[],
    matchDetails: {
      opposingTeam: '',
      matchDate: '',
      league: '',
      homeOrAway: 'home' as 'home' | 'away',
      homeScore: '',
      awayScore: '',
      venue: ''
    }
  });

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedPlayer, setSelectedPlayer] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Get unique players from all video tags
  const allPlayers = Array.from(new Set(videos.flatMap(video => video.tags || [])));

  // Fetch player data for all tagged players
  const { players: allPlayersData, loading: playersLoading } = usePlayersData(allPlayers);

  // Helper function to get player data for a specific video
  const getPlayersForVideo = (videoTags: string[]) => {
    return allPlayersData.filter(player => videoTags.includes(player.id));
  };

  useEffect(() => {
    fetchUserTeams();
  }, []);

  useEffect(() => {
    if (currentTeamId) {
      fetchVideos();
      fetchTeamPlayers();
    }
  }, [currentTeamId]);

  useEffect(() => {
    applyFilters();
    setCurrentPage(1); // Reset to first page when filters change
  }, [videos, searchTerm, selectedType, selectedPlayer, sortBy]);

  const fetchUserTeams = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return;

      const { data: teamsData, error } = await supabase
        .from('teams')
        .select('id, team_name, profile_id')
        .eq('profile_id', profile.id);

      if (error) throw error;

      setTeams(teamsData || []);
      if (teamsData && teamsData.length > 0) {
        setCurrentTeamId(teamsData[0].id);
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
      toast({
        title: "Error",
        description: "Failed to load teams",
        variant: "destructive"
      });
    }
  };

  const fetchVideos = async () => {
    if (!currentTeamId) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('team_id', currentTeamId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mappedVideos: Video[] = (data || []).map(video => ({
        id: video.id,
        title: video.title,
        video_url: video.video_url,
        thumbnail_url: video.thumbnail_url,
        duration: video.duration,
        video_type: video.video_type as 'match' | 'training' | 'interview' | 'highlight',
        description: video.description,
        tags: Array.isArray(video.tagged_players)
          ? video.tagged_players.map((tag: any) => String(tag))
          : [],
        ai_analysis_status: (video.ai_analysis_status === 'pending' ||
          video.ai_analysis_status === 'analyzing' ||
          video.ai_analysis_status === 'completed' ||
          video.ai_analysis_status === 'failed')
          ? video.ai_analysis_status
          : 'pending',
        created_at: video.created_at,
        opposing_team: video.opposing_team,
        match_date: video.match_date,
        score: video.score_display || undefined,
        league_competition: video.league || undefined
      }));

      setVideos(mappedVideos);
    } catch (error) {
      console.error('Error fetching videos:', error);
      toast({
        title: "Error",
        description: "Failed to load videos",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTeamPlayers = async () => {
    if (!currentTeamId) return;

    try {
      const { data, error } = await supabase
        .from('players')
        .select('id, full_name, position, jersey_number')
        .eq('team_id', currentTeamId)
        .order('full_name');

      if (error) throw error;
      setTeamPlayers(data || []);
    } catch (error) {
      console.error('Error fetching team players:', error);
      toast({
        title: "Error",
        description: "Failed to load team players",
        variant: "destructive"
      });
    }
  };

  const applyFilters = () => {
    let filtered = [...videos];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(video =>
        video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        video.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        video.opposing_team?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Type filter
    if (selectedType !== 'all') {
      filtered = filtered.filter(video => video.video_type === selectedType);
    }


    // Player filter
    if (selectedPlayer !== 'all') {
      filtered = filtered.filter(video => video.tags.includes(selectedPlayer));
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'title_asc':
          return a.title.localeCompare(b.title);
        case 'title_desc':
          return b.title.localeCompare(a.title);
        case 'duration_asc':
          return a.duration - b.duration;
        case 'duration_desc':
          return b.duration - a.duration;
        default:
          return 0;
      }
    });

    setFilteredVideos(filtered);
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredVideos.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedVideos = filteredVideos.slice(startIndex, endIndex);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleVideoClick = (video: Video) => {
    navigate(`/videos/${encodeURIComponent(video.title)}`);
  };

  const handleUploadComplete = () => {
    setShowUploadForm(false);
    fetchVideos();
    toast({
      title: "Success",
      description: "Video uploaded successfully!",
    });
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };


  const isLocalhostUrl = (url: string) => {
    return url.includes('localhost') || url.includes('127.0.0.1') || url.includes('::1');
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'match': return <Target className="w-4 h-4" />;
      case 'training': return <TrendingUp className="w-4 h-4" />;
      case 'interview': return <Users className="w-4 h-4" />;
      case 'highlight': return <Award className="w-4 h-4" />;
      default: return <Play className="w-4 h-4" />;
    }
  };

  const handleEditVideo = (video: Video) => {
    setEditingVideo(video);

    // Parse score if it exists (format: "homeScore-awayScore")
    const scoreParts = video.score?.split('-') || ['', ''];

    setEditForm({
      title: video.title,
      description: video.description || '',
      video_type: video.video_type,
      playerTags: [...video.tags],
      matchDetails: {
        opposingTeam: video.opposing_team || '',
        matchDate: video.match_date || '',
        league: video.league_competition || '',
        homeOrAway: 'home', // Default value, could be enhanced to detect from data
        homeScore: scoreParts[0] || '',
        awayScore: scoreParts[1] || '',
        venue: '' // Not stored in current video structure
      }
    });
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!deleteConfirmVideo) return;

    try {
      setIsDeleting(true);
      const { error } = await supabase
        .from('videos')
        .delete()
        .eq('id', videoId);

      if (error) throw error;

      // Remove video from state
      setVideos(prev => prev.filter(v => v.id !== videoId));
      setDeleteConfirmVideo(null);

      toast({
        title: "Success",
        description: "Video deleted successfully!",
      });
    } catch (error) {
      console.error('Error deleting video:', error);
      toast({
        title: "Error",
        description: "Failed to delete video",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdateVideo = async () => {
    if (!editingVideo) return;

    try {
      setIsUpdating(true);
      const { error } = await supabase
        .from('videos')
        .update({
          title: editForm.title,
          description: editForm.description,
          video_type: editForm.video_type,
          tagged_players: editForm.playerTags,
          opposing_team: editForm.matchDetails.opposingTeam || null,
          match_date: editForm.matchDetails.matchDate || null,
          score_display: editForm.matchDetails.homeScore && editForm.matchDetails.awayScore
            ? `${editForm.matchDetails.homeScore}-${editForm.matchDetails.awayScore}`
            : null,
          league: editForm.matchDetails.league || null
        })
        .eq('id', editingVideo.id);

      if (error) throw error;

      // Update video in state
      setVideos(prev => prev.map(v =>
        v.id === editingVideo.id
          ? {
            ...v,
            title: editForm.title,
            description: editForm.description,
            video_type: editForm.video_type,
            tags: editForm.playerTags,
            opposing_team: editForm.matchDetails.opposingTeam,
            match_date: editForm.matchDetails.matchDate,
            score: editForm.matchDetails.homeScore && editForm.matchDetails.awayScore
              ? `${editForm.matchDetails.homeScore}-${editForm.matchDetails.awayScore}`
              : undefined,
            league_competition: editForm.matchDetails.league
          }
          : v
      ));

      setEditingVideo(null);

      toast({
        title: "Success",
        description: "Video updated successfully!",
      });
    } catch (error) {
      console.error('Error updating video:', error);
      toast({
        title: "Error",
        description: "Failed to update video",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };


  if (showUploadForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-polysans text-white">Upload New Video</h2>
          <Button
            onClick={() => setShowUploadForm(false)}
            variant="outline"
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            Cancel
          </Button>
        </div>
        <EnhancedVideoUploadForm
          teamId={currentTeamId}
          onUploadComplete={() => handleUploadComplete()}
          onCancel={() => setShowUploadForm(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-polysans text-white">Video Management</h2>
        <Button
          onClick={() => setShowUploadForm(true)}
          className="bg-bright-pink hover:bg-bright-pink/90 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Upload Video
        </Button>
      </div>

      <Tabs defaultValue="videos" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-[#111111] border-0 gap-1 p-1 h-auto">
          <TabsTrigger 
            value="videos" 
            className="data-[state=active]:bg-rosegold data-[state=active]:text-white text-white/60 border-0 flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm px-2 py-2.5 sm:py-3 min-h-[44px]"
          >
            <Play className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="hidden sm:inline">Videos</span>
          </TabsTrigger>
          <TabsTrigger 
            value="analytics" 
            className="data-[state=active]:bg-rosegold data-[state=active]:text-white text-white/60 border-0 flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm px-2 py-2.5 sm:py-3 min-h-[44px]"
          >
            <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
          <TabsTrigger 
            value="tags" 
            className="data-[state=active]:bg-rosegold data-[state=active]:text-white text-white/60 border-0 flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm px-2 py-2.5 sm:py-3 min-h-[44px]"
          >
            <Tags className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="hidden sm:inline">Tags & Labels</span>
            <span className="sm:hidden">Tags</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="videos" className="space-y-4 sm:space-y-6">
          <Card className="bg-[#111111] border-0">
            <CardContent className="p-3 sm:p-4 md:p-6">
              <div className="flex flex-col gap-3 sm:gap-4">
                {/* Search */}
                <div className="relative w-full">
                  <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-white/60 w-3 h-3 sm:w-4 sm:h-4" />
                  <Input
                    placeholder="Search videos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 sm:pl-10 bg-[#1a1a1a] border-0 text-white h-9 sm:h-10 text-xs sm:text-sm"
                  />
                </div>

                {/* Filters Row */}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center justify-between">
                  <div className="flex flex-col sm:flex-row gap-2 flex-1">
                    <Select value={selectedType} onValueChange={setSelectedType}>
                      <SelectTrigger className="w-full sm:w-32 bg-[#1a1a1a] border-0 text-white h-9 sm:h-10 text-xs sm:text-sm">
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#111111] border-0">
                        <SelectItem value="all" className="text-white text-xs sm:text-sm">All Types</SelectItem>
                        <SelectItem value="match" className="text-white text-xs sm:text-sm">Match</SelectItem>
                        <SelectItem value="training" className="text-white text-xs sm:text-sm">Training</SelectItem>
                        <SelectItem value="interview" className="text-white text-xs sm:text-sm">Interview</SelectItem>
                        <SelectItem value="highlight" className="text-white text-xs sm:text-sm">Highlight</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                      <SelectTrigger className="w-full sm:w-36 bg-[#1a1a1a] border-0 text-white h-9 sm:h-10 text-xs sm:text-sm">
                        <SelectValue placeholder="All Players" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#111111] border-0">
                        <SelectItem value="all" className="text-white text-xs sm:text-sm">All Players</SelectItem>
                        {allPlayersData.map((player) => (
                          <SelectItem key={player.id} value={player.id} className="text-white text-xs sm:text-sm">
                            <div className="flex items-center gap-2">
                              <span>{player.full_name || player.id}</span>
                              {player.jersey_number && (
                                <Badge className="bg-rosegold text-white text-[10px] px-1.5 py-0.5 font-bold border-0">
                                  #{player.jersey_number}
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                      <SelectTrigger className="w-full sm:w-36 bg-[#1a1a1a] border-0 text-white h-9 sm:h-10 text-xs sm:text-sm">
                        <SelectValue placeholder="Newest First" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#111111] border-0">
                        <SelectItem value="newest" className="text-white text-xs sm:text-sm">Newest First</SelectItem>
                        <SelectItem value="oldest" className="text-white text-xs sm:text-sm">Oldest First</SelectItem>
                        <SelectItem value="title_asc" className="text-white text-xs sm:text-sm">Title A-Z</SelectItem>
                        <SelectItem value="title_desc" className="text-white text-xs sm:text-sm">Title Z-A</SelectItem>
                        <SelectItem value="duration_asc" className="text-white text-xs sm:text-sm">Shortest First</SelectItem>
                        <SelectItem value="duration_desc" className="text-white text-xs sm:text-sm">Longest First</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* View Mode Toggle */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => setViewMode('grid')}
                      className={`flex-1 sm:flex-initial h-9 sm:h-10 border-0 ${viewMode === 'grid' ? 'bg-rosegold text-white' : 'bg-[#1a1a1a] text-white/60'}`}
                    >
                      <Grid3X3 className="w-3 h-3 sm:w-4 sm:h-4" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setViewMode('list')}
                      className={`flex-1 sm:flex-initial h-9 sm:h-10 border-0 ${viewMode === 'list' ? 'bg-rosegold text-white' : 'bg-[#1a1a1a] text-white/60'}`}
                    >
                      <List className="w-3 h-3 sm:w-4 sm:h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {isLoading ? (
            <div className="flex items-center justify-center py-8 sm:py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-rosegold mx-auto mb-3 sm:mb-4"></div>
                <p className="text-white/60 text-xs sm:text-sm">Loading videos...</p>
              </div>
            </div>
          ) : filteredVideos.length === 0 ? (
            <Card className="bg-[#111111] border-0">
              <CardContent className="py-8 sm:py-12 text-center p-4 sm:p-6">
                <Play className="w-10 h-10 sm:w-12 sm:h-12 text-white/40 mx-auto mb-3 sm:mb-4" />
                <h3 className="text-base sm:text-lg font-semibold text-white mb-2">No Videos Found</h3>
                <p className="text-white/60 text-xs sm:text-sm mb-3 sm:mb-4">
                  {videos.length === 0
                    ? "Upload your first video to get started"
                    : "Try adjusting your filters to see more videos"
                  }
                </p>
                {videos.length === 0 && (
                  <Button
                    onClick={() => setShowUploadForm(true)}
                    className="bg-rosegold text-white border-0 h-9 sm:h-10 text-xs sm:text-sm"
                  >
                    <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                    Upload Video
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              <div className={viewMode === 'grid'
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6"
                : "space-y-3 sm:space-y-4"
              }>
                {paginatedVideos.map((video) => (
                  <Card
                    key={video.id}
                    className="bg-[#111111] border-0 cursor-pointer"
                    onClick={() => handleVideoClick(video)}
                  >
                    {viewMode === 'grid' ? (
                      <CardContent className="p-0">
                        <div className="relative aspect-video bg-[#1a1a1a] rounded-t-lg overflow-hidden">
                          <SmartThumbnail
                            thumbnailUrl={video.thumbnail_url}
                            title={video.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute bottom-1.5 sm:bottom-2 right-1.5 sm:right-2 bg-black/70 text-white px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs">
                            {formatDuration(video.duration)}
                          </div>
                          <div className="absolute top-1.5 sm:top-2 left-1.5 sm:left-2 flex flex-col gap-1">
                            {isLocalhostUrl(video.video_url) && (
                              <Badge className="bg-red-900/20 text-red-400 border-0 text-[10px] sm:text-xs px-1.5">
                                Invalid URL
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="p-3 sm:p-4">
                          <div className="flex items-start justify-between mb-2 gap-2">
                            <h3 className="font-semibold text-white text-xs sm:text-sm line-clamp-2 flex-1 leading-tight">{video.title}</h3>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditVideo(video);
                                }}
                                className="h-6 w-6 sm:h-7 sm:w-7 p-0 text-white/60 border-0"
                              >
                                <Edit3 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteConfirmVideo(video);
                                }}
                                className="h-6 w-6 sm:h-7 sm:w-7 p-0 text-red-400 border-0"
                              >
                                <Trash2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                              </Button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[10px] sm:text-xs text-white/60 mb-2 sm:mb-3">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
                              <span className="truncate">{formatDate(video.created_at)}</span>
                            </span>
                            <span className="capitalize flex-shrink-0">{video.video_type}</span>
                          </div>

                          <div className="w-full text-xs">
                            {video.tags.length > 0 ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedVideoForPlayers(video);
                                  setShowTaggedPlayersModal(true);
                                }}
                                className="w-full bg-[#1a1a1a] text-white/60 border-0 h-8 sm:h-9 text-[10px] sm:text-xs"
                              >
                                <Users className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1.5 sm:mr-2" />
                                <span className="hidden sm:inline">Tagged Players ({video.tags.length})</span>
                                <span className="sm:hidden">Players ({video.tags.length})</span>
                              </Button>
                            ) : (
                              <div className="flex items-center justify-center gap-1.5 sm:gap-2 py-2 text-white/40 text-[10px] sm:text-xs">
                                <Users className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                <span>No Tagged Players</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    ) : (
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
                          <div className="relative w-20 h-14 sm:w-24 sm:h-16 bg-[#1a1a1a] rounded overflow-hidden flex-shrink-0">
                            <SmartThumbnail
                              thumbnailUrl={video.thumbnail_url}
                              title={video.title}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute bottom-0 right-0 bg-black/70 text-white px-1 text-[10px] sm:text-xs">
                              {formatDuration(video.duration)}
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-1 gap-2">
                              <h3 className="font-semibold text-white text-xs sm:text-sm truncate flex-1">{video.title}</h3>
                              <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                                {getTypeIcon(video.video_type)}
                                {isLocalhostUrl(video.video_url) && (
                                  <Badge className="bg-red-900/20 text-red-400 border-0 text-[10px] sm:text-xs px-1.5">
                                    Invalid URL
                                  </Badge>
                                )}
                                <div className="flex items-center gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditVideo(video);
                                    }}
                                    className="h-6 w-6 sm:h-7 sm:w-7 p-0 text-white/60 border-0"
                                  >
                                    <Edit3 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeleteConfirmVideo(video);
                                    }}
                                    className="h-6 w-6 sm:h-7 sm:w-7 p-0 text-red-400 border-0"
                                  >
                                    <Trash2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 md:gap-4 text-[10px] sm:text-xs text-white/60">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
                                <span className="truncate">{formatDate(video.created_at)}</span>
                              </span>
                              <span className="capitalize">{video.video_type}</span>
                              {video.opposing_team && (
                                <span className="truncate">vs {video.opposing_team}</span>
                              )}
                              {video.tags.length > 0 ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedVideoForPlayers(video);
                                    setShowTaggedPlayersModal(true);
                                  }}
                                  className="h-6 sm:h-7 bg-[#1a1a1a] text-white/60 border-0 text-[10px] sm:text-xs px-2"
                                >
                                  <Users className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1" />
                                  {video.tags.length} Player{video.tags.length !== 1 ? 's' : ''}
                                </Button>
                              ) : (
                                <span className="flex items-center gap-1 text-white/40">
                                  <Users className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                  <span className="hidden sm:inline">No Tagged Players</span>
                                  <span className="sm:hidden">No Players</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <Card className="bg-[#111111] border-0">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="text-xs sm:text-sm text-white/60 text-center sm:text-left">
                        Showing {startIndex + 1}-{Math.min(endIndex, filteredVideos.length)} of {filteredVideos.length} videos
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="bg-[#1a1a1a] text-white/60 border-0 disabled:opacity-50 disabled:cursor-not-allowed h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm"
                        >
                          <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span className="hidden sm:inline">Previous</span>
                          <span className="sm:hidden">Prev</span>
                        </Button>

                        <div className="flex items-center gap-1">
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                            // Show first page, last page, current page, and pages around current
                            const showPage =
                              page === 1 ||
                              page === totalPages ||
                              (page >= currentPage - 1 && page <= currentPage + 1);

                            const showEllipsis =
                              (page === currentPage - 2 && currentPage > 3) ||
                              (page === currentPage + 2 && currentPage < totalPages - 2);

                            if (showEllipsis) {
                              return (
                                <span key={page} className="text-white/60 px-1 sm:px-2 text-xs sm:text-sm">
                                  ...
                                </span>
                              );
                            }

                            if (!showPage) return null;

                            return (
                              <Button
                                key={page}
                                size="sm"
                                onClick={() => handlePageChange(page)}
                                className={`border-0 w-8 h-8 sm:w-9 sm:h-9 p-0 text-xs sm:text-sm ${
                                  currentPage === page
                                    ? "bg-rosegold text-white"
                                    : "bg-[#1a1a1a] text-white/60"
                                }`}
                              >
                                {page}
                              </Button>
                            );
                          })}
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className="bg-[#1a1a1a] text-white/60 border-0 disabled:opacity-50 disabled:cursor-not-allowed h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm"
                        >
                          <span className="hidden sm:inline">Next</span>
                          <span className="sm:hidden">Next</span>
                          <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4 sm:space-y-6">
          <Card className="bg-[#111111] border-0">
            <CardHeader className="p-3 sm:p-4 md:p-6">
              <CardTitle className="text-white flex items-center gap-2 text-base sm:text-lg">
                <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
                Video Analytics
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                <div className="bg-[#1a1a1a] p-4 sm:p-6 rounded-lg text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-rosegold">{videos.length}</div>
                  <div className="text-white/60 text-xs sm:text-sm mt-1 sm:mt-2">Total Videos</div>
                </div>
                <div className="bg-[#1a1a1a] p-4 sm:p-6 rounded-lg text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-green-400">
                    {videos.filter(v => v.ai_analysis_status === 'completed').length}
                  </div>
                  <div className="text-white/60 text-xs sm:text-sm mt-1 sm:mt-2">Analyzed</div>
                </div>
                <div className="bg-[#1a1a1a] p-4 sm:p-6 rounded-lg text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-blue-400">
                    {Math.round(videos.reduce((acc, v) => acc + v.duration, 0) / 60)}
                  </div>
                  <div className="text-white/60 text-xs sm:text-sm mt-1 sm:mt-2">Total Minutes</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tags" className="space-y-4 sm:space-y-6">
          <Card className="bg-[#111111] border-0">
            <CardHeader className="p-3 sm:p-4 md:p-6">
              <CardTitle className="text-white flex items-center gap-2 text-base sm:text-lg">
                <Tags className="w-4 h-4 sm:w-5 sm:h-5" />
                Player Tags
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
              {playersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-rosegold"></div>
                  <span className="ml-3 text-white/60 text-xs sm:text-sm">Loading players...</span>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {allPlayersData.map((player) => {
                    const videoCount = videos.filter(v => v.tags.includes(player.id)).length;
                    return (
                      <div key={player.id} className="flex items-center justify-between p-3 sm:p-4 bg-[#1a1a1a] rounded-lg gap-3">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#111111] flex items-center justify-center flex-shrink-0">
                            {player.headshot_url || player.photo_url ? (
                              <img
                                src={player.headshot_url || player.photo_url || ''}
                                alt={player.full_name || 'Player'}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              <span className="text-white font-semibold text-xs sm:text-sm">
                                {player.full_name?.slice(0, 2).toUpperCase() || '??'}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-0.5 sm:mb-1 flex-wrap">
                              <h4 className="text-white font-medium text-xs sm:text-sm truncate">{player.full_name || 'Unknown Player'}</h4>
                              {player.jersey_number && (
                                <Badge className="bg-rosegold text-white text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 font-bold border-0 flex-shrink-0">
                                  #{player.jersey_number}
                                </Badge>
                              )}
                            </div>
                            <p className="text-white/60 text-[10px] sm:text-xs truncate">{player.position || 'Unknown Position'}</p>
                          </div>
                        </div>
                        <Badge className="bg-rosegold/20 text-rosegold border-0 text-[10px] sm:text-xs px-2 sm:px-3 py-1 flex-shrink-0">
                          {videoCount} video{videoCount !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                    );
                  })}
                  {allPlayersData.length === 0 && (
                    <div className="text-center py-8 sm:py-12">
                      <Tags className="w-10 h-10 sm:w-12 sm:h-12 text-white/40 mx-auto mb-3" />
                      <p className="text-white/60 text-xs sm:text-sm">No players tagged in any videos</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Video Dialog */}
      <Dialog open={!!editingVideo} onOpenChange={() => setEditingVideo(null)}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Video</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-title" className="text-white">Title *</Label>
                <Input
                  id="edit-title"
                  value={editForm.title}
                  onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="Enter video title"
                />
              </div>

              <div>
                <Label htmlFor="edit-description" className="text-white">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editForm.description}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  className="bg-gray-700 border-gray-600 text-white"
                  rows={3}
                  placeholder="Enter video description"
                />
              </div>

              <div>
                <Label htmlFor="edit-type" className="text-white">Video Type *</Label>
                <Select
                  value={editForm.video_type}
                  onValueChange={(value) => setEditForm(prev => ({ ...prev, video_type: value as any }))}
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="match">Match</SelectItem>
                    <SelectItem value="training">Training</SelectItem>
                    <SelectItem value="interview">Interview</SelectItem>
                    <SelectItem value="highlight">Highlight</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Player Tags */}
            <div>
              <Label className="text-white">Tag Players</Label>
              <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto bg-gray-700/50 rounded-lg p-3">
                {teamPlayers.map((player) => (
                  <div key={player.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`edit-player-${player.id}`}
                      checked={editForm.playerTags.includes(player.id)}
                      onCheckedChange={(checked) => {
                        const newTags = checked
                          ? [...editForm.playerTags, player.id]
                          : editForm.playerTags.filter(id => id !== player.id);
                        setEditForm(prev => ({ ...prev, playerTags: newTags }));
                      }}
                    />
                    <label
                      htmlFor={`edit-player-${player.id}`}
                      className="text-sm text-white cursor-pointer"
                    >
                      {player.full_name} ({player.position})
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Match Details (if video type is match) */}
            {editForm.video_type === 'match' && (
              <div className="space-y-3">
                <Label className="text-white">Match Details</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="edit-opposing-team" className="text-white text-sm">Opposing Team *</Label>
                    <Input
                      id="edit-opposing-team"
                      value={editForm.matchDetails.opposingTeam}
                      onChange={(e) => setEditForm(prev => ({
                        ...prev,
                        matchDetails: { ...prev.matchDetails, opposingTeam: e.target.value }
                      }))}
                      className="bg-gray-700 border-gray-600 text-white"
                      placeholder="Team name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-match-date" className="text-white text-sm">Match Date *</Label>
                    <Input
                      id="edit-match-date"
                      type="date"
                      value={editForm.matchDetails.matchDate}
                      onChange={(e) => setEditForm(prev => ({
                        ...prev,
                        matchDetails: { ...prev.matchDetails, matchDate: e.target.value }
                      }))}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-league" className="text-white text-sm">League *</Label>
                    <Input
                      id="edit-league"
                      value={editForm.matchDetails.league}
                      onChange={(e) => setEditForm(prev => ({
                        ...prev,
                        matchDetails: { ...prev.matchDetails, league: e.target.value }
                      }))}
                      className="bg-gray-700 border-gray-600 text-white"
                      placeholder="League name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-home-away" className="text-white text-sm">Home/Away</Label>
                    <Select
                      value={editForm.matchDetails.homeOrAway}
                      onValueChange={(value) => setEditForm(prev => ({
                        ...prev,
                        matchDetails: { ...prev.matchDetails, homeOrAway: value as 'home' | 'away' }
                      }))}
                    >
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="home">Home</SelectItem>
                        <SelectItem value="away">Away</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="edit-home-score" className="text-white text-sm">Home Score *</Label>
                    <Input
                      id="edit-home-score"
                      type="number"
                      min="0"
                      value={editForm.matchDetails.homeScore}
                      onChange={(e) => setEditForm(prev => ({
                        ...prev,
                        matchDetails: { ...prev.matchDetails, homeScore: e.target.value }
                      }))}
                      className="bg-gray-700 border-gray-600 text-white"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-away-score" className="text-white text-sm">Away Score *</Label>
                    <Input
                      id="edit-away-score"
                      type="number"
                      min="0"
                      value={editForm.matchDetails.awayScore}
                      onChange={(e) => setEditForm(prev => ({
                        ...prev,
                        matchDetails: { ...prev.matchDetails, awayScore: e.target.value }
                      }))}
                      className="bg-gray-700 border-gray-600 text-white"
                      placeholder="0"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="edit-venue" className="text-white text-sm">Venue</Label>
                    <Input
                      id="edit-venue"
                      value={editForm.matchDetails.venue}
                      onChange={(e) => setEditForm(prev => ({
                        ...prev,
                        matchDetails: { ...prev.matchDetails, venue: e.target.value }
                      }))}
                      className="bg-gray-700 border-gray-600 text-white"
                      placeholder="Stadium name"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingVideo(null)}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateVideo}
              disabled={isUpdating || !editForm.title.trim()}
              className="bg-bright-pink hover:bg-bright-pink/90 text-white"
            >
              {isUpdating ? "Updating..." : "Update Video"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmVideo} onOpenChange={() => setDeleteConfirmVideo(null)}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Delete Video</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <p className="text-gray-300">
              Are you sure you want to delete "{deleteConfirmVideo?.title}"? This action cannot be undone.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmVideo(null)}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              onClick={() => deleteConfirmVideo && handleDeleteVideo(deleteConfirmVideo.id)}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? "Deleting..." : "Delete Video"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tagged Players Modal */}
      <Dialog open={showTaggedPlayersModal} onOpenChange={setShowTaggedPlayersModal}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-bright-pink" />
              Tagged Players
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            {selectedVideoForPlayers && selectedVideoForPlayers.tags.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {playersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-bright-pink"></div>
                    <span className="ml-3 text-gray-400">Loading players...</span>
                  </div>
                ) : (
                  getPlayersForVideo(selectedVideoForPlayers.tags).map((player) => (
                    <div
                      key={player.id}
                      className="flex items-center gap-3 p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors"
                    >
                      <div className="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {player.headshot_url || player.photo_url ? (
                          <img
                            src={player.headshot_url || player.photo_url || ''}
                            alt={player.full_name || 'Player'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-white font-semibold text-lg">
                            {player.full_name?.slice(0, 2).toUpperCase() || '??'}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-white font-medium truncate">
                            {player.full_name || 'Unknown Player'}
                          </h4>
                          {player.jersey_number && (
                            <Badge className="bg-bright-pink text-white text-xs px-2 py-0.5 font-bold flex-shrink-0">
                              #{player.jersey_number}
                            </Badge>
                          )}
                        </div>
                        <p className="text-gray-400 text-sm truncate">
                          {player.position || 'Unknown Position'}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-400">No players tagged in this video</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              onClick={() => {
                setShowTaggedPlayersModal(false);
                setSelectedVideoForPlayers(null);
              }}
              className="bg-bright-pink hover:bg-bright-pink/90 text-white w-full"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EnhancedVideoManagement;
