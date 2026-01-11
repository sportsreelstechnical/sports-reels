import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Loader2 } from 'lucide-react';
import { useMediaUrls } from '@/hooks/useMediaUrls';

interface SecureVideoPlayerProps {
    videoKey: string;
    thumbnailKey?: string;
    title: string;
    duration?: number;
    className?: string;
}

export const SecureVideoPlayer: React.FC<SecureVideoPlayerProps> = ({
    videoKey,
    thumbnailKey,
    title,
    duration,
    className = ""
}) => {
    const { videoUrl, thumbnailUrl, loading, error } = useMediaUrls(videoKey, thumbnailKey, 3600);
    const [isPlaying, setIsPlaying] = useState(false);

    const handlePlay = () => {
        if (videoUrl) {
            setIsPlaying(true);
        }
    };

    const formatDuration = (duration: number) => {
        const mins = Math.floor(duration / 60);
        const secs = Math.floor(duration % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (error) {
        return (
            <div className={`relative bg-gray-800 rounded-lg overflow-hidden ${className}`}>
                <div className="aspect-video flex items-center justify-center">
                    <div className="text-center text-red-400">
                        <div className="font-medium">Error Loading Video</div>
                        <div className="text-sm">{error}</div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`relative bg-black rounded-lg overflow-hidden group ${className}`}>
            {/* Video Player */}
            {isPlaying && videoUrl ? (
                <div className="aspect-video">
                    <video
                        src={videoUrl}
                        controls
                        autoPlay
                        className="w-full h-full object-cover"
                        onError={() => setError('Failed to play video')}
                    />
                </div>
            ) : (
                /* Thumbnail Display */
                <div className="aspect-video bg-gray-800 flex items-center justify-center relative">
                    {thumbnailUrl ? (
                        <img
                            src={thumbnailUrl}
                            alt={title}
                            className="w-full h-full object-cover"
                            onError={() => setThumbnailUrl(null)}
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
                            disabled={loading}
                            className="bg-bright-pink hover:bg-bright-pink/90 text-white p-4 rounded-full"
                        >
                            {loading ? (
                                <Loader2 className="w-8 h-8 animate-spin" />
                            ) : (
                                <Play className="w-8 h-8 ml-1" />
                            )}
                        </Button>
                    </div>

                    {/* Duration Badge */}
                    {duration && duration > 0 && (
                        <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                            {formatDuration(duration)}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SecureVideoPlayer;
