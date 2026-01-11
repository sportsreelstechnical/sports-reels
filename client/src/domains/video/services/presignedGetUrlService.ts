export interface PresignedGetUrlResult {
    success: boolean;
    url?: string;
    error?: string;
}

export class PresignedGetUrlService {
    private baseUrl: string;

    constructor(baseUrl: string = import.meta.env.VITE_BACKEND_STORAGE_URL) {
        this.baseUrl = baseUrl;
    }

    /**
     * Get presigned URL for video/thumbnail access
     */
    async getPresignedUrl(
        key: string,
        expiresIn: number = 3600
    ): Promise<PresignedGetUrlResult> {
        try {
            const response = await fetch(`${this.baseUrl}/api/r2/presigned-get-url`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    key,
                    expiresIn
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                return {
                    success: true,
                    url: data.presignedUrl
                };
            } else {
                return {
                    success: false,
                    error: data.error || 'Failed to get presigned URL'
                };
            }
        } catch (error) {
            console.error('Error getting presigned GET URL:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Get presigned URL for video playback
     */
    async getVideoUrl(key: string): Promise<PresignedGetUrlResult> {
        return this.getPresignedUrl(key, 3600); // 1 hour expiry
    }

    /**
     * Get presigned URL for thumbnail display
     */
    async getThumbnailUrl(key: string): Promise<PresignedGetUrlResult> {
        return this.getPresignedUrl(key, 7200); // 2 hours expiry (thumbnails can be cached longer)
    }

    /**
     * Get signed URLs for both video and thumbnail
     */
    async getSignedMediaUrls(
        videoKey?: string,
        thumbnailKey?: string,
        expiresIn: number = 3600
    ): Promise<{
        success: boolean;
        videoUrl?: string;
        thumbnailUrl?: string;
        error?: string;
    }> {
        try {
            const response = await fetch(`${this.baseUrl}/api/r2/signed-media-urls`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    videoKey,
                    thumbnailKey,
                    expiresIn
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                return {
                    success: true,
                    videoUrl: data.videoUrl,
                    thumbnailUrl: data.thumbnailUrl
                };
            } else {
                return {
                    success: false,
                    error: data.error || 'Failed to get signed media URLs'
                };
            }
        } catch (error) {
            console.error('Error getting signed media URLs:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
}

// Export singleton instance
export const presignedGetUrlService = new PresignedGetUrlService();
