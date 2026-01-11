import { cloudflareR2Service } from '@/shared/utils/cloudflareR2Service';

export interface VideoRetrievalOptions {
    useSignedUrl?: boolean;
    expiresIn?: number; // seconds
}

export interface VideoRetrievalResult {
    success: boolean;
    videoUrl?: string;
    thumbnailUrl?: string;
    error?: string;
}

export class R2VideoRetrievalService {
    /**
     * Get video URL for AI analysis
     * This handles both public URLs and signed URLs for private videos
     */
    async getVideoForAnalysis(
        videoUrl: string,
        options: VideoRetrievalOptions = {}
    ): Promise<VideoRetrievalResult> {
        try {
            // Check if the URL is a localhost/development URL (invalid for production)
            if (this.isLocalhostUrl(videoUrl)) {
                return {
                    success: false,
                    error: `Invalid video URL: ${videoUrl}. This appears to be a development/localhost URL that is not accessible. Please re-upload the video.`,
                };
            }

            // Check if the URL is already a Cloudflare R2 URL or R2 key
            if (this.isR2Url(videoUrl)) {
                // Extract the key from the URL
                const key = this.extractKeyFromUrl(videoUrl);

                // Always generate a signed URL for better security and reliability
                const signedUrl = await cloudflareR2Service.getSignedUrl(
                    key,
                    options.expiresIn || 3600 // 1 hour default
                );

                if (signedUrl) {
                    return {
                        success: true,
                        videoUrl: signedUrl,
                    };
                } else {
                    return {
                        success: false,
                        error: 'Failed to generate signed URL',
                    };
                }
            } else {
                // For non-R2 URLs (legacy Supabase URLs), check if they're valid
                try {
                    // Test if the URL is accessible
                    const response = await fetch(videoUrl, { method: 'HEAD' });
                    if (response.ok) {
                        return {
                            success: true,
                            videoUrl: videoUrl,
                        };
                    } else {
                        return {
                            success: false,
                            error: `Video URL is not accessible: ${videoUrl}`,
                        };
                    }
                } catch (error) {
                    return {
                        success: false,
                        error: `Video URL is not accessible: ${videoUrl}`,
                    };
                }
            }
        } catch (error) {
            console.error('Error retrieving video for analysis:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Get thumbnail URL for display
     */
    async getThumbnailForDisplay(
        thumbnailUrl: string,
        options: VideoRetrievalOptions = {}
    ): Promise<VideoRetrievalResult> {
        try {
            // Check if the URL is a localhost/development URL (invalid for production)
            if (this.isLocalhostUrl(thumbnailUrl)) {
                return {
                    success: false,
                    error: `Invalid thumbnail URL: ${thumbnailUrl}. This appears to be a development/localhost URL that is not accessible. Please re-upload the video.`,
                };
            }

            // Check if the URL is already a Cloudflare R2 URL or R2 key
            if (this.isR2Url(thumbnailUrl)) {
                // Extract the key from the URL
                const key = this.extractKeyFromUrl(thumbnailUrl);

                // Always generate a signed URL for better security and reliability
                const signedUrl = await cloudflareR2Service.getSignedUrl(
                    key,
                    options.expiresIn || 3600 // 1 hour default
                );

                if (signedUrl) {
                    return {
                        success: true,
                        thumbnailUrl: signedUrl,
                    };
                } else {
                    return {
                        success: false,
                        error: 'Failed to generate signed thumbnail URL',
                    };
                }
            } else {
                // For non-R2 URLs (legacy Supabase URLs), check if they're valid
                try {
                    // Test if the URL is accessible
                    const response = await fetch(thumbnailUrl, { method: 'HEAD' });
                    if (response.ok) {
                        return {
                            success: true,
                            thumbnailUrl: thumbnailUrl,
                        };
                    } else {
                        return {
                            success: false,
                            error: `Thumbnail URL is not accessible: ${thumbnailUrl}`,
                        };
                    }
                } catch (error) {
                    return {
                        success: false,
                        error: `Thumbnail URL is not accessible: ${thumbnailUrl}`,
                    };
                }
            }
        } catch (error) {
            console.error('Error retrieving thumbnail for display:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Check if a URL is a Cloudflare R2 URL or R2 key
     */
    private isR2Url(url: string): boolean {
        // Check for full R2 URLs
        if (url.includes('r2.dev') || url.includes('r2.cloudflarestorage.com')) {
            return true;
        }

        // Check for R2 keys (start with sports-reels/)
        if (url.startsWith('sports-reels/')) {
            return true;
        }

        return false;
    }

    /**
     * Check if a URL is a localhost/development URL that should be treated as invalid
     */
    private isLocalhostUrl(url: string): boolean {
        return url.includes('localhost') || url.includes('127.0.0.1') || url.includes('::1');
    }

    /**
     * Extract the object key from a Cloudflare R2 URL or R2 key
     */
    private extractKeyFromUrl(url: string): string {
        try {
            // If it's already a key (starts with sports-reels/), return as-is
            if (url.startsWith('sports-reels/')) {
                return url;
            }

            // If it's a full URL, extract the key from the pathname
            const urlObj = new URL(url);
            // Remove leading slash from pathname
            return urlObj.pathname.substring(1);
        } catch (error) {
            console.error('Error extracting key from URL:', error);
            throw new Error('Invalid R2 URL format');
        }
    }

    /**
     * Get video URL for streaming/playback
     * This is optimized for video playback with appropriate headers
     */
    async getVideoForPlayback(
        videoUrl: string,
        options: VideoRetrievalOptions = {}
    ): Promise<VideoRetrievalResult> {
        // For playback, always use signed URLs for better security and reliability
        return this.getVideoForAnalysis(videoUrl, {
            expiresIn: options.expiresIn || 7200, // 2 hours for playback
        });
    }

    /**
     * Batch retrieve multiple videos for analysis
     */
    async getMultipleVideosForAnalysis(
        videoUrls: string[],
        options: VideoRetrievalOptions = {}
    ): Promise<VideoRetrievalResult[]> {
        const promises = videoUrls.map(url =>
            this.getVideoForAnalysis(url, options)
        );

        return Promise.all(promises);
    }

    /**
     * Check if video exists in R2
     */
    async videoExists(videoUrl: string): Promise<boolean> {
        try {
            // Localhost URLs are invalid and don't exist
            if (this.isLocalhostUrl(videoUrl)) {
                return false;
            }

            if (this.isR2Url(videoUrl)) {
                const key = this.extractKeyFromUrl(videoUrl);
                return await cloudflareR2Service.fileExists(key);
            }

            // For non-R2 URLs, assume they exist (legacy behavior)
            return true;
        } catch (error) {
            console.error('Error checking if video exists:', error);
            return false;
        }
    }

    /**
     * Delete video from R2
     */
    async deleteVideo(videoUrl: string): Promise<boolean> {
        try {
            if (this.isR2Url(videoUrl)) {
                const key = this.extractKeyFromUrl(videoUrl);
                return await cloudflareR2Service.deleteFile(key);
            }

            // For non-R2 URLs, return false (can't delete from other services)
            return false;
        } catch (error) {
            console.error('Error deleting video:', error);
            return false;
        }
    }
}

// Export singleton instance
export const r2VideoRetrievalService = new R2VideoRetrievalService();

export default R2VideoRetrievalService;
