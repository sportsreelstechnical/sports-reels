/**
 * Server-Side Video Compression Service
 * 
 * Flow:
 * 1. Upload original video to R2 originals/ bucket
 * 2. Trigger FFmpeg worker to compress video
 * 3. Worker uploads compressed version to R2 compressed/ bucket
 * 4. App retrieves compressed version for playback
 */

export interface ServerCompressionOptions {
    onProgress?: (progress: number) => void;
    onStatusChange?: (status: string) => void;
    compressionQuality?: 'high' | 'medium' | 'low';
    targetBitrate?: number; // kbps
    maxResolution?: '1080p' | '720p' | '480p' | '360p';
}

export interface ServerCompressionResult {
    originalFile: File;
    originalSizeMB: number;
    compressedSizeMB: number;
    compressionRatio: number;
    processingTimeMs: number;
    method: 'server-side-ffmpeg';
    qualityScore: number;
    audioPreserved: boolean;
    smoothPlayback: boolean;
    originalKey: string; // R2 key for original file
    compressedKey: string; // R2 key for compressed file
    compressedUrl?: string; // Presigned URL for compressed file
    thumbnailBlob?: Blob;
}

export class ServerSideCompressionService {
    private readonly API_BASE_URL = import.meta.env.VITE_BACKEND_STORAGE_URL; // Default to local server

    async compressVideo(file: File, options: ServerCompressionOptions = {}): Promise<ServerCompressionResult> {
        const startTime = Date.now();
        const fileSizeMB = file.size / (1024 * 1024);

        console.log('🚀 SERVER-SIDE compression starting:', file.name);
        console.log('📊 Original size:', fileSizeMB.toFixed(2) + 'MB');

        try {
            // Step 1: Upload original to R2 originals/ bucket
            options.onStatusChange?.('Uploading original video...');
            const originalKey = await this.uploadOriginalToR2(file, options);
            console.log('✅ Original uploaded to R2:', originalKey);

            // Step 2: Trigger FFmpeg compression worker
            options.onStatusChange?.('Starting server-side compression...');
            const compressionJobId = await this.triggerCompression(originalKey, options);
            console.log('✅ Compression job started:', compressionJobId);

            // Step 3: Poll for compression completion
            options.onStatusChange?.('Compressing video with FFmpeg...');
            const compressedKey = await this.waitForCompression(compressionJobId, options);
            console.log('✅ Compression completed:', compressedKey);

            // Step 4: Get compressed file info
            options.onStatusChange?.('Retrieving compressed video...');
            const compressedInfo = await this.getCompressedFileInfo(compressedKey);

            // Step 5: Generate thumbnail
            options.onStatusChange?.('Generating thumbnail...');
            const thumbnailBlob = await this.generateThumbnail(file);

            const processingTime = Date.now() - startTime;
            const compressionRatio = file.size / compressedInfo.size;

            console.log('🎉 SERVER-SIDE compression completed in', processingTime + 'ms');
            console.log('📉 Size reduction:', ((1 - compressedInfo.size / file.size) * 100).toFixed(1) + '%');

            return {
                originalFile: file,
                originalSizeMB: fileSizeMB,
                compressedSizeMB: compressedInfo.size / (1024 * 1024),
                compressionRatio,
                processingTimeMs: processingTime,
                method: 'server-side-ffmpeg',
                qualityScore: this.calculateQualityScore(compressionRatio, processingTime),
                audioPreserved: true, // FFmpeg preserves audio properly
                smoothPlayback: true, // FFmpeg produces smooth playback
                originalKey,
                compressedKey,
                compressedUrl: compressedInfo.url,
                thumbnailBlob
            };

        } catch (error) {
            console.error('❌ Server-side compression failed:', error);
            throw new Error(`Server-side compression failed: ${error}`);
        }
    }

    private async uploadOriginalToR2(file: File, options: ServerCompressionOptions): Promise<string> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('bucket', 'originals');
        formData.append('path', `videos/${this.generateUniqueId()}`);

        // Create XMLHttpRequest for upload progress tracking
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            let uploadTimeout: NodeJS.Timeout;

            xhr.upload.addEventListener('progress', (event) => {
                if (event.lengthComputable) {
                    const progress = (event.loaded / event.total) * 100;
                    options.onProgress?.(progress);
                    options.onStatusChange?.(`Phase 1 processing... ${Math.round(progress)}%`);
                }
            });

