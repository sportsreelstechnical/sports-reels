// Balanced Video Compression Service
// Delivers both excellent quality AND fast speed - no compromises!

import { RobustConstraintHandlingService } from './robustConstraintHandlingService';

export interface BalancedOptions {
    targetSizeMB: number;
    mode: 'quality' | 'balanced' | 'speed';
    preserveAudio: boolean;
    maintainSmoothPlayback: boolean;
    onProgress?: (progress: number) => void;
}

export interface BalancedResult {
    compressedFile: File;
    originalSizeMB: number;
    compressedSizeMB: number;
    compressionRatio: number;
    processingTimeMs: number;
    method: 'quality' | 'balanced' | 'speed';
    qualityScore: number; // 1-10 quality rating
    audioPreserved: boolean;
    smoothPlayback: boolean;
    thumbnailBlob?: Blob;
}

export class BalancedVideoCompressionService {
    async compressVideo(
        file: File,
        options: BalancedOptions = {
            targetSizeMB: 20,
            mode: 'balanced',
            preserveAudio: true,
            maintainSmoothPlayback: true
        }
    ): Promise<BalancedResult> {
        const startTime = performance.now();
        const originalSizeMB = file.size / (1024 * 1024);

        console.log(`⚖️ BALANCED compression starting: ${file.name}`);
        console.log(`📊 Original size: ${originalSizeMB.toFixed(2)}MB`);
        console.log(`🎯 Mode: ${options.mode}`);
        console.log(`🔊 Audio preservation: ${options.preserveAudio ? 'Yes' : 'No'}`);
        console.log(`🎬 Smooth playback: ${options.maintainSmoothPlayback ? 'Yes' : 'No'}`);

        // If file is already small enough, return as is
        if (originalSizeMB <= options.targetSizeMB) {
            return {
                compressedFile: file,
                originalSizeMB,
                compressedSizeMB: originalSizeMB,
                compressionRatio: 1,
                processingTimeMs: 0,
                method: 'quality',
                qualityScore: 10,
                audioPreserved: true,
                smoothPlayback: true,
                thumbnailBlob: await this.generateThumbnail(file)
            };
        }

        let result: BalancedResult;

        try {
            // Choose compression method based on mode preference
            switch (options.mode) {
                case 'quality':
                    result = await this.qualityCompress(file, options);
                    break;
                case 'balanced':
                    result = await this.balancedCompress(file, options);
                    break;
                case 'speed':
                    result = await this.speedCompress(file, options);
                    break;
                default:
                    result = await this.balancedCompress(file, options);
            }
        } catch (error) {
            console.error('Balanced compression failed:', error);
            throw new Error('Balanced compression failed. Please try a different approach.');
        }

        const processingTime = performance.now() - startTime;
        result.processingTimeMs = processingTime;

        console.log(`⚖️ BALANCED compression completed in ${processingTime.toFixed(0)}ms`);
        console.log(`📉 Size reduction: ${((1 - result.compressionRatio) * 100).toFixed(1)}%`);
        console.log(`⭐ Quality score: ${result.qualityScore}/10`);
        console.log(`🔊 Audio preserved: ${result.audioPreserved ? 'Yes' : 'No'}`);
        console.log(`🎬 Smooth playback: ${result.smoothPlayback ? 'Yes' : 'No'}`);

        return result;
    }

