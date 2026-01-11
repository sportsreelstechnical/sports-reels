import { balancedVideoCompressionService, type BalancedOptions, type BalancedResult } from './balancedVideoCompressionService';
import { RobustConstraintHandlingService } from './robustConstraintHandlingService';

export interface FormatPreservingOptions {
    targetSizeMB: number;
    mode: 'premium' | 'high' | 'balanced' | 'fast';
    preserveAudio: boolean;
    maintainSmoothPlayback: boolean;
    preserveFormat: boolean; // New option to preserve original format
    onProgress?: (progress: number) => void;
}

export interface FormatPreservingResult {
    compressedFile: File;
    originalSizeMB: number;
    compressedSizeMB: number;
    compressionRatio: number;
    processingTimeMs: number;
    method: 'format-preserving';
    qualityScore: number;
    audioPreserved: boolean;
    smoothPlayback: boolean;
    originalFormat: string;
    compressedFormat: string;
    formatPreserved: boolean;
    thumbnailBlob?: Blob;
}

export class FormatPreservingCompressionService {
    async compressVideo(
        file: File,
        options: FormatPreservingOptions
    ): Promise<FormatPreservingResult> {
        const fileSizeMB = file.size / (1024 * 1024);
        const originalFormat = file.type;
        const isMP4 = originalFormat.includes('mp4');
        const isWebM = originalFormat.includes('webm');

        console.log(`🎬 Format-preserving compression for ${fileSizeMB.toFixed(2)}MB ${originalFormat} file`);

        // Try to preserve original format first
        if (options.preserveFormat) {
            try {
                if (isMP4) {
                    const result = await this.compressAsMP4(file, options);
                    if (result) {
                        return {
                            ...result,
                            originalFormat,
                            compressedFormat: 'video/mp4',
                            formatPreserved: true
                        };
                    }
                } else if (isWebM) {
                    const result = await this.compressAsWebM(file, options);
                    if (result) {
                        return {
                            ...result,
                            originalFormat,
                            compressedFormat: 'video/webm',
                            formatPreserved: true
                        };
                    }
                }
            } catch (error) {
                console.warn(`Failed to preserve ${originalFormat} format, falling back:`, error);
            }
        }

        // Fallback to best available format
        const fallbackResult = await this.compressWithBestFormat(file, options);
        return {
            ...fallbackResult,
            originalFormat,
            compressedFormat: fallbackResult.compressedFile.type,
            formatPreserved: false
        };
    }

