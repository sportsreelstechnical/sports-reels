import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Volume, VolumeOff, Fullscreen, SkipBack, SkipForward, Activity, TrendingUp, Target, Zap, Brain, BarChart3 } from 'lucide-react';
import { VideoAnalysisService, AIAnalysisEvent } from '@/domains/video/services/videoAnalysisService';
import { SmartVideoPlayer } from './SmartVideoPlayer';

interface VideoPlayerProps {
  videoUrl: string;
  title: string;
  videoId: string;
  metadata: {
    playerTags: string[];
    matchDetails: {
      homeTeam: string;
      awayTeam: string;
      league: string;
      finalScore: string;
    };
    duration: number;
    videoTitle?: string;
    videoDescription?: string;
  };
  onPlayerTagClick?: (playerName: string) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoUrl,
  title,
  videoId,
  metadata,
  onPlayerTagClick
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const analysisServiceRef = useRef<VideoAnalysisService | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisEvents, setAnalysisEvents] = useState<AIAnalysisEvent[]>([]);
  const [currentAnalysis, setCurrentAnalysis] = useState<string>('');
  const [realtimeInsights, setRealtimeInsights] = useState<string[]>([]);

  useEffect(() => {
    // Initialize analysis service
    analysisServiceRef.current = new VideoAnalysisService(videoId);

    // Load existing analysis
    loadExistingAnalysis();

    return () => {
      if (analysisServiceRef.current) {
        analysisServiceRef.current.stopAnalysis();
      }
    };
  }, [videoId]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => {
      setCurrentTime(video.currentTime);
      updateCurrentAnalysis(video.currentTime);
    };
    const updateDuration = () => setDuration(video.duration);

    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('loadedmetadata', updateDuration);

    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('loadedmetadata', updateDuration);
    };
  }, [analysisEvents]);

  const loadExistingAnalysis = async () => {
    if (analysisServiceRef.current) {
      const events = await analysisServiceRef.current.getAnalysisForVideo();
      setAnalysisEvents(events);
    }
  };

  const updateCurrentAnalysis = (time: number) => {
    const currentEvent = analysisEvents.find(
      event => Math.abs(event.timestamp - time) < 5
    );

    if (currentEvent) {
      setCurrentAnalysis(currentEvent.description);
      setRealtimeInsights([currentEvent.description]);
    }
  };

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (isPlaying) {
        video.pause();
        if (analysisServiceRef.current) {
          analysisServiceRef.current.stopAnalysis();
        }
        setIsAnalyzing(false);
      } else {
        // Add better error handling for video play
        await video.play();
        startAnalysis();
      }
      setIsPlaying(!isPlaying);
    } catch (error) {
      console.log('Video play error:', error);
      // Try to handle the background media pause issue
      if (error instanceof Error && error.name === 'AbortError') {
        // Retry play after a short delay
        setTimeout(async () => {
          try {
            if (video && !video.paused) {
              await video.play();
              setIsPlaying(true);
            }
          } catch (retryError) {
            console.log('Video retry play error:', retryError);
          }
        }, 100);
      }
    }
  };

  const startAnalysis = async () => {
    const video = videoRef.current;
    if (!video || !analysisServiceRef.current) return;

    setIsAnalyzing(true);

    try {
      await analysisServiceRef.current.startRealTimeAnalysis(video, metadata);

      // Periodically reload analysis events
      const refreshInterval = setInterval(async () => {
        if (analysisServiceRef.current) {
          const events = await analysisServiceRef.current.getAnalysisForVideo();
          setAnalysisEvents(events);
        }
      }, 10000); // Refresh every 10 seconds

      // Clean up interval when video stops
      video.addEventListener('ended', () => {
        clearInterval(refreshInterval);
        setIsAnalyzing(false);
      });
    } catch (error) {
      console.error('Error starting analysis:', error);
      setIsAnalyzing(false);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const newTime = parseFloat(e.target.value);
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const newVolume = parseFloat(e.target.value);
    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isMuted) {
      video.volume = volume;
      setIsMuted(false);
    } else {
      video.volume = 0;
      setIsMuted(true);
    }
  };

  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      video.requestFullscreen();
    }
  };

  const skip = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = Math.max(0, Math.min(duration, currentTime + seconds));
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Video Player - Takes 3 columns */}
        <div className="lg:col-span-3">
          <Card className="bg-gray-900 border-rosegold/20 overflow-hidden">
            <CardContent className="p-0">
              <div className="relative aspect-video bg-black">
                <video
                  ref={videoRef}
                  src={videoUrl}
                  className="w-full h-full object-contain"
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  preload="metadata"
                  playsInline
                  controls={false}
                  muted={false}
                />
              </div>

              {/* Custom Controls */}
              <div className="p-4 bg-gray-800 border-t border-rosegold/20">
                {/* Progress Bar */}
                <div className="mb-4">
                  <input
                    type="range"
                    min="0"
                    max={duration || 100}
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Control Buttons */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => skip(-10)}
                      className="text-white hover:text-rosegold hover:bg-rosegold/10"
                    >
                      <SkipBack className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={togglePlay}
                      className="bg-rosegold hover:bg-rosegold/90 text-black"
                    >
                      {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => skip(10)}
                      className="text-white hover:text-rosegold hover:bg-rosegold/10"
                    >
                      <SkipForward className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={toggleMute}
                      className="text-white hover:text-rosegold hover:bg-rosegold/10"
                    >
                      {isMuted ? <VolumeOff className="w-4 h-4" /> : <Volume className="w-4 h-4" />}
                    </Button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="w-16 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={toggleFullscreen}
                      className="text-white hover:text-rosegold hover:bg-rosegold/10"
                    >
                      <Fullscreen className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Video Info */}
          <Card className="bg-gray-800 border-rosegold/20 mt-4">
            <CardContent className="p-4">
              <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="text-gray-400">Match: <span className="text-white">{metadata.matchDetails.homeTeam} vs {metadata.matchDetails.awayTeam}</span></p>
                  <p className="text-gray-400">League: <span className="text-white">{metadata.matchDetails.league}</span></p>
                </div>
                <div className="space-y-1">
                  <p className="text-gray-400">Score: <span className="text-rosegold font-bold">{metadata.matchDetails.finalScore}</span></p>
                  <div className="flex flex-wrap gap-1">
                    {metadata.playerTags.map((player, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="cursor-pointer border-rosegold text-rosegold hover:bg-rosegold hover:text-black text-xs"
                        onClick={() => onPlayerTagClick && onPlayerTagClick(player)}
                      >
                        {player}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Real-time AI Analysis Panel - Takes 1 column */}
        <div className="lg:col-span-1">
          <Card className="bg-white border-rosegold/30 sticky top-4">
            <div className="bg-gradient-to-r from-rosegold to-yellow-500 p-3">
              <h3 className="font-bold text-black flex items-center gap-2">
                <Brain className="w-5 h-5" />
                Real-time AI Analysis
              </h3>
            </div>

            <CardContent className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
              {/* Analysis Status */}
              <div className="flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-rosegold/10 to-yellow-500/10 rounded-lg border border-rosegold/20">
                <div className={`w-2 h-2 rounded-full ${isAnalyzing ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                <span className="text-sm font-medium text-black">
                  {isAnalyzing ? 'Analyzing in real-time...' : isPlaying ? 'Analysis ready' : 'Press play to start analysis'}
                </span>
              </div>

              {/* Current Analysis */}
              {currentAnalysis && (
                <div className="bg-gradient-to-r from-rosegold/10 to-yellow-500/10 rounded-lg p-3 border border-rosegold/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-4 h-4 text-rosegold" />
                    <span className="font-semibold text-black">Current Insight</span>
                  </div>
                  <p className="text-sm text-gray-800 leading-relaxed">{currentAnalysis}</p>
                </div>
              )}

              {/* Analysis Timeline */}
              {analysisEvents.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-rosegold" />
                    <span className="font-semibold text-black">Analysis Timeline</span>
                  </div>

                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {analysisEvents
                      .sort((a, b) => b.timestamp - a.timestamp)
                      .map((event, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-3 border-l-2 border-rosegold">
                          <div className="flex items-center justify-between mb-2">
                            <Badge
                              variant="outline"
                              className="text-xs border-rosegold text-rosegold"
                            >
                              {formatTime(event.timestamp)}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {Math.round(event.confidenceScore * 100)}% confidence
                            </span>
                          </div>
                          <p className="text-xs text-gray-800 leading-relaxed mb-2">
                            {event.description}
                          </p>
                          {event.taggedPlayers && event.taggedPlayers.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {event.taggedPlayers.map((player, pidx) => (
                                <Badge
                                  key={pidx}
                                  variant="secondary"
                                  className="text-xs cursor-pointer hover:bg-rosegold hover:text-white"
                                  onClick={() => onPlayerTagClick && onPlayerTagClick(player)}
                                >
                                  {player}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* No Analysis Yet */}
              {!isAnalyzing && analysisEvents.length === 0 && (
                <div className="text-center py-8">
                  <Zap className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-sm text-gray-600 mb-3">
                    AI analysis will start when you play the video
                  </p>
                  <p className="text-xs text-gray-500">
                    Our AI will analyze player movements, tactical patterns, and key moments in real-time
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
