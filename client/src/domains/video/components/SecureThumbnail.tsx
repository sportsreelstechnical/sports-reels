import React from 'react';
import { Video } from 'lucide-react';
import { useMediaUrls } from '@/hooks/useMediaUrls';

interface SecureThumbnailProps {
    thumbnailKey?: string;
    title: string;
    className?: string;
}

export const SecureThumbnail: React.FC<SecureThumbnailProps> = ({
    thumbnailKey,
    title,
    className = ""
}) => {
    const { thumbnailUrl, loading, error } = useMediaUrls(undefined, thumbnailKey, 7200);
    const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);
    const [useFallback, setUseFallback] = useState(false);

    if (!thumbnailKey) {
        return (
            <div className={`w-full h-full flex items-center justify-center bg-gray-800 ${className}`}>
                <Video className="w-8 h-8 text-gray-400" />
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

    if (loading) {
        return (
            <div className={`w-full h-full flex items-center justify-center bg-gray-800 ${className}`}>
                <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <img
            src={thumbnailUrl || undefined}
            alt={title}
            className={`w-full h-full object-cover ${className}`}
            onError={() => {
                console.error('Failed to load thumbnail:', thumbnailUrl);
            }}
        />
    );
};

export default SecureThumbnail;
