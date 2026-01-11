import { balancedVideoCompressionService, type BalancedOptions, type BalancedResult } from './balancedVideoCompressionService';

export interface WebMOptimizedOptions {
    targetSizeMB: number;
    mode: 'premium' | 'high' | 'balanced' | 'fast';
    preserveAudio: boolean;
    maintainSmoothPlayback: boolean;
    onProgress?: (progress: number) => void;
}

export interface WebMOptimizedResult {
    compressedFile: File;
    originalSizeMB: number;
    compressedSizeMB: number;
    compressionRatio: number;
    processingTimeMs: number;
    method: 'webm-premium' | 'webm-high' | 'webm-balanced' | 'webm-fast';
    qualityScore: number;
    audioPreserved: boolean;
    smoothPlayback: boolean;
    thumbnailBlob?: Blob;
}

export class WebMOptimizedCompressionService {
    async compressVideo(
        file: File,
        options: WebMOptimizedOptions
    ): Promise<WebMOptimizedResult> {
        const fileSizeMB = file.size / (1024 * 1024);
        const isWebM = file.type.includes('webm');

        console.log(`🎬 WebM-Optimized compression for ${fileSizeMB.toFixed(2)}MB ${isWebM ? 'WebM' : 'video'} file`);

        // For WebM files, use special handling
        if (isWebM) {
            return this.compressWebMFile(file, options);
        } else {
            // For non-WebM files, use improved balanced compression
            return this.compressNonWebMFile(file, options);
        }
    }

