import React, { useState, useEffect } from 'react';
import { Video } from 'lucide-react';
import { useMediaUrls } from '@/hooks/useMediaUrls';

interface SmartThumbnailProps {
    thumbnailUrl?: string;
    title: string;
    className?: string;
}

export const SmartThumbnail: React.FC<SmartThumbnailProps> = ({
    thumbnailUrl,
    title,
    className = ""
}) => {
    const [isR2Key, setIsR2Key] = useState(false);
    const [isSupabaseUrl, setIsSupabaseUrl] = useState(false);
    const [isPublicUrl, setIsPublicUrl] = useState(false);

    // Use the secure hook for R2 keys
    const { thumbnailUrl: signedUrl, loading, error } = useMediaUrls(undefined, isR2Key ? thumbnailUrl : undefined, 7200);

    useEffect(() => {
        if (!thumbnailUrl) {
            setIsR2Key(false);
            setIsSupabaseUrl(false);
            setIsPublicUrl(false);
            return;
        }

        // Check if it's an R2 key (starts with sports-reels/)
        if (thumbnailUrl.startsWith('sports-reels/')) {
            setIsR2Key(true);
            setIsSupabaseUrl(false);
            setIsPublicUrl(false);
        }
        // Check if it's a Supabase URL
        else if (thumbnailUrl.includes('supabase') || thumbnailUrl.includes('storage.googleapis.com')) {
            setIsR2Key(false);
            setIsSupabaseUrl(true);
            setIsPublicUrl(false);
        }
        // Check if it's a public R2 URL
        else if (thumbnailUrl.includes('pub-') && thumbnailUrl.includes('.r2.dev')) {
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
    }, [thumbnailUrl]);

    // No thumbnail provided
    if (!thumbnailUrl) {
        return (
            <div className={`w-full h-full flex items-center justify-center bg-gray-800 ${className}`}>
                <Video className="w-8 h-8 text-gray-400" />
            </div>
        );
    }

    // R2 key - use signed URL
    if (isR2Key) {
        if (loading) {
            return (
                <div className={`w-full h-full flex items-center justify-center bg-gray-800 ${className}`}>
                    <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                </div>
            );
        }

        if (error) {
            return (
                <div className={`w-full h-full flex items-center justify-center bg-gray-800 ${className}`}>
                    <Video className="w-8 h-8 text-gray-400" />
                </div>
            );
        }

        return (
            <img
                src={signedUrl || undefined}
                alt={title}
                className={`w-full h-full object-cover ${className}`}
                onError={() => {
                    console.error('Failed to load R2 thumbnail:', signedUrl);
                }}
            />
        );
    }

    // Supabase URL or public URL - use directly
    if (isSupabaseUrl || isPublicUrl) {
        return (
            <img
                src={thumbnailUrl}
                alt={title}
                className={`w-full h-full object-cover ${className}`}
                onError={() => {
                    console.error('Failed to load public thumbnail:', thumbnailUrl);
                }}
            />
        );
    }

    // Fallback
    return (
        <div className={`w-full h-full flex items-center justify-center bg-gray-800 ${className}`}>
            <Video className="w-8 h-8 text-gray-400" />
        </div>
    );
};

export default SmartThumbnail;
