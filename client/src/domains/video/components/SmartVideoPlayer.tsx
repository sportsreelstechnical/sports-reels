import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Loader2 } from 'lucide-react';
import { useMediaUrls } from '@/hooks/useMediaUrls';

interface SmartVideoPlayerProps {
    videoUrl?: string;
    thumbnailUrl?: string;
    title: string;
    duration?: number;
    className?: string;
    autoPlay?: boolean;
    controls?: boolean;
    onTimeUpdate?: (time: number) => void;
}

export interface SmartVideoPlayerRef {
    currentTime: number;
    play: () => void;
    pause: () => void;
    seekTo: (time: number) => void;
}

export const SmartVideoPlayer = forwardRef<SmartVideoPlayerRef, SmartVideoPlayerProps>(({
    videoUrl,
    thumbnailUrl,
    title,
    duration,
    className = "",
    autoPlay = false,
    controls = true,
    onTimeUpdate
}, ref) => {
    const [isR2Key, setIsR2Key] = useState(false);
    const [isSupabaseUrl, setIsSupabaseUrl] = useState(false);
    const [isPublicUrl, setIsPublicUrl] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    // Expose video methods via ref
    useImperativeHandle(ref, () => ({
        get currentTime() {
            return videoRef.current?.currentTime || 0;
        },
        play: () => {
            videoRef.current?.play();
            setIsPlaying(true);
        },
        pause: () => {
            videoRef.current?.pause();
            setIsPlaying(false);
        },
        seekTo: (time: number) => {
            if (videoRef.current) {
                videoRef.current.currentTime = time;
            }
        }
    }));

    // Use the secure hook for R2 keys
    const { videoUrl: signedVideoUrl, thumbnailUrl: signedThumbnailUrl, loading, error } = useMediaUrls(
        isR2Key ? videoUrl : undefined,
        isR2Key ? thumbnailUrl : undefined,
        3600
    );

    useEffect(() => {
        if (!videoUrl) {
            setIsR2Key(false);
            setIsSupabaseUrl(false);
            setIsPublicUrl(false);
            return;
        }

        // Check if it's an R2 key (starts with sports-reels/)
        if (videoUrl.startsWith('sports-reels/')) {
            setIsR2Key(true);
            setIsSupabaseUrl(false);
            setIsPublicUrl(false);
        }
        // Check if it's a Supabase URL
        else if (videoUrl.includes('supabase') || videoUrl.includes('storage.googleapis.com')) {
            setIsR2Key(false);
            setIsSupabaseUrl(true);
            setIsPublicUrl(false);
        }
        // Check if it's a public R2 URL
        else if (videoUrl.includes('pub-') && videoUrl.includes('.r2.dev')) {
            setIsR2Key(false);
            setIsSupabaseUrl(false);
            setIsPublicUrl(true);
        }
        // Assume it's a direct URL (could be any other public URL)
        else {
            setIsR2Key(false);
            setIsSupabaseUrl(false);
            setIsPublicUrl(true);
        }
    }, [videoUrl]);

    const handlePlay = () => {
        setIsPlaying(true);
    };

    const formatDuration = (duration: number) => {
        const mins = Math.floor(duration / 60);
        const secs = Math.floor(duration % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // No video provided
    if (!videoUrl) {
        return (
            <div className={`relative bg-gray-800 rounded-lg overflow-hidden ${className}`}>
                <div className="aspect-video flex items-center justify-center">
                    <div className="text-center text-gray-400">
                        <Play className="w-12 h-12 mx-auto mb-2" />
                        <div className="text-sm">No video available</div>
                    </div>
                </div>
            </div>
        );
    }

    // R2 key - use signed URL
    if (isR2Key) {
        if (loading) {
            return (
                <div className={`relative bg-gray-800 rounded-lg overflow-hidden ${className}`}>
                    <div className="aspect-video flex items-center justify-center">
                        <div className="text-center text-gray-400">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                            <div className="text-sm">Loading video...</div>
                        </div>
                    </div>
                </div>
            );
        }

        if (error) {
            return (
                <div className={`relative bg-gray-800 rounded-lg overflow-hidden ${className}`}>
                    <div className="aspect-video flex items-center justify-center">
                        <div className="text-center text-red-400">
                            <div className="text-sm font-medium">Error Loading Video</div>
                            <div className="text-xs">{error}</div>
                        </div>
                    </div>
                </div>
            );
        }

        // Show video player with signed URL
        if (isPlaying && signedVideoUrl) {
            return (
                <div className={`relative bg-black rounded-lg overflow-hidden ${className}`}>
                    <div className="aspect-video">
                        <video
                            ref={videoRef}
                            src={signedVideoUrl}
                            controls={controls}
                            autoPlay={autoPlay}
                            className="w-full h-full object-cover"
                            onTimeUpdate={() => {
                                if (onTimeUpdate && videoRef.current) {
                                    onTimeUpdate(videoRef.current.currentTime);
                                }
                            }}
                            onError={() => {
                                console.error('Failed to play R2 video:', signedVideoUrl);
                                setIsPlaying(false);
                            }}
                        />
                    </div>
                </div>
            );
        }

        // Show thumbnail with play button
        return (
            <div className={`relative bg-black rounded-lg overflow-hidden group ${className}`}>
                <div className="aspect-video bg-gray-800 flex items-center justify-center relative">
                    {signedThumbnailUrl ? (
                        <img
                            src={signedThumbnailUrl}
                            alt={title}
                            className="w-full h-full object-cover"
                            onError={() => console.error('Failed to load R2 thumbnail:', signedThumbnailUrl)}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <Play className="w-12 h-12 text-gray-400" />
                        </div>
                    )}

                    {/* Play Button Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 group-hover:bg-opacity-50 transition-all">
                        <Button
                            onClick={handlePlay}
                            className="bg-bright-pink hover:bg-bright-pink/90 text-white p-4 rounded-full"
                        >
                            <Play className="w-8 h-8 ml-1" />
                        </Button>
                    </div>

                    {/* Duration Badge */}
                    {duration && duration > 0 && (
                        <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                            {formatDuration(duration)}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Supabase URL or public URL - use directly
    if (isSupabaseUrl || isPublicUrl) {
        if (isPlaying) {
            return (
                <div className={`relative bg-black rounded-lg overflow-hidden ${className}`}>
                    <div className="aspect-video">
                        <video
                            ref={videoRef}
                            src={videoUrl}
                            controls={controls}
                            autoPlay={autoPlay}
                            className="w-full h-full object-cover"
                            onTimeUpdate={() => {
                                if (onTimeUpdate && videoRef.current) {
                                    onTimeUpdate(videoRef.current.currentTime);
                                }
                            }}
                            onError={() => {
                                console.error('Failed to play public video:', videoUrl);
                                setIsPlaying(false);
                            }}
                        />
                    </div>
                </div>
            );
        }

        // Show thumbnail with play button
        return (
            <div className={`relative bg-black rounded-lg overflow-hidden group ${className}`}>
                <div className="aspect-video bg-gray-800 flex items-center justify-center relative">
                    {thumbnailUrl ? (
                        <img
                            src={thumbnailUrl}
                            alt={title}
                            className="w-full h-full object-cover"
                            onError={() => console.error('Failed to load thumbnail:', thumbnailUrl)}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <Play className="w-12 h-12 text-gray-400" />
                        </div>
                    )}

                    {/* Play Button Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 group-hover:bg-opacity-50 transition-all">
                        <Button
                            onClick={handlePlay}
                            className="bg-bright-pink hover:bg-bright-pink/90 text-white p-4 rounded-full"
                        >
                            <Play className="w-8 h-8 ml-1" />
                        </Button>
                    </div>

                    {/* Duration Badge */}
                    {duration && duration > 0 && (
                        <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                            {formatDuration(duration)}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Fallback
    return (
        <div className={`relative bg-gray-800 rounded-lg overflow-hidden ${className}`}>
            <div className="aspect-video flex items-center justify-center">
                <div className="text-center text-gray-400">
                    <Play className="w-12 h-12 mx-auto mb-2" />
                    <div className="text-sm">Unsupported video format</div>
                </div>
            </div>
        </div>
    );
});

SmartVideoPlayer.displayName = 'SmartVideoPlayer';

export default SmartVideoPlayer;
