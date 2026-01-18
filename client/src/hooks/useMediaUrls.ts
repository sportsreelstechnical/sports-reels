import { useState, useEffect, useCallback } from "react";
import { presignedGetUrlService } from "@/domains/video/services/presignedGetUrlService";

interface UseMediaUrlsResult {
  videoUrl: string | null;
  thumbnailUrl: string | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export const useMediaUrls = (
  videoKey?: string,
  thumbnailKey?: string,
  expiresIn: number = 3600,
): UseMediaUrlsResult => {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUrls = useCallback(async () => {
    if (!videoKey && !thumbnailKey) {
      setVideoUrl(null);
      setThumbnailUrl(null);
      return;
    }

    setLoading(true);
    setError(null);

    console.log("🔄 useMediaUrls: Fetching URLs for:", {
      videoKey,
      thumbnailKey,
    });

    try {
      const result = await presignedGetUrlService.getSignedMediaUrls(
        videoKey,
        thumbnailKey,
        expiresIn,
      );

      console.log("📡 useMediaUrls: Backend response:", result);

      if (result.success) {
        setVideoUrl(result.videoUrl || null);
        setThumbnailUrl(result.thumbnailUrl || null);
        console.log("✅ useMediaUrls: URLs set:", {
          videoUrl: result.videoUrl ? "Generated" : "None",
          thumbnailUrl: result.thumbnailUrl ? "Generated" : "None",
        });
      } else {
        const errorMsg = result.error || "Failed to load media URLs";
        setError(errorMsg);
        setVideoUrl(null);
        setThumbnailUrl(null);
        console.error("❌ useMediaUrls: Error:", errorMsg);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      setVideoUrl(null);
      setThumbnailUrl(null);
      console.error("❌ useMediaUrls: Exception:", errorMessage);
    } finally {
      setLoading(false);
    }
  }, [videoKey, thumbnailKey, expiresIn]);

  useEffect(() => {
    fetchUrls();
  }, [fetchUrls]);

  return {
    videoUrl,
    thumbnailUrl,
    loading,
    error,
    refresh: fetchUrls,
  };
};

export default useMediaUrls;
