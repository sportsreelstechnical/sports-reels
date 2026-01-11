
import React, { useState, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VideoThumbnailPlayerProps {
  videoUrl: string;
  thumbnailUrl?: string;
  title: string;
  duration?: number;
  className?: string;
}

export const VideoThumbnailPlayer: React.FC<VideoThumbnailPlayerProps> = ({
  videoUrl,
  thumbnailUrl,
  title,
  duration,
  className = ""
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handlePlayPause = async () => {
    if (!videoRef.current) return;

    try {
      setIsLoading(true);
      setError(null);

      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        await videoRef.current.play();
        setIsPlaying(true);
        setShowControls(true);
      }
    } catch (err) {
      console.error('Video playback error:', err);
      setError('Failed to load video. Please try again.');
      setIsPlaying(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVideoEnd = () => {
    setIsPlaying(false);
    setShowControls(false);
  };

  const handleVideoError = () => {
    setError('Video failed to load. Please check your connection and try again.');
    setIsLoading(false);
    setIsPlaying(false);
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoRef.current.requestFullscreen();
      }
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`relative bg-black rounded-lg overflow-hidden group ${className}`}>
      {/* Thumbnail or Video */}
      {!isPlaying && !error ? (
        <div className="relative">
          <img
            src={thumbnailUrl || '/placeholder.svg'}
            alt={title}
            className="w-full h-48 object-cover"
            onError={(e) => {
              e.currentTarget.src = '/placeholder.svg';
            }}
          />
          
          {/* Play Button Overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 group-hover:bg-opacity-50 transition-all">
            <Button
              onClick={handlePlayPause}
              disabled={isLoading}
              className="bg-bright-pink hover:bg-bright-pink/90 text-white p-4 rounded-full"
            >
              {isLoading ? (
                <Loader2 className="w-8 h-8 animate-spin" />
              ) : (
                <Play className="w-8 h-8 ml-1" />
              )}
            </Button>
          </div>

          {/* Duration Badge */}
          {duration && (
            <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
              {formatDuration(duration)}
            </div>
          )}
        </div>
      ) : error ? (
        <div className="w-full h-48 flex items-center justify-center bg-gray-800 text-white">
          <div className="text-center">
            <p className="text-red-400 mb-2">{error}</p>
            <Button
              onClick={() => {
                setError(null);
                handlePlayPause();
              }}
              variant="outline"
              className="text-white border-white hover:bg-white hover:text-black"
            >
              Retry
            </Button>
          </div>
        </div>
      ) : (
        <div className="relative">
          <video
            ref={videoRef}
            className="w-full h-48 object-cover"
            onEnded={handleVideoEnd}
            onError={handleVideoError}
            onLoadStart={() => setIsLoading(true)}
            onLoadedData={() => setIsLoading(false)}
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => setShowControls(false)}
            playsInline
          >
            <source src={videoUrl} type="video/mp4" />
            Your browser does not support the video tag.
          </video>

          {/* Video Controls */}
          {(showControls || isLoading) && (
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent">
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handlePlayPause}
                    disabled={isLoading}
                    size="sm"
                    className="bg-black bg-opacity-50 hover:bg-opacity-75 text-white p-2"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isPlaying ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </Button>

                  <Button
                    onClick={toggleMute}
                    size="sm"
                    className="bg-black bg-opacity-50 hover:bg-opacity-75 text-white p-2"
                  >
                    {isMuted ? (
                      <VolumeX className="w-4 h-4" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                <Button
                  onClick={toggleFullscreen}
                  size="sm"
                  className="bg-black bg-opacity-50 hover:bg-opacity-75 text-white p-2"
                >
                  <Maximize2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Video Title */}
      <div className="p-3">
        <h3 className="text-white font-medium truncate">{title}</h3>
      </div>
    </div>
  );
};
