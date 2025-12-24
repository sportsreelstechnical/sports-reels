import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, 
  Maximize2, Minimize2, List, Video, Calendar, Clock, Trophy
} from "lucide-react";
import type { Video as VideoType } from "@shared/schema";

interface ContinuousVideoPlayerProps {
  videos: VideoType[];
  title?: string;
  autoPlay?: boolean;
}

export default function ContinuousVideoPlayer({ 
  videos, 
  title = "Video Reel",
  autoPlay = true 
}: ContinuousVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const playableVideos = videos.filter(v => v.fileUrl);
  const currentVideo = playableVideos[currentIndex];

  const playNext = useCallback(() => {
    if (playableVideos.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % playableVideos.length);
  }, [playableVideos.length]);

  const playPrevious = useCallback(() => {
    if (playableVideos.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + playableVideos.length) % playableVideos.length);
  }, [playableVideos.length]);

  const togglePlay = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  const selectVideo = useCallback((index: number) => {
    setCurrentIndex(index);
    setIsPlaying(true);
  }, []);

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setProgress(videoRef.current.currentTime);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  }, []);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current || duration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;
    videoRef.current.currentTime = newTime;
    setProgress(newTime);
  }, [duration]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (videoRef.current && isPlaying) {
      videoRef.current.play().catch(() => {
        setIsPlaying(false);
      });
    }
  }, [currentIndex, isPlaying]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (playableVideos.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Video className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-lg font-medium text-muted-foreground">No Videos Available</p>
          <p className="text-sm text-muted-foreground mt-2">
            Upload videos with media files to watch them here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div ref={containerRef} className={`${isFullscreen ? 'fixed inset-0 z-50 bg-black' : ''}`}>
      <div className={`grid ${showPlaylist && !isFullscreen ? 'lg:grid-cols-3' : ''} gap-4`}>
        <div className={`${showPlaylist && !isFullscreen ? 'lg:col-span-2' : ''}`}>
          <Card className="overflow-visible">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Play className="h-5 w-5 text-primary" />
                  {title}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {currentIndex + 1} / {playableVideos.length}
                  </Badge>
                  {!isFullscreen && (
                    <Button 
                      size="icon" 
                      variant="ghost"
                      onClick={() => setShowPlaylist(!showPlaylist)}
                      data-testid="button-toggle-playlist"
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative aspect-video bg-black rounded-md overflow-hidden">
                <video
                  ref={videoRef}
                  src={currentVideo?.fileUrl || ""}
                  className="w-full h-full object-contain"
                  onEnded={playNext}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  muted={isMuted}
                  playsInline
                  data-testid="continuous-video-element"
                />
                
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                  <div className="space-y-2">
                    <div 
                      className="h-1 bg-white/30 rounded-full cursor-pointer"
                      onClick={handleSeek}
                      data-testid="video-progress-bar"
                    >
                      <div 
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${duration > 0 ? (progress / duration) * 100 : 0}%` }}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="text-white"
                          onClick={playPrevious}
                          data-testid="button-previous"
                        >
                          <SkipBack className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="text-white"
                          onClick={togglePlay}
                          data-testid="button-play-pause"
                        >
                          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="text-white"
                          onClick={playNext}
                          data-testid="button-next"
                        >
                          <SkipForward className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="text-white"
                          onClick={toggleMute}
                          data-testid="button-mute"
                        >
                          {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                        </Button>
                        <span className="text-white text-xs ml-2">
                          {formatTime(progress)} / {formatTime(duration)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm font-medium truncate max-w-[200px]">
                          {currentVideo?.title}
                        </span>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="text-white"
                          onClick={toggleFullscreen}
                          data-testid="button-fullscreen"
                        >
                          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {currentVideo && (
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  {currentVideo.matchDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {currentVideo.matchDate}
                    </span>
                  )}
                  {currentVideo.competition && (
                    <span className="flex items-center gap-1">
                      <Trophy className="h-3 w-3" />
                      {currentVideo.competition}
                    </span>
                  )}
                  {currentVideo.duration && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {currentVideo.duration}
                    </span>
                  )}
                  {currentVideo.source && (
                    <Badge variant="outline">{currentVideo.source}</Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {showPlaylist && !isFullscreen && (
          <div className="lg:col-span-1">
            <Card className="h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <List className="h-4 w-4" />
                  Playlist
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[400px]">
                  <div className="p-4 space-y-2">
                    {playableVideos.map((video, index) => (
                      <div
                        key={video.id}
                        className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${
                          index === currentIndex 
                            ? 'bg-primary/10 border border-primary/20' 
                            : 'hover-elevate'
                        }`}
                        onClick={() => selectVideo(index)}
                        data-testid={`playlist-item-${video.id}`}
                      >
                        <div className="relative w-16 h-10 bg-muted rounded shrink-0 flex items-center justify-center">
                          <Video className="h-4 w-4 text-muted-foreground" />
                          {index === currentIndex && isPlaying && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded">
                              <Play className="h-4 w-4 text-white animate-pulse" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${
                            index === currentIndex ? 'text-primary' : ''
                          }`}>
                            {video.title}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {video.competition || video.source || "Video"}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {index + 1}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