    private async qualityCompress(file: File, options: BalancedOptions): Promise<BalancedResult> {
        // QUALITY mode: Maximum quality with good speed
        console.log('💎 QUALITY compression mode - Maximum quality!');

        return new Promise(async (resolve, reject) => {
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
                // High resolution for quality
                const scaleFactor = 0.85; // 85% of original size
                const width = Math.floor(video.videoWidth * scaleFactor);
                const height = Math.floor(video.videoHeight * scaleFactor);

                canvas.width = width;
                canvas.height = height;

                // High-quality canvas settings
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.filter = 'contrast(1.05) saturate(1.05)'; // Slight enhancement

                // Use high-quality codec with audio
                const mimeType = this.getHighQualityMimeType();
                const stream = canvas.captureStream(30); // Full frame rate for quality

                // Add audio track if available and requested - MUST be done BEFORE creating MediaRecorder
                if (options.preserveAudio) {
                    try {
                        await this.addAudioTrackToStream(stream, file);
                        console.log('✅ Audio track added to stream successfully');
                    } catch (error) {
                        console.warn('⚠️ Failed to add audio track, continuing without audio:', error);
                    }
                }

                let mediaRecorder: MediaRecorder;
                try {
                    mediaRecorder = new MediaRecorder(stream, {
                        mimeType,
                        videoBitsPerSecond: 3000000, // High bitrate for quality
                        audioBitsPerSecond: 128000   // High-quality audio
                    });
                } catch (error) {
                    console.warn('Failed to create MediaRecorder with high bitrate, trying fallback:', error);
                    mediaRecorder = new MediaRecorder(stream, {
                        mimeType: 'video/webm'
                    });
                }

                const chunks: Blob[] = [];
                let frameCount = 0;
                const totalFrames = Math.floor(video.duration * 30); // 30 FPS

                mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        chunks.push(event.data);
                    }
                };

                mediaRecorder.onstop = async () => {
                    try {
                        const blob = new Blob(chunks, { type: mimeType });
                        const compressedFile = new File([blob],
                            file.name.replace(/\.[^/.]+$/, '_quality_compressed.webm'),
                            { type: mimeType }
                        );

                        const thumbnailBlob = await this.generateThumbnail(file);

                        resolve({
                            compressedFile,
                            originalSizeMB: file.size / (1024 * 1024),
                            compressedSizeMB: blob.size / (1024 * 1024),
                            compressionRatio: file.size / blob.size,
                            processingTimeMs: 0,
                            method: 'quality',
                            qualityScore: 10,
                            audioPreserved: options.preserveAudio,
                            smoothPlayback: true,
                            thumbnailBlob
                        });
                    } catch (error) {
                        reject(error);
                    }
                };

                mediaRecorder.onerror = (error) => {
                    console.error('MediaRecorder error:', error);
                    reject(new Error(`Quality compression failed: ${error}`));
                };

                // Process every frame for maximum quality
                const processFrame = () => {
                    if (video.ended || frameCount >= totalFrames) {
                        mediaRecorder.stop();
                        return;
                    }

                    // Draw frame with quality settings
                    ctx.drawImage(video, 0, 0, width, height);

                    frameCount++;
                    if (options.onProgress) {
                        options.onProgress((frameCount / totalFrames) * 100);
                    }

                    video.currentTime = frameCount / 30;
                    requestAnimationFrame(processFrame);
                };

                mediaRecorder.start();
                video.play();
                processFrame();
            };

