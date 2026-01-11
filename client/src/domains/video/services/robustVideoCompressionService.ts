// Robust Video Compression Service
// Handles MediaRecorder failures gracefully with multiple fallback methods

export interface RobustOptions {
    targetSizeMB: number;
    quality: 'premium' | 'high' | 'balanced' | 'fast';
    preserveAudio: boolean;
    onProgress?: (progress: number) => void;
}

export interface RobustResult {
    compressedFile: File;
    originalSizeMB: number;
    compressedSizeMB: number;
    compressionRatio: number;
    processingTimeMs: number;
    method: 'robust' | 'fallback' | 'basic';
    qualityScore: number;
    audioPreserved: boolean;
    thumbnailBlob?: Blob;
}

export class RobustVideoCompressionService {
    async compressVideo(
        file: File,
        options: RobustOptions = {
            targetSizeMB: 20,
            quality: 'balanced',
            preserveAudio: true
        }
    ): Promise<RobustResult> {
        const startTime = performance.now();
        const originalSizeMB = file.size / (1024 * 1024);

        console.log(`🛡️ ROBUST compression starting: ${file.name}`);
        console.log(`📊 Original size: ${originalSizeMB.toFixed(2)}MB`);
        console.log(`🎯 Quality mode: ${options.quality}`);

        // If file is already small enough, return as is
        if (originalSizeMB <= options.targetSizeMB) {
            return {
                compressedFile: file,
                originalSizeMB,
                compressedSizeMB: originalSizeMB,
                compressionRatio: 1,
                processingTimeMs: 0,
                method: 'robust',
                qualityScore: 10,
                audioPreserved: true,
                thumbnailBlob: await this.generateThumbnail(file)
            };
        }

        let result: RobustResult;

        try {
            // Try robust compression first
            result = await this.robustCompress(file, options);
        } catch (error) {
            console.warn('Robust compression failed, trying fallback:', error);
            try {
                // Fallback to basic compression
                result = await this.basicCompress(file, options);
            } catch (fallbackError) {
                console.error('All compression methods failed:', fallbackError);
                throw new Error('Video compression failed. Please try a different video file.');
            }
        }

        const processingTime = performance.now() - startTime;
        result.processingTimeMs = processingTime;

        console.log(`🛡️ ROBUST compression completed in ${processingTime.toFixed(0)}ms`);
        console.log(`📉 Size reduction: ${((1 - result.compressionRatio) * 100).toFixed(1)}%`);
        console.log(`⭐ Quality score: ${result.qualityScore}/10`);
        console.log(`🔊 Audio preserved: ${result.audioPreserved ? 'Yes' : 'No'}`);

        return result;
    }