    private async compressWebMFile(file: File, options: WebMOptimizedOptions): Promise<WebMOptimizedResult> {
        const fileSizeMB = file.size / (1024 * 1024);
        console.log(`🎬 Compressing WebM file with optimized settings`);

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
                // WebM-optimized settings
                const settings = this.getWebMOptimizedSettings(fileSizeMB, options.mode);

                const width = Math.floor(video.videoWidth * settings.scaleFactor);
                const height = Math.floor(video.videoHeight * settings.scaleFactor);

                canvas.width = width;
                canvas.height = height;

                // High-quality canvas settings for WebM
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.filter = 'contrast(1.05) saturate(1.05)'; // Slight enhancement for WebM

                // Use WebM-optimized codec selection
                const mimeType = this.getWebMOptimizedMimeType();
                const stream = canvas.captureStream(settings.frameRate);

                // Enhanced audio handling for WebM
                if (options.preserveAudio) {
                    this.addWebMAudioTrackToStream(stream, file);
                }

                let mediaRecorder: MediaRecorder;
                try {
                    mediaRecorder = new MediaRecorder(stream, {
                        mimeType,
                        videoBitsPerSecond: settings.videoBitrate,
                        audioBitsPerSecond: settings.audioBitrate
                    });
                } catch (error) {
                    console.warn('Failed to create WebM MediaRecorder, using fallback:', error);
                    mediaRecorder = new MediaRecorder(stream, {
                        mimeType: 'video/webm'
                    });
                }

                const chunks: Blob[] = [];
                let frameCount = 0;
                const totalFrames = Math.floor(video.duration * settings.frameRate);

                mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        chunks.push(event.data);
                    }
                };

                mediaRecorder.onstop = async () => {
                    try {
                        const blob = new Blob(chunks, { type: mimeType });
                        const compressedFile = new File([blob],
                            file.name.replace(/\.[^/.]+$/, '_webm_optimized.webm'),
                            { type: mimeType }
                        );

                        const thumbnailBlob = await this.generateThumbnail(file);

                        resolve({
                            compressedFile,
                            originalSizeMB: file.size / (1024 * 1024),
                            compressedSizeMB: blob.size / (1024 * 1024),
                            compressionRatio: file.size / blob.size,
                            processingTimeMs: 0,
                            method: `webm-${options.mode}` as any,
                            qualityScore: settings.qualityScore,
                            audioPreserved: options.preserveAudio,
                            smoothPlayback: true,
                            thumbnailBlob
                        });
                    } catch (error) {
                        reject(error);
                    }
                };

                mediaRecorder.onerror = (error) => {
                    console.error('WebM MediaRecorder error:', error);
                    reject(new Error(`WebM compression failed: ${error}`));
                };

                // WebM-optimized frame processing
                const processFrame = () => {
                    if (video.ended || frameCount >= totalFrames) {
                        mediaRecorder.stop();
                        return;
                    }

                    // Less aggressive frame skipping for WebM
                    if (frameCount % settings.frameSkip === 0) {
                        ctx.drawImage(video, 0, 0, width, height);
                    }

                    frameCount++;
                    if (options.onProgress) {
                        options.onProgress((frameCount / totalFrames) * 100);
                    }

                    video.currentTime = frameCount / settings.frameRate;
                    requestAnimationFrame(processFrame);
                };

                mediaRecorder.start();
                video.play();
                processFrame();
            };

            video.onerror = () => reject(new Error('Failed to load WebM video'));
            video.src = URL.createObjectURL(file);
        });
    }

    private async compressNonWebMFile(file: File, options: WebMOptimizedOptions): Promise<WebMOptimizedResult> {
        // Use improved balanced compression for non-WebM files
        const balancedOptions: BalancedOptions = {
            targetSizeMB: options.targetSizeMB,
            mode: this.mapToBalancedMode(options.mode),
            preserveAudio: options.preserveAudio,
            maintainSmoothPlayback: options.maintainSmoothPlayback,
            onProgress: options.onProgress
        };

        const result = await balancedVideoCompressionService.compressVideo(file, balancedOptions);

        return {
            ...result,
            method: `webm-${options.mode}` as any,
            qualityScore: this.getQualityScore(options.mode)
        };
    }

    private getWebMOptimizedSettings(fileSizeMB: number, mode: string) {
        switch (mode) {
            case 'premium':
                return {
                    scaleFactor: 0.9, // 90% of original size
                    frameRate: 30, // Full frame rate
                    frameSkip: 1, // No frame skipping
                    videoBitrate: 4000000, // 4Mbps
                    audioBitrate: 128000, // 128kbps
                    qualityScore: 10
                };
            case 'high':
                return {
                    scaleFactor: 0.85, // 85% of original size
                    frameRate: 30, // Full frame rate
                    frameSkip: 1, // No frame skipping
                    videoBitrate: 3000000, // 3Mbps
                    audioBitrate: 128000, // 128kbps
                    qualityScore: 9
                };
            case 'balanced':
                return {
                    scaleFactor: 0.8, // 80% of original size
                    frameRate: 25, // Slightly reduced frame rate
                    frameSkip: 1, // Minimal frame skipping
                    videoBitrate: 2500000, // 2.5Mbps
                    audioBitrate: 128000, // 128kbps
                    qualityScore: 8
                };
            case 'fast':
                return {
                    scaleFactor: 0.75, // 75% of original size
                    frameRate: 25, // Reduced frame rate
                    frameSkip: 2, // Every 2nd frame
                    videoBitrate: 2000000, // 2Mbps
                    audioBitrate: 128000, // 128kbps
                    qualityScore: 7
                };
            default:
                return {
                    scaleFactor: 0.8,
                    frameRate: 25,
                    frameSkip: 1,
                    videoBitrate: 2500000,
                    audioBitrate: 128000,
                    qualityScore: 8
                };
        }
    }

    private getWebMOptimizedMimeType(): string {
        // Prioritize VP9 for better WebM quality, fallback to VP8
        if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
            return 'video/webm;codecs=vp9,opus';
        } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
            return 'video/webm;codecs=vp8,opus';
        } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
            return 'video/webm;codecs=vp9';
        } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
            return 'video/webm;codecs=vp8';
        } else {
            return 'video/webm';
        }
    }

    private async addWebMAudioTrackToStream(stream: MediaStream, file: File): Promise<void> {
        try {
            // Enhanced WebM audio handling
            const audio = document.createElement('audio');
            audio.src = URL.createObjectURL(file);
            audio.crossOrigin = 'anonymous';

            // Wait for audio to load with timeout
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Audio loading timeout'));
                }, 10000);

                audio.onloadedmetadata = () => {
                    clearTimeout(timeout);
                    resolve(undefined);
                };
                audio.onerror = () => {
                    clearTimeout(timeout);
                    reject(new Error('Failed to load audio'));
                };
            });

            // Create audio context with better settings for WebM
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
                sampleRate: 48000, // Higher sample rate for WebM
                latencyHint: 'interactive'
            });

            if (audioContext && audioContext.state === 'running') {
                const source = audioContext.createMediaElementSource(audio);
                const destination = audioContext.createMediaStreamDestination();
                source.connect(destination);

                // Add audio track to the video stream
                const audioTracks = destination.stream.getAudioTracks();
                audioTracks.forEach(track => {
                    // Configure audio track for WebM
                    track.applyConstraints({
                        sampleRate: 48000,
                        channelCount: 2
                    });
                    stream.addTrack(track);
                });
            }
        } catch (error) {
            console.warn('Failed to add WebM audio track:', error);
        }
    }

    private mapToBalancedMode(mode: string): 'quality' | 'balanced' | 'speed' {
        switch (mode) {
            case 'premium':
            case 'high':
                return 'quality';
            case 'balanced':
                return 'balanced';
            case 'fast':
                return 'speed';
            default:
                return 'balanced';
        }
    }

    private getQualityScore(mode: string): number {
        switch (mode) {
            case 'premium': return 10;
            case 'high': return 9;
            case 'balanced': return 8;
            case 'fast': return 7;
            default: return 8;
        }
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
                }, 'image/jpeg', 0.9);
            };

            video.onerror = () => reject(new Error('Failed to load video for thumbnail'));
            video.src = URL.createObjectURL(file);
        });
    }
}

export const webmOptimizedCompressionService = new WebMOptimizedCompressionService();
