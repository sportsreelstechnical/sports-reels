import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { useMediaUrls } from "@/hooks/useMediaUrls";
import { Loader2 } from "lucide-react";

interface SignedVideoPlayerProps extends React.VideoHTMLAttributes<HTMLVideoElement> {
    videoKey: string;
}

export const SignedVideoPlayer = forwardRef<HTMLVideoElement, SignedVideoPlayerProps>(
    ({ videoKey, className, ...props }, ref) => {
        const isLegacy = videoKey?.startsWith("/objects/");
        const { videoUrl, loading, error } = useMediaUrls(isLegacy ? undefined : videoKey);

        // Internal ref for auto-play logic
        const internalRef = useRef<HTMLVideoElement | null>(null);

        // Combined ref callback to handle both internal and forwarded refs
        const setRefs = (element: HTMLVideoElement | null) => {
            internalRef.current = element;

            if (typeof ref === "function") {
                ref(element);
            } else if (ref) {
                ref.current = element;
            }
        };

        const finalUrl = isLegacy ? videoKey : videoUrl;

        // Auto-play when URL becomes available
        useEffect(() => {
            if (finalUrl && props.autoPlay && internalRef.current) {
                internalRef.current.play().catch(e => console.log("Auto-play prevented:", e));
            }
        }, [finalUrl]); // Removed props.autoPlay from deps to avoid re-triggering slightly

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
                ref={setRefs}
                src={finalUrl}
                className={className}
                {...props}
            />
        );
    }
);

SignedVideoPlayer.displayName = "SignedVideoPlayer";
