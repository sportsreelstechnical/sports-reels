import { useRef, useEffect } from "react";
import { useMediaUrls } from "@/hooks/useMediaUrls";
import { Loader2 } from "lucide-react";

interface SignedVideoPlayerProps extends React.VideoHTMLAttributes<HTMLVideoElement> {
    videoKey: string;
}

export function SignedVideoPlayer({ videoKey, className, ...props }: SignedVideoPlayerProps) {
    const isLegacy = videoKey?.startsWith("/objects/");
    const { videoUrl, loading, error } = useMediaUrls(isLegacy ? undefined : videoKey);
    const videoRef = useRef<HTMLVideoElement>(null);

    const finalUrl = isLegacy ? videoKey : videoUrl;

    // Auto-play when URL becomes available
    useEffect(() => {
        if (finalUrl && props.autoPlay && videoRef.current) {
            videoRef.current.play().catch(e => console.log("Auto-play prevented:", e));
        }
    }, [finalUrl]);

    if (loading && !isLegacy) {
        return (
            <div className={`flex items-center justify-center bg-black/10 ${className}`}>
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error && !isLegacy) {
        return (
            <div className={`flex items-center justify-center bg-black/10 text-destructive ${className}`}>
                <p>Error loading video</p>
            </div>
        );
    }

    if (!finalUrl) {
        return (
            <div className={`flex items-center justify-center bg-black/10 ${className}`}>
                <p className="text-muted-foreground">Video not available</p>
            </div>
        );
    }

    return (
        <video
            ref={videoRef}
            src={finalUrl}
            className={className}
            {...props}
        />
    );
}