            xhr.addEventListener('load', () => {
                clearTimeout(uploadTimeout);
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const result = JSON.parse(xhr.responseText);
                        resolve(result.key);
                    } catch (error) {
                        reject(new Error('Failed to parse upload response'));
                    }
                } else {
                    reject(new Error(`Failed to upload original: ${xhr.statusText}`));
                }
            });

            xhr.addEventListener('error', () => {
                clearTimeout(uploadTimeout);
                reject(new Error('Upload failed - network error'));
            });

            xhr.addEventListener('timeout', () => {
                clearTimeout(uploadTimeout);
                reject(new Error('Upload failed - timeout'));
            });

            xhr.open('POST', `${this.API_BASE_URL}/upload-original`);
            xhr.timeout = 300000; // 5 minute timeout for upload
            xhr.send(formData);

            // Additional timeout as backup
            uploadTimeout = setTimeout(() => {
                xhr.abort();
                reject(new Error('Upload failed - timeout'));
            }, 300000); // 5 minutes
        });
    }

    private async triggerCompression(originalKey: string, options: ServerCompressionOptions): Promise<string> {
        const compressionSettings = {
            originalKey,
            quality: options.compressionQuality || 'medium',
            targetBitrate: options.targetBitrate || this.getOptimalBitrate(options.compressionQuality),
            maxResolution: options.maxResolution || '720p',
            preserveAudio: true,
            outputFormat: 'mp4'
        };

        const response = await fetch(`${this.API_BASE_URL}/compress-video`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(compressionSettings)
        });

        if (!response.ok) {
            throw new Error(`Failed to trigger compression: ${response.statusText}`);
        }

        const result = await response.json();
        return result.jobId;
    }

    private async waitForCompression(jobId: string, options: ServerCompressionOptions): Promise<string> {
        const pollInterval = 2000; // 2 seconds for more responsive updates
        let lastProgress = 0;
        let consecutiveErrors = 0;
        const maxConsecutiveErrors = 5;

        while (true) {
            try {
                const response = await fetch(`${this.API_BASE_URL}/compression-status/${jobId}`, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                    },
                    // Add timeout to prevent hanging
                    signal: AbortSignal.timeout(10000) // 10 second timeout
                });

                if (!response.ok) {
                    throw new Error(`Failed to check compression status: ${response.statusText}`);
                }

                const status = await response.json();

                if (status.status === 'completed') {
                    options.onProgress?.(100);
                    return status.compressedKey;
                } else if (status.status === 'failed') {
                    throw new Error(`Compression failed: ${status.error}`);
                } else if (status.status === 'processing') {
                    const progress = status.progress || 0;
                    // Only update progress if it's increasing or at 100%
                    if (progress >= lastProgress || progress === 100) {
                        lastProgress = progress;
                        options.onProgress?.(progress);
                        options.onStatusChange?.(`Phase 2 processing... ${Math.round(progress)}%`);
                    }
                }

                // Reset error counter on successful request
                consecutiveErrors = 0;

                // Wait before next poll
                await new Promise(resolve => setTimeout(resolve, pollInterval));

            } catch (error) {
                consecutiveErrors++;
                console.warn(`Polling error (${consecutiveErrors}/${maxConsecutiveErrors}):`, error);

                // If we've had too many consecutive errors, fail the compression
                if (consecutiveErrors >= maxConsecutiveErrors) {
                    throw new Error(`Compression failed after ${maxConsecutiveErrors} consecutive polling errors: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }

                // Wait longer on errors to avoid overwhelming the server
                await new Promise(resolve => setTimeout(resolve, pollInterval * consecutiveErrors));
            }
        }
    }

    private async getCompressedFileInfo(compressedKey: string): Promise<{ size: number; url: string }> {
        const response = await fetch(`${this.API_BASE_URL}/compressed-file-info`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ key: compressedKey })
        });

        if (!response.ok) {
            throw new Error(`Failed to get compressed file info: ${response.statusText}`);
        }

        return await response.json();
    }

    private async generateThumbnail(file: File): Promise<Blob> {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                reject(new Error('Canvas context not available'));
                return;
            }

            video.onloadedmetadata = () => {
                // Seek to 25% of video duration for thumbnail
                video.currentTime = video.duration * 0.25;
            };

            video.onseeked = () => {
                canvas.width = 320;
                canvas.height = 180;

                ctx.drawImage(video, 0, 0, 320, 180);

                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Failed to generate thumbnail'));
                    }
                }, 'image/jpeg', 0.8);
            };

            video.onerror = () => reject(new Error('Failed to load video for thumbnail'));
            video.src = URL.createObjectURL(file);
        });
    }

    private getOptimalBitrate(quality?: string): number {
        switch (quality) {
            case 'high': return 2500; // 2.5 Mbps
            case 'medium': return 1500; // 1.5 Mbps
            case 'low': return 800; // 800 kbps
            default: return 1500;
        }
    }

    private calculateQualityScore(compressionRatio: number, processingTime: number): number {
        // Higher ratio (more compression) = lower score
        // Faster processing = higher score
        const ratioScore = Math.max(1, 10 - (compressionRatio - 2) * 2);
        const speedScore = Math.max(1, 10 - (processingTime / 60000) * 2); // 1 point per minute
        return Math.round((ratioScore + speedScore) / 2);
    }

    private generateUniqueId(): string {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
}

// Export singleton instance
export const serverSideCompressionService = new ServerSideCompressionService();