    private async robustCompress(file: File, options: RobustOptions): Promise<RobustResult> {
        console.log('🛡️ ROBUST compression mode - Maximum compatibility!');

        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d', {
                willReadFrequently: false,
                alpha: false,
                desynchronized: true
            });

            if (!ctx) {
                reject(new Error('Canvas context not available'));
                return;
            }

            video.onloadedmetadata = () => {
                // Moderate scale factor for compatibility
                const scaleFactor = 0.6; // 60% of original size
                const width = Math.floor(video.videoWidth * scaleFactor);
                const height = Math.floor(video.videoHeight * scaleFactor);

                canvas.width = width;
                canvas.height = height;

                // Conservative canvas settings for compatibility
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'medium';

                // Use the most compatible codec
                const mimeType = this.getMostCompatibleMimeType();
                const stream = canvas.captureStream(15); // Moderate frame rate for stability

                let mediaRecorder: MediaRecorder;
                try {
                    // Try with basic settings first
                    mediaRecorder = new MediaRecorder(stream, {
                        mimeType: mimeType
                    });
                } catch (error) {
                    console.warn('MediaRecorder creation failed, trying basic fallback:', error);
                    try {
                        // Ultimate fallback - just use webm
                        mediaRecorder = new MediaRecorder(stream);
                    } catch (fallbackError) {
                        reject(new Error('MediaRecorder not supported in this browser'));
                        return;
                    }
                }

                const chunks: Blob[] = [];
                let frameCount = 0;
                const totalFrames = Math.floor(video.duration * 15);

                mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        chunks.push(event.data);
                    }
                };

                mediaRecorder.onstop = async () => {
                    try {
                        const blob = new Blob(chunks, { type: mimeType });
                        const compressedFile = new File([blob],
                            file.name.replace(/\.[^/.]+$/, '_robust_compressed.webm'),
                            { type: mimeType }
                        );

                        const thumbnailBlob = await this.generateThumbnail(file);

                        resolve({
                            compressedFile,
                            originalSizeMB: file.size / (1024 * 1024),
                            compressedSizeMB: blob.size / (1024 * 1024),
                            compressionRatio: file.size / blob.size,
                            processingTimeMs: 0,
                            method: 'robust',
                            qualityScore: 7,
                            audioPreserved: false, // Audio not preserved in robust mode for compatibility
                            thumbnailBlob
                        });
                    } catch (error) {
                        reject(error);
                    }
                };

                mediaRecorder.onerror = (error) => {
                    console.error('MediaRecorder error:', error);
                    reject(new Error(`Robust compression failed: ${error}`));
                };

                const processFrame = () => {
                    if (video.ended || frameCount >= totalFrames) {
                        mediaRecorder.stop();
                        return;
                    }

                    ctx.drawImage(video, 0, 0, width, height);

                    frameCount++;
                    if (options.onProgress) {
                        options.onProgress((frameCount / totalFrames) * 100);
                    }

                    video.currentTime = frameCount / 15;
                    requestAnimationFrame(processFrame);
                };

                try {
                    mediaRecorder.start();
                    video.play();
                    processFrame();
                } catch (error) {
                    reject(new Error(`Failed to start compression: ${error}`));
                }
            };

            video.onerror = () => reject(new Error('Failed to load video'));
            video.src = URL.createObjectURL(file);
        });
    }

    private async basicCompress(file: File, options: RobustOptions): Promise<RobustResult> {
        console.log('🔧 BASIC compression mode - Maximum compatibility fallback!');

        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                reject(new Error('Canvas context not available'));
                return;
            }

            video.onloadedmetadata = () => {
                // Very conservative settings for maximum compatibility
                const scaleFactor = 0.5; // 50% of original size
                const width = Math.floor(video.videoWidth * scaleFactor);
                const height = Math.floor(video.videoHeight * scaleFactor);

                canvas.width = width;
                canvas.height = height;

                // Basic canvas settings
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'low';

                const stream = canvas.captureStream(10); // Low frame rate for stability

                let mediaRecorder: MediaRecorder;
                try {
                    // Try the most basic MediaRecorder possible
                    mediaRecorder = new MediaRecorder(stream);
                } catch (error) {
                    reject(new Error('MediaRecorder not supported in this browser'));
                    return;
                }

                const chunks: Blob[] = [];
                let frameCount = 0;
                const totalFrames = Math.floor(video.duration * 10);

                mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        chunks.push(event.data);
                    }
                };

                mediaRecorder.onstop = async () => {
                    try {
                        const blob = new Blob(chunks, { type: 'video/webm' });
                        const compressedFile = new File([blob],
                            file.name.replace(/\.[^/.]+$/, '_basic_compressed.webm'),
                            { type: 'video/webm' }
                        );

                        const thumbnailBlob = await this.generateThumbnail(file);

                        resolve({
                            compressedFile,
                            originalSizeMB: file.size / (1024 * 1024),
                            compressedSizeMB: blob.size / (1024 * 1024),
                            compressionRatio: file.size / blob.size,
                            processingTimeMs: 0,
                            method: 'basic',
                            qualityScore: 5,
                            audioPreserved: false,
                            thumbnailBlob
                        });
                    } catch (error) {
                        reject(error);
                    }
                };

                mediaRecorder.onerror = (error) => {
                    console.error('Basic MediaRecorder error:', error);
                    reject(new Error(`Basic compression failed: ${error}`));
                };

                const processFrame = () => {
                    if (video.ended || frameCount >= totalFrames) {
                        mediaRecorder.stop();
                        return;
                    }

                    ctx.drawImage(video, 0, 0, width, height);

                    frameCount++;
                    if (options.onProgress) {
                        options.onProgress((frameCount / totalFrames) * 100);
                    }

                    video.currentTime = frameCount / 10;
                    requestAnimationFrame(processFrame);
                };

                try {
                    mediaRecorder.start();
                    video.play();
                    processFrame();
                } catch (error) {
                    reject(new Error(`Failed to start basic compression: ${error}`));
                }
            };

            video.onerror = () => reject(new Error('Failed to load video'));
            video.src = URL.createObjectURL(file);
        });
    }

    private getMostCompatibleMimeType(): string {
        // Try the most compatible codecs in order
        const codecs = [
            'video/webm',
            'video/webm;codecs=vp8',
            'video/mp4',
            'video/mp4;codecs=h264'
        ];

        for (const codec of codecs) {
            if (MediaRecorder.isTypeSupported(codec)) {
                return codec;
            }
        }

        return 'video/webm'; // Ultimate fallback
    }

    private async generateThumbnail(file: File, timestampSeconds: number = 5): Promise<Blob> {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                reject(new Error('Canvas context not available'));
                return;
            }

            video.onloadedmetadata = () => {
                canvas.width = 640;
                canvas.height = 360;
                video.currentTime = timestampSeconds;
            };

            video.onseeked = () => {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Failed to generate thumbnail'));
                    }
                }, 'image/jpeg', 0.8);
            };

            video.onerror = () => reject(new Error('Failed to load video'));
            video.src = URL.createObjectURL(file);
        });
    }
}

// Export singleton instance
export const robustVideoCompressionService = new RobustVideoCompressionService();
