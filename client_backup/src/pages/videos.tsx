import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import VideoUpload from "@/components/VideoUpload";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/LoadingScreen";
import { 
  Search, Video, Play, Calendar, FileText, Link2, Sparkles, BarChart2, 
  Activity, TrendingUp, UserPlus, Users, Clock, Trash2, Target, Award,
  Edit2, Eye, UsersRound, X
} from "lucide-react";
import type { Video as VideoType, VideoInsights, Player, VideoPlayerTag } from "@shared/schema";

interface VideoWithInsights extends VideoType {
  insights?: VideoInsights;
}

const POSITIONS = [
  "Goalkeeper",
  "Center Back",
  "Right Back",
  "Left Back",
  "Defensive Midfielder",
  "Central Midfielder",
  "Attacking Midfielder",
  "Right Winger",
  "Left Winger",
  "Striker",
  "Forward",
];

export default function Videos() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [selectedVideo, setSelectedVideo] = useState<VideoWithInsights | null>(null);
  const [isAnalysisDialogOpen, setIsAnalysisDialogOpen] = useState(false);
  const [isTagPlayerDialogOpen, setIsTagPlayerDialogOpen] = useState(false);
  const [isVideoPlayerOpen, setIsVideoPlayerOpen] = useState(false);
  const [isTeamSheetOpen, setIsTeamSheetOpen] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [tagMinutes, setTagMinutes] = useState("90");
  const [tagPosition, setTagPosition] = useState("");
  const [teamSheetPlayers, setTeamSheetPlayers] = useState<string[]>([]);
  const [teamSheetDefaultMinutes, setTeamSheetDefaultMinutes] = useState("90");
  const { toast } = useToast();

  const { data: videos = [], isLoading } = useQuery<VideoWithInsights[]>({
    queryKey: ["/api/videos"],
  });

  const { data: players = [] } = useQuery<Player[]>({
    queryKey: ["/api/players"],
  });

  const { data: playerTags = [], refetch: refetchTags } = useQuery<VideoPlayerTag[]>({
    queryKey: ["/api/videos", selectedVideo?.id, "player-tags"],
    enabled: !!selectedVideo?.id,
    queryFn: async () => {
      if (!selectedVideo?.id) return [];
      const res = await fetch(`/api/videos/${selectedVideo.id}/player-tags`);
      return res.json();
    },
  });

  const analyzeVideoMutation = useMutation({
    mutationFn: async (videoId: string) => {
      const response = await apiRequest("POST", `/api/videos/${videoId}/analyze`, {});
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.needsTokens ? `Insufficient tokens. ${data.error}` : data.error);
      }
      return data;
    },
    onSuccess: (data: any) => {
      toast({
        title: "Analysis Complete",
        description: "AI has analyzed the video and generated performance insights. 8 tokens spent.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tokens/balance"] });
      setSelectedVideo(prev => prev ? { ...prev, insights: data.insights } : null);
    },
    onError: (error: any) => {
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze video",
        variant: "destructive",
      });
    },
  });

  const uploadVideoMutation = useMutation({
    mutationFn: async (videoData: {
      title: string;
      matchDate?: string;
      source: string;
      playerId: string;
      competition?: string;
      opponent?: string;
      duration?: string;
      minutesPlayed?: number;
      fileUrl?: string;
    }) => {
      const response = await apiRequest("POST", "/api/videos", videoData);
      return await response.json();
    },
    onSuccess: (newVideo: VideoType) => {
      toast({
        title: "Video Saved",
        description: "Video has been saved to the database. You can now tag players.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to save video",
        variant: "destructive",
      });
    },
  });

  const tagPlayerMutation = useMutation({
    mutationFn: async ({ videoId, playerId, minutesPlayed, position }: { 
      videoId: string; 
      playerId: string; 
      minutesPlayed: number;
      position: string;
    }) => {
      const response = await apiRequest("POST", `/api/videos/${videoId}/player-tags`, {
        playerId,
        minutesPlayed,
        position,
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Player Tagged",
        description: "Player has been tagged to this video with their minutes played.",
      });
      refetchTags();
      setSelectedPlayerId("");
      setTagMinutes("90");
      setTagPosition("");
    },
    onError: (error: any) => {
      toast({
        title: "Tagging Failed",
        description: error.message || "Failed to tag player",
        variant: "destructive",
      });
    },
  });

  const analyzePlayerTagMutation = useMutation({
    mutationFn: async (tagId: string) => {
      const response = await apiRequest("POST", `/api/video-player-tags/${tagId}/analyze`, {});
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Player Analysis Complete",
        description: "AI has analyzed this player's performance based on their position.",
      });
      refetchTags();
    },
    onError: (error: any) => {
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze player",
        variant: "destructive",
      });
    },
  });

  const deleteTagMutation = useMutation({
    mutationFn: async (tagId: string) => {
      await apiRequest("DELETE", `/api/video-player-tags/${tagId}`, {});
    },
    onSuccess: () => {
      toast({
        title: "Tag Removed",
        description: "Player tag has been removed from this video.",
      });
      refetchTags();
    },
  });

  const batchTagPlayersMutation = useMutation({
    mutationFn: async ({ videoId, playerIds, defaultMinutes }: { 
      videoId: string; 
      playerIds: string[]; 
      defaultMinutes: number;
    }) => {
      const results = [];
      for (const playerId of playerIds) {
        const player = players.find(p => p.id === playerId);
        const response = await apiRequest("POST", `/api/videos/${videoId}/player-tags`, {
          playerId,
          minutesPlayed: defaultMinutes,
          position: player?.position || "",
        });
        results.push(await response.json());
      }
      return results;
    },
    onSuccess: (data) => {
      toast({
        title: "Team Sheet Applied",
        description: `${data.length} players have been tagged to this video.`,
      });
      refetchTags();
      setIsTeamSheetOpen(false);
      setTeamSheetPlayers([]);
    },
    onError: (error: any) => {
      toast({
        title: "Batch Tagging Failed",
        description: error.message || "Failed to apply team sheet",
        variant: "destructive",
      });
    },
  });

  const filteredVideos = videos.filter((v) => {
    const matchesSearch = v.title?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSource = sourceFilter === "all" || v.source === sourceFilter;
    return matchesSearch && matchesSource;
  });

  const sourceColors: Record<string, string> = {
    manual: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
    wyscout: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    transfermarkt: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    veo: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  };

  const handleAnalyzeVideo = (video: VideoWithInsights) => {
    setSelectedVideo(video);
    setIsAnalysisDialogOpen(true);
    if (!video.insights) {
      analyzeVideoMutation.mutate(video.id);
    }
  };

  const handleOpenTagDialog = (video: VideoWithInsights) => {
    setSelectedVideo(video);
    setIsTagPlayerDialogOpen(true);
  };

  const handleTagPlayer = () => {
    if (!selectedVideo || !selectedPlayerId) return;
    tagPlayerMutation.mutate({
      videoId: selectedVideo.id,
      playerId: selectedPlayerId,
      minutesPlayed: parseInt(tagMinutes) || 90,
      position: tagPosition,
    });
  };

  const handleOpenVideoPlayer = (video: VideoWithInsights) => {
    setSelectedVideo(video);
    setIsVideoPlayerOpen(true);
  };

  const handleOpenTeamSheet = (video: VideoWithInsights) => {
    setSelectedVideo(video);
    setTeamSheetPlayers([]);
    setIsTeamSheetOpen(true);
  };

  const handleToggleTeamSheetPlayer = (playerId: string) => {
    const alreadyTagged = playerTags.some(tag => tag.playerId === playerId);
    if (alreadyTagged) return;
    
    setTeamSheetPlayers(prev => 
      prev.includes(playerId) 
        ? prev.filter(id => id !== playerId)
        : prev.length < 15 - playerTags.length 
          ? [...prev, playerId]
          : prev
    );
  };

  const handleApplyTeamSheet = () => {
    if (!selectedVideo || teamSheetPlayers.length === 0) return;
    batchTagPlayersMutation.mutate({
      videoId: selectedVideo.id,
      playerIds: teamSheetPlayers,
      defaultMinutes: parseInt(teamSheetDefaultMinutes) || 90,
    });
  };

  const getPlayerName = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    return player ? `${player.firstName} ${player.lastName}` : "Unknown Player";
  };

  const getPlayerPosition = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    return player?.position || "Unknown";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="page-videos">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Video Management</h1>
          <p className="text-muted-foreground">Upload videos, tag players, and analyze positional performance</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <VideoUpload
            players={players}
            onUpload={(data) => uploadVideoMutation.mutate(data)}
            onIntegrationConnect={(source) => {
              toast({
                title: "Integration",
                description: `Connect to ${source} coming soon!`,
              });
            }}
            isUploading={uploadVideoMutation.isPending}
          />
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Multi-Player Tagging
              </CardTitle>
              <CardDescription className="text-sm">
                Tag multiple players per video
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <UserPlus className="h-4 w-4 text-muted-foreground mt-0.5" />
                <p className="text-muted-foreground">Tag registered players to each video</p>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                <p className="text-muted-foreground">Track minutes played per player</p>
              </div>
              <div className="flex items-start gap-2">
                <Target className="h-4 w-4 text-muted-foreground mt-0.5" />
                <p className="text-muted-foreground">Position-specific AI analysis</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Positional Analysis
              </CardTitle>
              <CardDescription className="text-sm">
                AI metrics based on playing position
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <BarChart2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                <p className="text-muted-foreground">Goalkeeper: saves, distribution, clean sheets</p>
              </div>
              <div className="flex items-start gap-2">
                <Activity className="h-4 w-4 text-muted-foreground mt-0.5" />
                <p className="text-muted-foreground">Defenders: tackles, interceptions, duels</p>
              </div>
              <div className="flex items-start gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground mt-0.5" />
                <p className="text-muted-foreground">Forwards: shots, goals, xG metrics</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <CardTitle className="text-lg">Video Library</CardTitle>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search videos..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 w-48"
                      data-testid="input-search-videos"
                    />
                  </div>
                  <Select value={sourceFilter} onValueChange={setSourceFilter}>
                    <SelectTrigger className="w-36" data-testid="select-source-filter">
                      <SelectValue placeholder="Source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sources</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="wyscout">Wyscout</SelectItem>
                      <SelectItem value="transfermarkt">Transfermarkt</SelectItem>
                      <SelectItem value="veo">Veo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredVideos.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No videos found</p>
                  <p className="text-sm mt-1">Upload videos to tag players and analyze performance</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredVideos.map((video) => (
                    <div
                      key={video.id}
                      className="flex items-start gap-4 p-4 bg-muted/50 rounded-md hover-elevate"
                      data-testid={`video-card-${video.id}`}
                    >
                      <div 
                        className="relative bg-muted rounded-md w-32 h-20 flex items-center justify-center shrink-0 cursor-pointer"
                        onClick={() => handleOpenVideoPlayer(video)}
                      >
                        <Video className="h-8 w-8 text-muted-foreground" />
                        <Button
                          size="icon"
                          variant="secondary"
                          className="absolute inset-0 m-auto w-10 h-10 rounded-full opacity-80"
                          data-testid={`button-play-${video.id}`}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <h3 className="font-medium truncate">{video.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              {video.competition || "Match footage"} {video.opponent && `vs ${video.opponent}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {video.insights && (
                              <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                                <Sparkles className="h-3 w-3 mr-1" />
                                Analyzed
                              </Badge>
                            )}
                            <Badge variant="secondary" className={sourceColors[video.source || "manual"]}>
                              <Link2 className="h-3 w-3 mr-1" />
                              {video.source || "manual"}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {video.uploadDate ? new Date(video.uploadDate).toLocaleDateString() : "Unknown date"}
                          </span>
                          <span>{video.duration || "Unknown duration"}</span>
                          {video.minutesPlayed && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {video.minutesPlayed} min
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 pt-1">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleOpenVideoPlayer(video)}
                            data-testid={`button-watch-${video.id}`}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Watch
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleOpenTagDialog(video)}
                            data-testid={`button-tag-players-${video.id}`}
                          >
                            <Users className="h-3 w-3 mr-1" />
                            Tag Players
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleOpenTeamSheet(video)}
                            data-testid={`button-team-sheet-${video.id}`}
                          >
                            <UsersRound className="h-3 w-3 mr-1" />
                            Team Sheet
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleAnalyzeVideo(video)}
                            data-testid={`button-analyze-${video.id}`}
                          >
                            <Sparkles className="h-3 w-3 mr-1" />
                            {video.insights ? "View Analysis" : "Analyze"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isTagPlayerDialogOpen} onOpenChange={setIsTagPlayerDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Tag Players to Video
            </DialogTitle>
            <DialogDescription className="flex items-center justify-between">
              <span>{selectedVideo?.title || "Select players who appear in this video"}</span>
              <Badge variant={playerTags.length >= 15 ? "destructive" : "secondary"}>
                {playerTags.length}/15 players
              </Badge>
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="tag" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="tag" data-testid="tab-tag-player">Tag New Player</TabsTrigger>
              <TabsTrigger value="tagged" data-testid="tab-tagged-players">Tagged Players ({playerTags.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="tag" className="space-y-4 mt-4">
              {playerTags.length >= 15 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 text-destructive opacity-50" />
                  <p className="font-medium text-destructive">Maximum players reached</p>
                  <p className="text-sm mt-1">You can tag up to 15 players per video</p>
                </div>
              ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Player</Label>
                  <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
                    <SelectTrigger data-testid="select-player">
                      <SelectValue placeholder="Choose a player to tag" />
                    </SelectTrigger>
                    <SelectContent>
                      {players
                        .filter(player => !playerTags.some(tag => tag.playerId === player.id))
                        .map((player) => (
                        <SelectItem key={player.id} value={player.id}>
                          {player.firstName} {player.lastName} - {player.position}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Minutes Played</Label>
                    <Input
                      type="number"
                      min="0"
                      max="120"
                      value={tagMinutes}
                      onChange={(e) => setTagMinutes(e.target.value)}
                      placeholder="90"
                      data-testid="input-minutes-played"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Position in Match</Label>
                    <Select value={tagPosition} onValueChange={setTagPosition}>
                      <SelectTrigger data-testid="select-position">
                        <SelectValue placeholder="Select position" />
                      </SelectTrigger>
                      <SelectContent>
                        {POSITIONS.map((pos) => (
                          <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button 
                  onClick={handleTagPlayer} 
                  disabled={!selectedPlayerId || tagPlayerMutation.isPending}
                  className="w-full"
                  data-testid="button-confirm-tag"
                >
                  {tagPlayerMutation.isPending ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span className="ml-2">Tagging...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Tag Player to Video
                    </>
                  )}
                </Button>
              </div>
              )}
            </TabsContent>

            <TabsContent value="tagged" className="mt-4">
              <ScrollArea className="h-[400px]">
                {playerTags.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No players tagged yet</p>
                    <p className="text-sm mt-1">Tag players to analyze their performance</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {playerTags.map((tag) => (
                      <Card key={tag.id} className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{getPlayerName(tag.playerId)}</h4>
                              <Badge variant="outline">{tag.position || getPlayerPosition(tag.playerId)}</Badge>
                              {tag.analyzed && (
                                <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                                  <Sparkles className="h-3 w-3 mr-1" />
                                  Analyzed
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {tag.minutesPlayed || 0} minutes
                              </span>
                              {tag.performanceRating && (
                                <span className="flex items-center gap-1">
                                  <Award className="h-3 w-3" />
                                  Rating: {tag.performanceRating.toFixed(1)}/10
                                </span>
                              )}
                              {tag.goals !== null && tag.goals > 0 && (
                                <span>Goals: {tag.goals}</span>
                              )}
                              {tag.assists !== null && tag.assists > 0 && (
                                <span>Assists: {tag.assists}</span>
                              )}
                            </div>
                            {tag.aiAnalysis && (
                              <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded-md mt-2">
                                {tag.aiAnalysis}
                              </p>
                            )}
                            {(() => {
                              const moments = tag.keyMoments as Array<{minute: number; type: string; description: string}> | null;
                              if (!moments || !Array.isArray(moments) || moments.length === 0) return null;
                              return (
                                <div className="mt-3 space-y-2">
                                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Key Moments</p>
                                  <div className="flex flex-wrap gap-2">
                                    {moments.slice(0, 5).map((moment, idx) => (
                                      <Badge 
                                        key={idx} 
                                        variant="outline" 
                                        className="text-xs"
                                      >
                                        <Clock className="h-3 w-3 mr-1" />
                                        {String(moment.minute)}&apos; - {String(moment.type).replace(/_/g, ' ')}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              );
                            })()}
                            {(() => {
                              const strengths = tag.strengths as string[] | null;
                              if (!strengths || !Array.isArray(strengths) || strengths.length === 0) return null;
                              return (
                                <div className="mt-2">
                                  <p className="text-xs font-medium text-green-600 dark:text-green-400">Strengths: {strengths.slice(0, 3).join(', ')}</p>
                                </div>
                              );
                            })()}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => analyzePlayerTagMutation.mutate(tag.id)}
                              disabled={analyzePlayerTagMutation.isPending}
                              data-testid={`button-analyze-tag-${tag.id}`}
                            >
                              {analyzePlayerTagMutation.isPending ? (
                                <LoadingSpinner size="sm" />
                              ) : (
                                <>
                                  <Sparkles className="h-3 w-3 mr-1" />
                                  {tag.analyzed ? "Re-analyze" : "Analyze"}
                                </>
                              )}
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => deleteTagMutation.mutate(tag.id)}
                              data-testid={`button-delete-tag-${tag.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTagPlayerDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAnalysisDialogOpen} onOpenChange={setIsAnalysisDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Video Analysis
            </DialogTitle>
            <DialogDescription>
              {selectedVideo?.title || "Video analysis results"}
            </DialogDescription>
          </DialogHeader>
          
          {analyzeVideoMutation.isPending ? (
            <div className="py-12 text-center">
              <LoadingSpinner size="lg" />
              <p className="mt-4 text-muted-foreground">Analyzing video with AI...</p>
              <p className="text-sm text-muted-foreground">This may take a few moments</p>
            </div>
          ) : selectedVideo?.insights ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 rounded-md bg-muted/50 text-center">
                  <p className="text-2xl font-bold">{selectedVideo.insights.minutesPlayed}</p>
                  <p className="text-xs text-muted-foreground">Minutes Played</p>
                </div>
                <div className="p-3 rounded-md bg-muted/50 text-center">
                  <p className="text-2xl font-bold">{selectedVideo.insights.distanceCovered?.toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground">Distance (km)</p>
                </div>
                <div className="p-3 rounded-md bg-muted/50 text-center">
                  <p className="text-2xl font-bold">{selectedVideo.insights.sprintCount}</p>
                  <p className="text-xs text-muted-foreground">Sprints</p>
                </div>
                <div className="p-3 rounded-md bg-muted/50 text-center">
                  <p className="text-2xl font-bold">
                    {selectedVideo.insights.passesCompleted}/{selectedVideo.insights.passesAttempted}
                  </p>
                  <p className="text-xs text-muted-foreground">Pass Accuracy</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 rounded-md bg-muted/50 text-center">
                  <p className="text-xl font-bold">{selectedVideo.insights.shotsOnTarget}</p>
                  <p className="text-xs text-muted-foreground">Shots on Target</p>
                </div>
                <div className="p-3 rounded-md bg-muted/50 text-center">
                  <p className="text-xl font-bold">{selectedVideo.insights.tackles}</p>
                  <p className="text-xs text-muted-foreground">Tackles</p>
                </div>
                <div className="p-3 rounded-md bg-muted/50 text-center">
                  <p className="text-xl font-bold">{selectedVideo.insights.duelsWon}</p>
                  <p className="text-xs text-muted-foreground">Duels Won</p>
                </div>
              </div>

              {selectedVideo.insights.aiAnalysis && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      AI Summary
                    </h4>
                    <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                      {selectedVideo.insights.aiAnalysis}
                    </p>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <p>Click analyze to generate AI insights</p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAnalysisDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isVideoPlayerOpen} onOpenChange={setIsVideoPlayerOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Play className="h-5 w-5 text-primary" />
                Video Player
              </DialogTitle>
              <DialogDescription>
                {selectedVideo?.title}
              </DialogDescription>
            </div>
            <Button 
              size="icon" 
              variant="ghost" 
              onClick={() => setIsVideoPlayerOpen(false)}
              data-testid="button-exit-video-player"
            >
              <X className="h-5 w-5" />
            </Button>
          </DialogHeader>
          
          <ScrollArea className="max-h-[calc(90vh-140px)]">
            <div className="space-y-4 pr-4">
              <div className="aspect-video bg-muted rounded-md flex items-center justify-center">
                {selectedVideo?.fileUrl ? (
                  <video 
                    controls 
                    autoPlay
                    className="w-full h-full rounded-md"
                    src={selectedVideo.fileUrl}
                    data-testid="video-player"
                  >
                    Your browser does not support the video tag.
                  </video>
                ) : (
                  <div className="text-center text-muted-foreground">
                    <Video className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">Video Preview</p>
                    <p className="text-sm">No video file uploaded yet</p>
                    <p className="text-xs mt-2">Video URL would appear here once uploaded</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div className="p-3 bg-muted/50 rounded-md">
                  <p className="text-muted-foreground text-xs">Competition</p>
                  <p className="font-medium">{selectedVideo?.competition || "N/A"}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-md">
                  <p className="text-muted-foreground text-xs">Opponent</p>
                  <p className="font-medium">{selectedVideo?.opponent || "N/A"}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-md">
                  <p className="text-muted-foreground text-xs">Duration</p>
                  <p className="font-medium">{selectedVideo?.duration || "N/A"}</p>
                </div>
              </div>

              {selectedVideo && (
                <div className="flex flex-wrap gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsVideoPlayerOpen(false);
                      handleOpenTagDialog(selectedVideo);
                    }}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Tag Players
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsVideoPlayerOpen(false);
                      handleAnalyzeVideo(selectedVideo);
                    }}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Analyze Video
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="default" onClick={() => setIsVideoPlayerOpen(false)} data-testid="button-close-video-player">
              <X className="h-4 w-4 mr-2" />
              Exit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isTeamSheetOpen} onOpenChange={setIsTeamSheetOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UsersRound className="h-5 w-5 text-primary" />
              Attach Team Sheet
            </DialogTitle>
            <DialogDescription asChild>
              <div className="flex items-center justify-between">
                <span>Select multiple players to tag at once: {selectedVideo?.title}</span>
                <Badge variant={teamSheetPlayers.length + playerTags.length >= 15 ? "destructive" : "secondary"}>
                  {teamSheetPlayers.length} selected ({playerTags.length + teamSheetPlayers.length}/15 total)
                </Badge>
              </div>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Default Minutes Played</Label>
              <Input
                type="number"
                min="0"
                max="120"
                value={teamSheetDefaultMinutes}
                onChange={(e) => setTeamSheetDefaultMinutes(e.target.value)}
                placeholder="90"
                className="w-32"
                data-testid="input-team-sheet-minutes"
              />
              <p className="text-xs text-muted-foreground">
                All selected players will be tagged with this minutes value
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Select Players</Label>
              <ScrollArea className="h-[300px] border rounded-md p-2">
                <div className="space-y-2">
                  {players.map((player) => {
                    const isAlreadyTagged = playerTags.some(tag => tag.playerId === player.id);
                    const isSelected = teamSheetPlayers.includes(player.id);
                    
                    return (
                      <div 
                        key={player.id}
                        className={`flex items-center gap-3 p-2 rounded-md ${
                          isAlreadyTagged 
                            ? "bg-muted/50 opacity-50" 
                            : isSelected 
                              ? "bg-primary/10 border border-primary/30" 
                              : "hover-elevate"
                        }`}
                        data-testid={`team-sheet-player-${player.id}`}
                      >
                        <Checkbox
                          checked={isSelected || isAlreadyTagged}
                          disabled={isAlreadyTagged}
                          onCheckedChange={() => handleToggleTeamSheetPlayer(player.id)}
                          data-testid={`checkbox-player-${player.id}`}
                        />
                        <div className="flex-1">
                          <p className="font-medium text-sm">
                            {player.firstName} {player.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">{player.position}</p>
                        </div>
                        {isAlreadyTagged && (
                          <Badge variant="secondary" className="text-xs">Already Tagged</Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsTeamSheetOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleApplyTeamSheet}
              disabled={teamSheetPlayers.length === 0 || batchTagPlayersMutation.isPending}
              data-testid="button-apply-team-sheet"
            >
              {batchTagPlayersMutation.isPending ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">Tagging Players...</span>
                </>
              ) : (
                <>
                  <UsersRound className="h-4 w-4 mr-2" />
                  Tag {teamSheetPlayers.length} Players
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
