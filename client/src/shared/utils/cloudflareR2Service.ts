import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getCloudflareConfig } from '@/config/cloudflare';

export interface R2UploadResult {
    success: boolean;
    url?: string;
    key?: string;
    error?: string;
}

export interface R2Config {
    accountId: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucketName: string;
    publicUrl?: string;
}

export class CloudflareR2Service {
    private s3Client: S3Client;
    private config: R2Config;

    constructor(config: R2Config) {
        this.config = config;

        // Initialize S3 client for Cloudflare R2
        this.s3Client = new S3Client({
            region: 'auto', // Cloudflare R2 uses 'auto' region
            endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId: config.accessKeyId,
                secretAccessKey: config.secretAccessKey,
            },
        });
    }

    /**
     * Upload a file to Cloudflare R2
     */
    async uploadFile(
        file: File | Blob,
        key: string,
        contentType?: string,
        onProgress?: (progress: number) => void
    ): Promise<R2UploadResult> {
        try {
            // Convert file to ArrayBuffer for proper AWS SDK compatibility
            const arrayBuffer = await file.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);

            const command = new PutObjectCommand({
                Bucket: this.config.bucketName,
                Key: key,
                Body: uint8Array,
                ContentType: contentType || file.type || 'application/octet-stream',
                Metadata: {
                    uploadedAt: new Date().toISOString(),
                    originalName: file instanceof File ? file.name : 'blob',
                },
            });

            // Handle progress tracking
            if (onProgress) {
                // Simulate progress since AWS SDK doesn't provide real-time progress for small files
                const fileSize = file.size;
                const chunkSize = Math.min(1024 * 1024, fileSize); // 1MB chunks
                const chunks = Math.ceil(fileSize / chunkSize);

                for (let i = 0; i < chunks; i++) {
                    const progress = ((i + 1) / chunks) * 100;
                    onProgress(progress);

                    // Small delay to show progress (remove in production)
                    await new Promise(resolve => setTimeout(resolve, 50));
                }
            }

            await this.s3Client.send(command);

            // Generate public URL
            const publicUrl = this.getPublicUrl(key);

            return {
                success: true,
                url: publicUrl,
                key: key,
            };
        } catch (error) {
            console.error('R2 upload error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown upload error',
            };
        }
    }

    /**
     * Get a signed URL for accessing a private file
     */
    async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string | null> {
        try {
            const command = new GetObjectCommand({
                Bucket: this.config.bucketName,
                Key: key,
            });

            const signedUrl = await getSignedUrl(this.s3Client, command, { expiresIn });
            return signedUrl;
        } catch (error) {
            console.error('Error generating signed URL:', error);
            return null;
        }
    }

    /**
     * Check if a file exists in R2
     */
    async fileExists(key: string): Promise<boolean> {
        try {
            const command = new HeadObjectCommand({
                Bucket: this.config.bucketName,
                Key: key,
            });

            await this.s3Client.send(command);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Delete a file from R2
     */
    async deleteFile(key: string): Promise<boolean> {
        try {
            const command = new DeleteObjectCommand({
                Bucket: this.config.bucketName,
                Key: key,
            });

            await this.s3Client.send(command);
            return true;
        } catch (error) {
            console.error('Error deleting file from R2:', error);
            return false;
        }
    }

    /**
     * Get public URL for a file (if bucket is public)
     */
    private getPublicUrl(key: string): string {
        if (this.config.publicUrl) {
            return `${this.config.publicUrl}/${key}`;
        }

        // Default Cloudflare R2 public URL format
        return `https://pub-${this.config.accountId}.r2.dev/${key}`;
    }

    /**
     * Generate a unique key for video files
     */
    generateVideoKey(title: string, teamId: string, timestamp?: number): string {
        const sanitizedTitle = title
            .replace(/[^a-zA-Z0-9.-]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');

        const ts = timestamp || Date.now();
        return `sports-reels/videos/${teamId}/${sanitizedTitle}_${ts}.mp4`;
    }

    /**
     * Generate a unique key for thumbnail files
     */
    generateThumbnailKey(title: string, teamId: string, timestamp?: number): string {
        const sanitizedTitle = title
            .replace(/[^a-zA-Z0-9.-]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');

        const ts = timestamp || Date.now();
        return `sports-reels/thumbnails/${teamId}/${sanitizedTitle}_thumbnail_${ts}.jpg`;
    }

    /**
     * Upload video with progress tracking
     */
    async uploadVideo(
        videoFile: File | Blob,
        title: string,
        teamId: string,
        onProgress?: (progress: number) => void
    ): Promise<R2UploadResult> {
        const key = this.generateVideoKey(title, teamId);

        // Use simple upload for all files to avoid AWS SDK streaming issues
        return this.uploadFile(videoFile, key, 'video/mp4', onProgress);
    }

    /**
     * Upload large files using chunked approach
     */
    private async uploadLargeFile(
        file: File | Blob,
        key: string,
        contentType?: string,
        onProgress?: (progress: number) => void
    ): Promise<R2UploadResult> {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const chunkSize = 5 * 1024 * 1024; // 5MB chunks
            const totalChunks = Math.ceil(arrayBuffer.byteLength / chunkSize);

            let uploadedBytes = 0;

            for (let i = 0; i < totalChunks; i++) {
                const start = i * chunkSize;
                const end = Math.min(start + chunkSize, arrayBuffer.byteLength);
                const chunk = arrayBuffer.slice(start, end);

                const command = new PutObjectCommand({
                    Bucket: this.config.bucketName,
                    Key: `${key}.part${i}`,
                    Body: new Uint8Array(chunk),
                    ContentType: contentType || file.type || 'application/octet-stream',
                });

                await this.s3Client.send(command);

                uploadedBytes += chunk.byteLength;
                const progress = (uploadedBytes / arrayBuffer.byteLength) * 100;
                onProgress?.(progress);
            }

            // Upload the complete file
            const finalCommand = new PutObjectCommand({
                Bucket: this.config.bucketName,
                Key: key,
                Body: new Uint8Array(arrayBuffer),
                ContentType: contentType || file.type || 'application/octet-stream',
                Metadata: {
                    uploadedAt: new Date().toISOString(),
                    originalName: file instanceof File ? file.name : 'blob',
                },
            });

            await this.s3Client.send(finalCommand);

            // Clean up chunk files
            for (let i = 0; i < totalChunks; i++) {
                try {
                    await this.s3Client.send(new DeleteObjectCommand({
                        Bucket: this.config.bucketName,
                        Key: `${key}.part${i}`,
                    }));
                } catch (error) {
                    console.warn(`Failed to delete chunk ${i}:`, error);
                }
            }

            const publicUrl = this.getPublicUrl(key);

            return {
                success: true,
                url: publicUrl,
                key: key,
            };
        } catch (error) {
            console.error('Large file upload error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown upload error',
            };
        }
    }

    /**
     * Upload thumbnail with progress tracking
     */
    async uploadThumbnail(
        thumbnailBlob: Blob,
        title: string,
        teamId: string,
        onProgress?: (progress: number) => void
    ): Promise<R2UploadResult> {
        const key = this.generateThumbnailKey(title, teamId);
        return this.uploadFile(thumbnailBlob, key, 'image/jpeg', onProgress);
    }
}

// Default configuration using environment variables or the provided credentials
const defaultConfig: R2Config = getCloudflareConfig();

// Export singleton instance
export const cloudflareR2Service = new CloudflareR2Service(defaultConfig);

// Export for custom configuration
export default CloudflareR2Service;