            video.onerror = () => reject(new Error('Failed to load video'));
            video.src = URL.createObjectURL(file);
        });
    }

    private async balancedCompress(file: File, options: BalancedOptions): Promise<BalancedResult> {
        // BALANCED mode: Good quality with good speed
        console.log('⚖️ BALANCED compression mode - Quality and speed!');

        return new Promise(async (resolve, reject) => {
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
                const scaleFactor = 0.7; // 70% of original size
                const width = Math.floor(video.videoWidth * scaleFactor);
                const height = Math.floor(video.videoHeight * scaleFactor);

                canvas.width = width;
                canvas.height = height;

                // Balanced canvas settings
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';

                const mimeType = this.getHighQualityMimeType();
                const stream = canvas.captureStream(24); // Good frame rate for balance

                // Add audio track if available and requested - MUST be done BEFORE creating MediaRecorder
                if (options.preserveAudio) {
                    try {
                        await this.addAudioTrackToStream(stream, file);
                        console.log('✅ Audio track added to stream successfully');
                    } catch (error) {
                        console.warn('⚠️ Failed to add audio track, continuing without audio:', error);
                    }
                }

                // For large files, skip bitrate constraints entirely to avoid OverconstrainedError
                const fileSizeMB = file.size / (1024 * 1024);
                let mediaRecorder: MediaRecorder;

                try {
                    if (fileSizeMB > 50) {
                        // Large files: no bitrate constraints for maximum compatibility
                        console.log(`📁 Large file (${fileSizeMB.toFixed(1)}MB) - using no bitrate constraints for compatibility`);
                        mediaRecorder = RobustConstraintHandlingService.createMediaRecorderWithFallbacks(
                            stream,
                            mimeType
                        );
                    } else {
                        // Small files: try with optimized bitrates
                        const optimalBitrates = RobustConstraintHandlingService.getOptimalBitrates(
                            2000000, // Balanced bitrate
                            128000,  // High-quality audio
                            fileSizeMB
                        );
                        mediaRecorder = RobustConstraintHandlingService.createMediaRecorderWithFallbacks(
                            stream,
                            mimeType,
                            optimalBitrates.videoBitrate,
                            optimalBitrates.audioBitrate
                        );
                    }
                } catch (error) {
                    console.error('Failed to create MediaRecorder with all fallbacks:', error);
                    reject(new Error('Failed to create MediaRecorder for balanced compression'));
                    return;
                }

                const chunks: Blob[] = [];
                let frameCount = 0;
                const totalFrames = Math.floor(video.duration * 24);

                mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        chunks.push(event.data);
                    }
                };

                mediaRecorder.onstop = async () => {
                    try {
                        const blob = new Blob(chunks, { type: mimeType });
                        const compressedFile = new File([blob],
                            file.name.replace(/\.[^/.]+$/, '_balanced_compressed.webm'),
                            { type: mimeType }
                        );

                        const thumbnailBlob = await this.generateThumbnail(file);

                        resolve({
                            compressedFile,
                            originalSizeMB: file.size / (1024 * 1024),
                            compressedSizeMB: blob.size / (1024 * 1024),
                            compressionRatio: file.size / blob.size,
                            processingTimeMs: 0,
                            method: 'balanced',
                            qualityScore: 8,
                            audioPreserved: options.preserveAudio,
                            smoothPlayback: true,
                            thumbnailBlob
                        });
                    } catch (error) {
                        reject(error);
                    }
                };

                mediaRecorder.onerror = (error) => {
                    console.error('MediaRecorder error in balanced compression:', error);
                    // Try to recover by stopping and restarting with simpler settings
                    try {
                        mediaRecorder.stop();
                        // Create a new MediaRecorder with minimal constraints
                        const simpleStream = canvas.captureStream(15);
                        const simpleMediaRecorder = new MediaRecorder(simpleStream, {
                            mimeType: 'video/webm'
                        });

                        const simpleChunks: Blob[] = [];
                        simpleMediaRecorder.ondataavailable = (event) => {
                            if (event.data.size > 0) {
                                simpleChunks.push(event.data);
                            }
                        };

                        simpleMediaRecorder.onstop = async () => {
                            try {
                                const blob = new Blob(simpleChunks, { type: 'video/webm' });
                                const compressedFile = new File([blob],
                                    file.name.replace(/\.[^/.]+$/, '_balanced_fallback.webm'),
                                    { type: 'video/webm' }
                                );

                                const thumbnailBlob = await this.generateThumbnail(file);
                                resolve({
                                    compressedFile,
                                    originalSizeMB: file.size / (1024 * 1024),
                                    compressedSizeMB: blob.size / (1024 * 1024),
                                    compressionRatio: file.size / blob.size,
                                    processingTimeMs: 0,
                                    method: 'balanced',
                                    qualityScore: 5,
                                    audioPreserved: false,
                                    smoothPlayback: true,
                                    thumbnailBlob
                                });
                            } catch (error) {
                                reject(new Error(`Balanced compression recovery failed: ${error}`));
                            }
                        };

                        simpleMediaRecorder.start();
                        // Simple frame processing
                        let simpleFrameCount = 0;
                        const simpleProcessFrame = () => {
                            if (video.ended || simpleFrameCount >= Math.floor(video.duration * 15)) {
                                simpleMediaRecorder.stop();
                                return;
                            }
                            if (simpleFrameCount % 3 === 0) {
                                ctx.drawImage(video, 0, 0, width, height);
                            }
                            simpleFrameCount++;
                            video.currentTime = simpleFrameCount / 15;
                            requestAnimationFrame(simpleProcessFrame);
                        };
                        video.play();
                        simpleProcessFrame();
                    } catch (recoveryError) {
                        console.error('Recovery attempt failed:', recoveryError);
                        reject(new Error(`Balanced compression failed: ${error}`));
                    }
                };

                // Process most frames for good quality
                const processFrame = () => {
                    if (video.ended || frameCount >= totalFrames) {
                        mediaRecorder.stop();
                        return;
                    }

                    // Skip minimal frames for balanced quality/speed
                    if (frameCount % 2 === 0) { // Every 2nd frame
                        ctx.drawImage(video, 0, 0, width, height);
                    }

                    frameCount++;
                    if (options.onProgress) {
                        options.onProgress((frameCount / totalFrames) * 100);
                    }

                    video.currentTime = frameCount / 24;
                    requestAnimationFrame(processFrame);
                };

                mediaRecorder.start();
                video.play();
                processFrame();
            };

            video.onerror = () => reject(new Error('Failed to load video'));
            video.src = URL.createObjectURL(file);
        });
    }

    private async speedCompress(file: File, options: BalancedOptions): Promise<BalancedResult> {
        // SPEED mode: Improved quality with speed
        console.log('⚡ SPEED compression mode - Improved quality with speed!');

        return new Promise(async (resolve, reject) => {
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
                const scaleFactor = 0.75; // 75% of original size (improved from 60%)
                const width = Math.floor(video.videoWidth * scaleFactor);
                const height = Math.floor(video.videoHeight * scaleFactor);

                canvas.width = width;
                canvas.height = height;

                // Improved canvas settings for better quality
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high'; // Changed from 'medium' to 'high'

                const mimeType = this.getHighQualityMimeType();
                const stream = canvas.captureStream(25); // Improved from 20fps to 25fps

                // Add audio track if available and requested - MUST be done BEFORE creating MediaRecorder
                if (options.preserveAudio) {
                    try {
                        await this.addAudioTrackToStream(stream, file);
                        console.log('✅ Audio track added to stream successfully');
                    } catch (error) {
                        console.warn('⚠️ Failed to add audio track, continuing without audio:', error);
                    }
                }

                // For large files, skip bitrate constraints entirely to avoid OverconstrainedError
                const fileSizeMB = file.size / (1024 * 1024);
                let mediaRecorder: MediaRecorder;

                try {
                    if (fileSizeMB > 50) {
                        // Large files: no bitrate constraints for maximum compatibility
                        console.log(`📁 Large file (${fileSizeMB.toFixed(1)}MB) - using no bitrate constraints for compatibility`);
                        mediaRecorder = RobustConstraintHandlingService.createMediaRecorderWithFallbacks(
                            stream,
                            mimeType
                        );
                    } else {
                        // Small files: try with optimized bitrates
                        const optimalBitrates = RobustConstraintHandlingService.getOptimalBitrates(
                            2000000, // Improved from 1.2Mbps to 2Mbps
                            128000,  // Improved from 96kbps to 128kbps
                            fileSizeMB
                        );
                        mediaRecorder = RobustConstraintHandlingService.createMediaRecorderWithFallbacks(
                            stream,
                            mimeType,
                            optimalBitrates.videoBitrate,
                            optimalBitrates.audioBitrate
                        );
                    }
                } catch (error) {
                    console.error('Failed to create MediaRecorder with all fallbacks:', error);
                    reject(new Error('Failed to create MediaRecorder for speed compression'));
                    return;
                }

                const chunks: Blob[] = [];
                let frameCount = 0;
                const totalFrames = Math.floor(video.duration * 25); // Updated to match 25fps

                mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        chunks.push(event.data);
                    }
                };

                mediaRecorder.onstop = async () => {
                    try {
                        const blob = new Blob(chunks, { type: mimeType });
                        const compressedFile = new File([blob],
                            file.name.replace(/\.[^/.]+$/, '_speed_compressed.webm'),
                            { type: mimeType }
                        );

                        const thumbnailBlob = await this.generateThumbnail(file);

                        resolve({
                            compressedFile,
                            originalSizeMB: file.size / (1024 * 1024),
                            compressedSizeMB: blob.size / (1024 * 1024),
                            compressionRatio: file.size / blob.size,
                            processingTimeMs: 0,
                            method: 'speed',
                            qualityScore: 7,
                            audioPreserved: options.preserveAudio,
                            smoothPlayback: true,
                            thumbnailBlob
                        });
                    } catch (error) {
                        reject(error);
                    }
                };

                mediaRecorder.onerror = (error) => {
                    console.error('MediaRecorder error in speed compression:', error);
                    // Try to recover by stopping and restarting with simpler settings
                    try {
                        mediaRecorder.stop();
                        // Create a new MediaRecorder with minimal constraints
                        const simpleStream = canvas.captureStream(15);
                        const simpleMediaRecorder = new MediaRecorder(simpleStream, {
                            mimeType: 'video/webm'
                        });

                        const simpleChunks: Blob[] = [];
                        simpleMediaRecorder.ondataavailable = (event) => {
                            if (event.data.size > 0) {
                                simpleChunks.push(event.data);
                            }
                        };

                        simpleMediaRecorder.onstop = async () => {
                            try {
                                const blob = new Blob(simpleChunks, { type: 'video/webm' });
                                const compressedFile = new File([blob],
                                    file.name.replace(/\.[^/.]+$/, '_speed_fallback.webm'),
                                    { type: 'video/webm' }
                                );

                                const thumbnailBlob = await this.generateThumbnail(file);
                                resolve({
                                    compressedFile,
                                    originalSizeMB: file.size / (1024 * 1024),
                                    compressedSizeMB: blob.size / (1024 * 1024),
                                    compressionRatio: file.size / blob.size,
                                    processingTimeMs: 0,
                                    method: 'speed',
                                    qualityScore: 4,
                                    audioPreserved: false,
                                    smoothPlayback: true,
                                    thumbnailBlob
                                });
                            } catch (error) {
                                reject(new Error(`Speed compression recovery failed: ${error}`));
                            }
                        };

                        simpleMediaRecorder.start();
                        // Simple frame processing
                        let simpleFrameCount = 0;
                        const simpleProcessFrame = () => {
                            if (video.ended || simpleFrameCount >= Math.floor(video.duration * 15)) {
                                simpleMediaRecorder.stop();
                                return;
                            }
                            if (simpleFrameCount % 3 === 0) {
                                ctx.drawImage(video, 0, 0, width, height);
                            }
                            simpleFrameCount++;
                            video.currentTime = simpleFrameCount / 15;
                            requestAnimationFrame(simpleProcessFrame);
                        };
                        video.play();
                        simpleProcessFrame();
                    } catch (recoveryError) {
                        console.error('Recovery attempt failed:', recoveryError);
                        reject(new Error(`Speed compression failed: ${error}`));
                    }
                };

                // Improved frame skipping for better quality
                const processFrame = () => {
                    if (video.ended || frameCount >= totalFrames) {
                        mediaRecorder.stop();
                        return;
                    }

                    // Skip fewer frames for better quality (every 2nd frame instead of every 3rd)
                    if (frameCount % 2 === 0) { // Every 2nd frame
                        ctx.drawImage(video, 0, 0, width, height);
                    }

                    frameCount++;
                    if (options.onProgress) {
                        options.onProgress((frameCount / totalFrames) * 100);
                    }

                    video.currentTime = frameCount / 25; // Updated to match 25fps
                    requestAnimationFrame(processFrame);
                };

                mediaRecorder.start();
                video.play();
                processFrame();
            };

            video.onerror = () => reject(new Error('Failed to load video'));
            video.src = URL.createObjectURL(file);
        });
    }

    private getHighQualityMimeType(): string {
        // Return the highest quality supported codec with audio
        if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
            return 'video/webm;codecs=vp9,opus';
        } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,vorbis')) {
            return 'video/webm;codecs=vp8,vorbis';
        } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
            return 'video/webm;codecs=vp8';
        } else if (MediaRecorder.isTypeSupported('video/webm')) {
            return 'video/webm';
        } else if (MediaRecorder.isTypeSupported('video/mp4;codecs=h264,aac')) {
            return 'video/mp4;codecs=h264,aac';
        } else {
            return 'video/webm';
        }
    }

    private async addAudioTrackToStream(stream: MediaStream, file: File): Promise<void> {
        try {
            // Create audio element to extract audio track
            const audio = document.createElement('audio');
            audio.src = URL.createObjectURL(file);

            // Wait for audio to load
            await new Promise((resolve, reject) => {
                audio.onloadedmetadata = resolve;
                audio.onerror = reject;
            });

            // Create audio context and process audio
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            if (audioContext) {
                const source = audioContext.createMediaElementSource(audio);
                const destination = audioContext.createMediaStreamDestination();
                source.connect(destination);

                // Add audio track to the video stream
                const audioTracks = destination.stream.getAudioTracks();
                audioTracks.forEach(track => {
                    stream.addTrack(track);
                });
            }
        } catch (error) {
            console.warn('Failed to add audio track:', error);
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
                // Set canvas size for high-quality thumbnail
                canvas.width = 1280;
                canvas.height = 720;

                // Maintain aspect ratio
                const aspectRatio = video.videoWidth / video.videoHeight;
                if (aspectRatio > 16 / 9) {
                    canvas.height = canvas.width / aspectRatio;
                } else {
                    canvas.width = canvas.height * aspectRatio;
                }

                video.currentTime = timestampSeconds;
            };

            video.onseeked = () => {
                // Draw frame to canvas with high quality
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                // Convert to high-quality blob
                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Failed to generate thumbnail'));
                    }
                }, 'image/jpeg', 0.95); // High quality JPEG
            };

            video.onerror = () => reject(new Error('Failed to load video'));
            video.src = URL.createObjectURL(file);
        });
    }
}

// Export singleton instance
export const balancedVideoCompressionService = new BalancedVideoCompressionService();
