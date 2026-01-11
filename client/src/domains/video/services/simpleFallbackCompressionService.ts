export interface SimpleFallbackResult {
    compressedFile: File;
    originalSizeMB: number;
    compressedSizeMB: number;
    compressionRatio: number;
    processingTimeMs: number;
    method: 'simple-fallback';
    qualityScore: number;
    audioPreserved: boolean;
    smoothPlayback: boolean;
    thumbnailBlob?: Blob;
}

export class SimpleFallbackCompressionService {
    async compressVideo(file: File): Promise<SimpleFallbackResult> {
        console.log('🛡️ Using SIMPLE FALLBACK compression - maximum compatibility');

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
                // Very conservative settings for maximum compatibility
                const scaleFactor = 0.7; // 70% of original size
                const width = Math.floor(video.videoWidth * scaleFactor);
                const height = Math.floor(video.videoHeight * scaleFactor);

                canvas.width = width;
                canvas.height = height;

                // Basic canvas settings
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'low';

                // Use the most basic stream possible
                const stream = canvas.captureStream(15); // Low frame rate for compatibility

                // Try to create MediaRecorder with absolute minimal constraints
                let mediaRecorder: MediaRecorder;
                try {
                    // Strategy 1: Try basic WebM
                    mediaRecorder = new MediaRecorder(stream, {
                        mimeType: 'video/webm'
                    });
                } catch (error1) {
                    try {
                        // Strategy 2: Try basic MP4
                        mediaRecorder = new MediaRecorder(stream, {
                            mimeType: 'video/mp4'
                        });
                    } catch (error2) {
                        try {
                            // Strategy 3: No mime type specified
                            mediaRecorder = new MediaRecorder(stream);
                        } catch (error3) {
                            reject(new Error('All simple fallback MediaRecorder creation failed'));
                            return;
                        }
                    }
                }

                const chunks: Blob[] = [];
                let frameCount = 0;
                const totalFrames = Math.floor(video.duration * 15); // Match frame rate

                mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        chunks.push(event.data);
                    }
                };

                mediaRecorder.onstop = async () => {
                    try {
                        const blob = new Blob(chunks, { type: 'video/webm' });
                        const compressedFile = new File([blob],
                            file.name.replace(/\.[^/.]+$/, '_simple_fallback.webm'),
                            { type: 'video/webm' }
                        );

                        const thumbnailBlob = await this.generateThumbnail(file);

                        resolve({
                            compressedFile,
                            originalSizeMB: file.size / (1024 * 1024),
                            compressedSizeMB: blob.size / (1024 * 1024),
                            compressionRatio: file.size / blob.size,
                            processingTimeMs: 0,
                            method: 'simple-fallback',
                            qualityScore: 3, // Low quality but functional
                            audioPreserved: false, // Disabled for maximum compatibility
                            smoothPlayback: true,
                            thumbnailBlob
                        });
                    } catch (error) {
                        reject(error);
                    }
                };

                mediaRecorder.onerror = (error) => {
                    console.error('Simple fallback MediaRecorder error:', error);
                    reject(new Error(`Simple fallback compression failed: ${error}`));
                };

                // Simple frame processing - every 3rd frame
                const processFrame = () => {
                    if (video.ended || frameCount >= totalFrames) {
                        mediaRecorder.stop();
                        return;
                    }

                    // Skip many frames for maximum compatibility
                    if (frameCount % 3 === 0) {
                        ctx.drawImage(video, 0, 0, width, height);
                    }

                    frameCount++;
                    video.currentTime = frameCount / 15; // Match frame rate
                    requestAnimationFrame(processFrame);
                };

                mediaRecorder.start();
                video.play();
                processFrame();
            };

            video.onerror = () => reject(new Error('Failed to load video for simple fallback compression'));
            video.src = URL.createObjectURL(file);
        });
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
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;

                video.currentTime = Math.min(timestampSeconds, video.duration - 1);
            };

            video.onseeked = () => {
                ctx.drawImage(video, 0, 0);
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
}

export const simpleFallbackCompressionService = new SimpleFallbackCompressionService();