    private async compressAsMP4(file: File, options: FormatPreservingOptions): Promise<Omit<FormatPreservingResult, 'originalFormat' | 'compressedFormat' | 'formatPreserved'> | null> {
        console.log('🎬 Attempting MP4 compression to preserve format');

        return new Promise(async (resolve, reject) => {
            const video = document.createElement('video');
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d', {
                willReadFrequently: false,
                alpha: false,
                desynchronized: true
            });

            if (!ctx) {
                resolve(null);
                return;
            }

            video.onloadedmetadata = async () => {
                const settings = this.getMP4OptimizedSettings(file.size / (1024 * 1024), options.mode);

                const width = Math.floor(video.videoWidth * settings.scaleFactor);
                const height = Math.floor(video.videoHeight * settings.scaleFactor);

                canvas.width = width;
                canvas.height = height;

                // High-quality canvas settings for MP4
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';

                // Try MP4 codecs first - start with basic MP4 for maximum compatibility
                const mimeTypes = [
                    'video/mp4',  // Basic MP4 - maximum compatibility
                    'video/mp4;codecs=h264',
                    'video/mp4;codecs=h264,aac',
                    'video/mp4;codecs=avc1.42E01E,mp4a.40.2'
                ];

                let supportedMimeType: string | null = null;
                for (const mimeType of mimeTypes) {
                    if (MediaRecorder.isTypeSupported(mimeType)) {
                        supportedMimeType = mimeType;
                        break;
                    }
                }

                if (!supportedMimeType) {
                    console.warn('No MP4 codec supported, cannot preserve MP4 format');
                    resolve(null);
                    return;
                }

                console.log(`✅ Using MP4 codec: ${supportedMimeType}`);

                const stream = canvas.captureStream(settings.frameRate);

                // Simple MediaRecorder creation - like the old working method
                let mediaRecorder: MediaRecorder;

                try {
                    // Create MediaRecorder with basic MP4 - simple and reliable
                    mediaRecorder = new MediaRecorder(stream, {
                        mimeType: supportedMimeType
                    });
                    console.log(`✅ Created MP4 MediaRecorder with: ${supportedMimeType}`);
                } catch (error) {
                    console.warn('Failed to create MP4 MediaRecorder:', error);
                    resolve(null);
                    return;
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
                        const blob = new Blob(chunks, { type: supportedMimeType! });
                        const compressedFile = new File([blob],
                            file.name.replace(/\.[^/.]+$/, '_mp4_compressed.mp4'),
                            { type: supportedMimeType! }
                        );

                        const thumbnailBlob = await this.generateThumbnail(file);

                        resolve({
                            compressedFile,
                            originalSizeMB: file.size / (1024 * 1024),
                            compressedSizeMB: blob.size / (1024 * 1024),
                            compressionRatio: file.size / blob.size,
                            processingTimeMs: 0,
                            method: 'format-preserving',
                            qualityScore: settings.qualityScore,
                            audioPreserved: false, // Simple compression without audio
                            smoothPlayback: true,
                            thumbnailBlob
                        });
                    } catch (error) {
                        reject(error);
                    }
                };

                mediaRecorder.onerror = (error) => {
                    console.error('MP4 MediaRecorder error:', error);
                    resolve(null);
                };

                // Simple frame processing - like the old working method
                const processFrame = () => {
                    if (video.ended || frameCount >= totalFrames) {
                        mediaRecorder.stop();
                        return;
                    }

                    // Simple frame processing
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

                // Mute video during compression to prevent background noise
                video.muted = true;
                video.volume = 0;

                mediaRecorder.start();
                video.play();
                requestAnimationFrame(processFrame);
            };

            video.onerror = () => {
                console.warn('Failed to load video for MP4 compression');
                resolve(null);
            };
            video.src = URL.createObjectURL(file);
        });
    }

    private async compressAsWebM(file: File, options: FormatPreservingOptions): Promise<Omit<FormatPreservingResult, 'originalFormat' | 'compressedFormat' | 'formatPreserved'> | null> {
        console.log('🎬 Attempting WebM compression to preserve format');

        return new Promise(async (resolve, reject) => {
            const video = document.createElement('video');
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d', {
                willReadFrequently: false,
                alpha: false,
                desynchronized: true
            });

            if (!ctx) {
                resolve(null);
                return;
            }

            video.onloadedmetadata = async () => {
                const settings = this.getWebMOptimizedSettings(file.size / (1024 * 1024), options.mode);

                const width = Math.floor(video.videoWidth * settings.scaleFactor);
                const height = Math.floor(video.videoHeight * settings.scaleFactor);

                canvas.width = width;
                canvas.height = height;

                // High-quality canvas settings for WebM
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';

                // Try WebM codecs
                const mimeTypes = [
                    'video/webm;codecs=vp9,opus',
                    'video/webm;codecs=vp8,opus',
                    'video/webm;codecs=vp9',
                    'video/webm;codecs=vp8',
                    'video/webm'
                ];

                let supportedMimeType: string | null = null;
                for (const mimeType of mimeTypes) {
                    if (MediaRecorder.isTypeSupported(mimeType)) {
                        supportedMimeType = mimeType;
                        break;
                    }
                }

                if (!supportedMimeType) {
                    console.warn('No WebM codec supported');
                    resolve(null);
                    return;
                }

                console.log(`✅ Using WebM codec: ${supportedMimeType}`);

                const stream = canvas.captureStream(settings.frameRate);

                // Simple MediaRecorder creation - like the old working method
                let mediaRecorder: MediaRecorder;

                try {
                    // Create MediaRecorder with basic WebM - simple and reliable
                    mediaRecorder = new MediaRecorder(stream, {
                        mimeType: supportedMimeType
                    });
                    console.log(`✅ Created WebM MediaRecorder with: ${supportedMimeType}`);
                } catch (error) {
                    console.warn('Failed to create WebM MediaRecorder:', error);
                    resolve(null);
                    return;
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
                        const blob = new Blob(chunks, { type: supportedMimeType! });
                        const compressedFile = new File([blob],
                            file.name.replace(/\.[^/.]+$/, '_webm_compressed.webm'),
                            { type: supportedMimeType! }
                        );

                        const thumbnailBlob = await this.generateThumbnail(file);

                        resolve({
                            compressedFile,
                            originalSizeMB: file.size / (1024 * 1024),
                            compressedSizeMB: blob.size / (1024 * 1024),
                            compressionRatio: file.size / blob.size,
                            processingTimeMs: 0,
                            method: 'format-preserving',
                            qualityScore: settings.qualityScore,
                            audioPreserved: false, // Simple compression without audio
                            smoothPlayback: true,
                            thumbnailBlob
                        });
                    } catch (error) {
                        reject(error);
                    }
                };

                mediaRecorder.onerror = (error) => {
                    console.error('WebM MediaRecorder error:', error);
                    resolve(null);
                };

                // Simple frame processing - like the old working method
                const processFrame = () => {
                    if (video.ended || frameCount >= totalFrames) {
                        mediaRecorder.stop();
                        return;
                    }

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

                // Mute video during compression to prevent background noise
                video.muted = true;
                video.volume = 0;

                mediaRecorder.start();
                video.play();
                requestAnimationFrame(processFrame);
            };

            video.onerror = () => {
                console.warn('Failed to load video for WebM compression');
                resolve(null);
            };
            video.src = URL.createObjectURL(file);
        });
    }

    private async compressWithBestFormat(file: File, options: FormatPreservingOptions): Promise<Omit<FormatPreservingResult, 'originalFormat' | 'compressedFormat' | 'formatPreserved'>> {
        console.log('🛡️ Using SIMPLE FALLBACK compression - maximum compatibility');

        // Use simple fallback compression to avoid MediaRecorder errors
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

            video.onloadedmetadata = async () => {
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
                    // Try MP4 first for better compatibility
                    mediaRecorder = new MediaRecorder(stream, {
                        mimeType: 'video/mp4'
                    });
                } catch (error1) {
                    try {
                        // Fallback to WebM
                        mediaRecorder = new MediaRecorder(stream, {
                            mimeType: 'video/webm'
                        });
                    } catch (error2) {
                        try {
                            // Ultimate fallback - no mime type
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
                            method: 'format-preserving',
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

                // Simple frame processing - like the old working method
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
                    if (options.onProgress) {
                        options.onProgress((frameCount / totalFrames) * 100);
                    }
                    video.currentTime = frameCount / 15; // Match frame rate
                    requestAnimationFrame(processFrame);
                };

                // Mute video during compression to prevent background noise
                video.muted = true;
                video.volume = 0;

                mediaRecorder.start();
                video.play();
                requestAnimationFrame(processFrame);
            };

            video.onerror = () => reject(new Error('Failed to load video for simple fallback compression'));
            video.src = URL.createObjectURL(file);
        });
    }

    private getMP4OptimizedSettings(fileSizeMB: number, mode: string) {
        switch (mode) {
            case 'premium':
                return {
                    scaleFactor: 0.9,
                    frameRate: 30,
                    frameSkip: 1,
                    videoBitrate: 4000000,
                    audioBitrate: 128000,
                    qualityScore: 10
                };
            case 'high':
                return {
                    scaleFactor: 0.85,
                    frameRate: 30,
                    frameSkip: 1,
                    videoBitrate: 3000000,
                    audioBitrate: 128000,
                    qualityScore: 9
                };
            case 'balanced':
                return {
                    scaleFactor: 0.8,
                    frameRate: 25,
                    frameSkip: 1,
                    videoBitrate: 2500000,
                    audioBitrate: 128000,
                    qualityScore: 8
                };
            case 'fast':
                return {
                    scaleFactor: 0.75,
                    frameRate: 25,
                    frameSkip: 2,
                    videoBitrate: 2000000,
                    audioBitrate: 128000,
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

    private getWebMOptimizedSettings(fileSizeMB: number, mode: string) {
        switch (mode) {
            case 'premium':
                return {
                    scaleFactor: 0.9,
                    frameRate: 30,
                    frameSkip: 1,
                    videoBitrate: 4000000,
                    audioBitrate: 128000,
                    qualityScore: 10
                };
            case 'high':
                return {
                    scaleFactor: 0.85,
                    frameRate: 30,
                    frameSkip: 1,
                    videoBitrate: 3000000,
                    audioBitrate: 128000,
                    qualityScore: 9
                };
            case 'balanced':
                return {
                    scaleFactor: 0.8,
                    frameRate: 25,
                    frameSkip: 1,
                    videoBitrate: 2500000,
                    audioBitrate: 128000,
                    qualityScore: 8
                };
            case 'fast':
                return {
                    scaleFactor: 0.75,
                    frameRate: 25,
                    frameSkip: 2,
                    videoBitrate: 2000000,
                    audioBitrate: 128000,
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

    private async addSimpleAudioTrack(stream: MediaStream, file: File): Promise<void> {
        try {
            const audio = document.createElement('audio');
            audio.src = URL.createObjectURL(file);
            audio.crossOrigin = 'anonymous';
            audio.muted = true; // Mute the audio element to prevent playback

            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Audio loading timeout'));
                }, 5000); // Shorter timeout

                audio.onloadedmetadata = () => {
                    clearTimeout(timeout);
                    resolve(undefined);
                };
                audio.onerror = () => {
                    clearTimeout(timeout);
                    reject(new Error('Failed to load audio'));
                };
            });

            // Simple audio context creation
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

            // Resume if suspended
            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }

            if (audioContext.state === 'running') {
                const source = audioContext.createMediaElementSource(audio);
                const destination = audioContext.createMediaStreamDestination();
                source.connect(destination);

                const audioTracks = destination.stream.getAudioTracks();
                if (audioTracks.length > 0) {
                    // Add the first audio track only
                    stream.addTrack(audioTracks[0]);
                    console.log('✅ Simple audio track added successfully');
                } else {
                    console.warn('⚠️ No audio tracks found');
                }
            }
        } catch (error) {
            console.warn('Failed to add simple audio track:', error);
        }
    }

    private async addMP4AudioTrackToStream(stream: MediaStream, file: File): Promise<void> {
        try {
            const audio = document.createElement('audio');
            audio.src = URL.createObjectURL(file);
            audio.crossOrigin = 'anonymous';

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

            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
                sampleRate: 44100, // Standard for MP4
                latencyHint: 'interactive'
            });

            // Resume audio context if suspended
            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }

            if (audioContext && audioContext.state === 'running') {
                const source = audioContext.createMediaElementSource(audio);
                const destination = audioContext.createMediaStreamDestination();
                source.connect(destination);

                const audioTracks = destination.stream.getAudioTracks();
                if (audioTracks.length > 0) {
                    audioTracks.forEach(track => {
                        track.applyConstraints({
                            sampleRate: 44100,
                            channelCount: 2
                        });
                        stream.addTrack(track);
                    });
                    console.log('✅ MP4 audio track added successfully');
                } else {
                    console.warn('⚠️ No audio tracks found in destination stream');
                }
            } else {
                console.warn('⚠️ Audio context not running, skipping audio track addition');
            }
        } catch (error) {
            console.warn('Failed to add MP4 audio track:', error);
        }
    }

    private async addWebMAudioTrackToStream(stream: MediaStream, file: File): Promise<void> {
        try {
            const audio = document.createElement('audio');
            audio.src = URL.createObjectURL(file);
            audio.crossOrigin = 'anonymous';

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

            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
                sampleRate: 48000, // Higher for WebM
                latencyHint: 'interactive'
            });

            // Resume audio context if suspended
            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }

            if (audioContext && audioContext.state === 'running') {
                const source = audioContext.createMediaElementSource(audio);
                const destination = audioContext.createMediaStreamDestination();
                source.connect(destination);

                const audioTracks = destination.stream.getAudioTracks();
                if (audioTracks.length > 0) {
                    audioTracks.forEach(track => {
                        track.applyConstraints({
                            sampleRate: 48000,
                            channelCount: 2
                        });
                        stream.addTrack(track);
                    });
                    console.log('✅ WebM audio track added successfully');
                } else {
                    console.warn('⚠️ No audio tracks found in destination stream');
                }
            } else {
                console.warn('⚠️ Audio context not running, skipping audio track addition');
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

export const formatPreservingCompressionService = new FormatPreservingCompressionService();
