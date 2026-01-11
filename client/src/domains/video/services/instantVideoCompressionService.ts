// Instant Video Compression Service
// For ALL video sizes - from 1MB to multiple GBs - SUPER FAST!

export interface InstantOptions {
    targetSizeMB: number;
    speed: 'instant' | 'flash' | 'turbo' | 'lightning' | 'extreme' | 'ultra';
    quality: 'preview' | 'fast' | 'balanced' | 'high';
    onProgress?: (progress: number) => void;
}

export interface InstantResult {
    compressedFile: File;
    originalSizeMB: number;
    compressedSizeMB: number;
    compressionRatio: number;
    processingTimeMs: number;
    method: 'instant' | 'flash' | 'turbo' | 'lightning' | 'extreme' | 'ultra';
    speedImprovement: number;
    thumbnailBlob?: Blob;
}

export class InstantVideoCompressionService {
    private compressionCache = new Map<string, Blob>();

    async compressVideo(
        file: File,
        options: InstantOptions = {
            targetSizeMB: 10,
            speed: 'instant',
            quality: 'fast'
        }
    ): Promise<InstantResult> {
        const startTime = performance.now();
        const originalSizeMB = file.size / (1024 * 1024);

        console.log(`⚡ INSTANT compression starting: ${file.name}`);
        console.log(`📊 Original size: ${originalSizeMB.toFixed(2)}MB`);
        console.log(`🚀 Speed mode: ${options.speed}`);

        // If file is already small enough, return as is
        if (originalSizeMB <= options.targetSizeMB) {
            return {
                compressedFile: file,
                originalSizeMB,
                compressedSizeMB: originalSizeMB,
                compressionRatio: 1,
                processingTimeMs: 0,
                method: 'instant',
                speedImprovement: 1,
                thumbnailBlob: await this.generateThumbnail(file)
            };
        }

        let result: InstantResult;

        try {
            // Choose compression method based on file size for MAXIMUM speed
            if (originalSizeMB <= 1) {
                // Tiny files (1MB or less) - INSTANT compression
                result = await this.instantCompress(file, options);
            } else if (originalSizeMB <= 5) {
                // Small files (1-5MB) - FLASH compression
                result = await this.flashCompress(file, options);
            } else if (originalSizeMB <= 25) {
                // Medium files (5-25MB) - TURBO compression
                result = await this.turboCompress(file, options);
            } else if (originalSizeMB <= 100) {
                // Large files (25-100MB) - LIGHTNING compression
                result = await this.lightningCompress(file, options);
            } else if (originalSizeMB <= 500) {
                // Very large files (100-500MB) - EXTREME compression
                result = await this.extremeCompress(file, options);
            } else {
                // Massive files (500MB+) - ULTRA compression
                result = await this.ultraCompress(file, options);
            }
        } catch (error) {
            console.error('Instant compression failed:', error);
            throw new Error('Instant compression failed. Please try a different approach.');
        }

        const processingTime = performance.now() - startTime;
        result.processingTimeMs = processingTime;
        result.speedImprovement = this.calculateSpeedImprovement(originalSizeMB, processingTime);

        console.log(`⚡ INSTANT compression completed in ${processingTime.toFixed(0)}ms`);
        console.log(`📉 Size reduction: ${((1 - result.compressionRatio) * 100).toFixed(1)}%`);
        console.log(`🚀 Speed improvement: ${result.speedImprovement.toFixed(0)}x faster than FFmpeg`);

        return result;
    }

    private async instantCompress(file: File, options: InstantOptions): Promise<InstantResult> {
        // INSTANT mode: For files 1MB or less - MAXIMUM speed
        console.log('⚡ INSTANT compression mode - MAXIMUM SPEED!');

        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d', {
                willReadFrequently: false,
                alpha: false
            });

            if (!ctx) {
                reject(new Error('Canvas context not available'));
                return;
            }

            video.onloadedmetadata = () => {
                // Ultra-aggressive size reduction for instant speed
                const scaleFactor = 0.25; // 25% of original size
                const width = Math.floor(video.videoWidth * scaleFactor);
                const height = Math.floor(video.videoHeight * scaleFactor);

                canvas.width = width;
                canvas.height = height;

                // Ultra-fast canvas settings
                ctx.imageSmoothingEnabled = false;
                ctx.imageSmoothingQuality = 'low';

                // Use the fastest supported codec
                const mimeType = this.getFastestMimeType();
                const stream = canvas.captureStream(10); // Very low frame rate for speed

                const mediaRecorder = new MediaRecorder(stream, {
                    mimeType,
                    videoBitsPerSecond: 100000 // Ultra-low bitrate for maximum compression
                });

                const chunks: Blob[] = [];
                let frameCount = 0;
                const totalFrames = Math.floor(video.duration * 10); // 10 FPS

                mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        chunks.push(event.data);
                    }
                };

                mediaRecorder.onstop = async () => {
                    try {
                        const blob = new Blob(chunks, { type: mimeType });
                        const compressedFile = new File([blob],
                            file.name.replace(/\.[^/.]+$/, '_instant_compressed.webm'),
                            { type: mimeType }
                        );

                        // Generate thumbnail
                        const thumbnailBlob = await this.generateThumbnail(file);

                        resolve({
                            compressedFile,
                            originalSizeMB: file.size / (1024 * 1024),
                            compressedSizeMB: blob.size / (1024 * 1024),
                            compressionRatio: file.size / blob.size,
                            processingTimeMs: 0,
                            method: 'instant',
                            speedImprovement: 0,
                            thumbnailBlob
                        });
                    } catch (error) {
                        reject(error);
                    }
                };

                mediaRecorder.onerror = () => reject(new Error('Instant compression failed'));

                // Ultra-fast frame processing with maximum frame skipping
                const processFrame = () => {
                    if (video.ended || frameCount >= totalFrames) {
                        mediaRecorder.stop();
                        return;
                    }

                    // Skip frames aggressively for maximum speed
                    if (frameCount % 5 === 0) { // Every 5th frame
                        ctx.drawImage(video, 0, 0, width, height);
                    }

                    frameCount++;
                    if (options.onProgress) {
                        options.onProgress((frameCount / totalFrames) * 100);
                    }

                    video.currentTime = frameCount / 10;
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

    private async flashCompress(file: File, options: InstantOptions): Promise<InstantResult> {
        // FLASH mode: For files 1-5MB - EXTREME speed
        console.log('⚡ FLASH compression mode - EXTREME SPEED!');

        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d', {
                willReadFrequently: false,
                alpha: false
            });

            if (!ctx) {
                reject(new Error('Canvas context not available'));
                return;
            }

            video.onloadedmetadata = () => {
                const scaleFactor = 0.3; // 30% of original size
                const width = Math.floor(video.videoWidth * scaleFactor);
                const height = Math.floor(video.videoHeight * scaleFactor);

                canvas.width = width;
                canvas.height = height;

                ctx.imageSmoothingEnabled = false;
                ctx.imageSmoothingQuality = 'low';

                const mimeType = this.getFastestMimeType();
                const stream = canvas.captureStream(12); // 12 FPS

                const mediaRecorder = new MediaRecorder(stream, {
                    mimeType,
                    videoBitsPerSecond: 200000 // Low bitrate
                });

                const chunks: Blob[] = [];
                let frameCount = 0;
                const totalFrames = Math.floor(video.duration * 12);

                mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        chunks.push(event.data);
                    }
                };

                mediaRecorder.onstop = async () => {
                    try {
                        const blob = new Blob(chunks, { type: mimeType });
                        const compressedFile = new File([blob],
                            file.name.replace(/\.[^/.]+$/, '_flash_compressed.webm'),
                            { type: mimeType }
                        );

                        const thumbnailBlob = await this.generateThumbnail(file);

                        resolve({
                            compressedFile,
                            originalSizeMB: file.size / (1024 * 1024),
                            compressedSizeMB: blob.size / (1024 * 1024),
                            compressionRatio: file.size / blob.size,
                            processingTimeMs: 0,
                            method: 'flash',
                            speedImprovement: 0,
                            thumbnailBlob
                        });
                    } catch (error) {
                        reject(error);
                    }
                };

                mediaRecorder.onerror = () => reject(new Error('Flash compression failed'));

                const processFrame = () => {
                    if (video.ended || frameCount >= totalFrames) {
                        mediaRecorder.stop();
                        return;
                    }

                    if (frameCount % 4 === 0) { // Every 4th frame
                        ctx.drawImage(video, 0, 0, width, height);
                    }

                    frameCount++;
                    if (options.onProgress) {
                        options.onProgress((frameCount / totalFrames) * 100);
                    }

                    video.currentTime = frameCount / 12;
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

    private async turboCompress(file: File, options: InstantOptions): Promise<InstantResult> {
        // TURBO mode: For files 5-25MB - HIGH speed
        console.log('⚡ TURBO compression mode - HIGH SPEED!');

        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d', {
                willReadFrequently: false,
                alpha: false
            });

            if (!ctx) {
                reject(new Error('Canvas context not available'));
                return;
            }

            video.onloadedmetadata = () => {
                const scaleFactor = 0.4; // 40% of original size
                const width = Math.floor(video.videoWidth * scaleFactor);
                const height = Math.floor(video.videoHeight * scaleFactor);

                canvas.width = width;
                canvas.height = height;

                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'low';

                const mimeType = this.getFastestMimeType();
                const stream = canvas.captureStream(15); // 15 FPS

                const mediaRecorder = new MediaRecorder(stream, {
                    mimeType,
                    videoBitsPerSecond: 400000
                });

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
                            file.name.replace(/\.[^/.]+$/, '_turbo_compressed.webm'),
                            { type: mimeType }
                        );

                        const thumbnailBlob = await this.generateThumbnail(file);

                        resolve({
                            compressedFile,
                            originalSizeMB: file.size / (1024 * 1024),
                            compressedSizeMB: blob.size / (1024 * 1024),
                            compressionRatio: file.size / blob.size,
                            processingTimeMs: 0,
                            method: 'turbo',
                            speedImprovement: 0,
                            thumbnailBlob
                        });
                    } catch (error) {
                        reject(error);
                    }
                };

                mediaRecorder.onerror = () => reject(new Error('Turbo compression failed'));

                const processFrame = () => {
                    if (video.ended || frameCount >= totalFrames) {
                        mediaRecorder.stop();
                        return;
                    }

                    if (frameCount % 3 === 0) { // Every 3rd frame
                        ctx.drawImage(video, 0, 0, width, height);
                    }

                    frameCount++;
                    if (options.onProgress) {
                        options.onProgress((frameCount / totalFrames) * 100);
                    }

                    video.currentTime = frameCount / 15;
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

    private async lightningCompress(file: File, options: InstantOptions): Promise<InstantResult> {
        // LIGHTNING mode: For files 25-100MB - VERY HIGH speed
        console.log('⚡ LIGHTNING compression mode - VERY HIGH SPEED!');

        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d', {
                willReadFrequently: false,
                alpha: false
            });

            if (!ctx) {
                reject(new Error('Canvas context not available'));
                return;
            }

            video.onloadedmetadata = () => {
                const scaleFactor = 0.5; // 50% of original size
                const width = Math.floor(video.videoWidth * scaleFactor);
                const height = Math.floor(video.videoHeight * scaleFactor);

                canvas.width = width;
                canvas.height = height;

                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'medium';

                const mimeType = this.getFastestMimeType();
                const stream = canvas.captureStream(20); // 20 FPS

                const mediaRecorder = new MediaRecorder(stream, {
                    mimeType,
                    videoBitsPerSecond: 600000
                });

                const chunks: Blob[] = [];
                let frameCount = 0;
                const totalFrames = Math.floor(video.duration * 20);

                mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        chunks.push(event.data);
                    }
                };

                mediaRecorder.onstop = async () => {
                    try {
                        const blob = new Blob(chunks, { type: mimeType });
                        const compressedFile = new File([blob],
                            file.name.replace(/\.[^/.]+$/, '_lightning_compressed.webm'),
                            { type: mimeType }
                        );

                        const thumbnailBlob = await this.generateThumbnail(file);

                        resolve({
                            compressedFile,
                            originalSizeMB: file.size / (1024 * 1024),
                            compressedSizeMB: blob.size / (1024 * 1024),
                            compressionRatio: file.size / blob.size,
                            processingTimeMs: 0,
                            method: 'lightning',
                            speedImprovement: 0,
                            thumbnailBlob
                        });
                    } catch (error) {
                        reject(error);
                    }
                };

                mediaRecorder.onerror = () => reject(new Error('Lightning compression failed'));

                const processFrame = () => {
                    if (video.ended || frameCount >= totalFrames) {
                        mediaRecorder.stop();
                        return;
                    }

                    if (frameCount % 2 === 0) { // Every 2nd frame
                        ctx.drawImage(video, 0, 0, width, height);
                    }

                    frameCount++;
                    if (options.onProgress) {
                        options.onProgress((frameCount / totalFrames) * 100);
                    }

                    video.currentTime = frameCount / 20;
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

    private async extremeCompress(file: File, options: InstantOptions): Promise<InstantResult> {
        // EXTREME mode: For files 100-500MB - HIGH speed with quality
        console.log('🔥 EXTREME compression mode - HIGH SPEED WITH QUALITY!');

        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d', {
                willReadFrequently: false,
                alpha: false
            });

            if (!ctx) {
                reject(new Error('Canvas context not available'));
                return;
            }

            video.onloadedmetadata = () => {
                const scaleFactor = 0.6; // 60% of original size
                const width = Math.floor(video.videoWidth * scaleFactor);
                const height = Math.floor(video.videoHeight * scaleFactor);

                canvas.width = width;
                canvas.height = height;

                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';

                const mimeType = this.getFastestMimeType();
                const stream = canvas.captureStream(24); // 24 FPS

                const mediaRecorder = new MediaRecorder(stream, {
                    mimeType,
                    videoBitsPerSecond: 1000000
                });

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
                            file.name.replace(/\.[^/.]+$/, '_extreme_compressed.webm'),
                            { type: mimeType }
                        );

                        const thumbnailBlob = await this.generateThumbnail(file);

                        resolve({
                            compressedFile,
                            originalSizeMB: file.size / (1024 * 1024),
                            compressedSizeMB: blob.size / (1024 * 1024),
                            compressionRatio: file.size / blob.size,
                            processingTimeMs: 0,
                            method: 'extreme',
                            speedImprovement: 0,
                            thumbnailBlob
                        });
                    } catch (error) {
                        reject(error);
                    }
                };

                mediaRecorder.onerror = () => reject(new Error('Extreme compression failed'));

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

    private async ultraCompress(file: File, options: InstantOptions): Promise<InstantResult> {
        // ULTRA mode: For files 500MB+ - MAXIMUM speed with quality
        console.log('🚀 ULTRA compression mode - MAXIMUM SPEED WITH QUALITY!');

        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d', {
                willReadFrequently: false,
                alpha: false
            });

            if (!ctx) {
                reject(new Error('Canvas context not available'));
                return;
            }

            video.onloadedmetadata = () => {
                const scaleFactor = 0.7; // 70% of original size
                const width = Math.floor(video.videoWidth * scaleFactor);
                const height = Math.floor(video.videoHeight * scaleFactor);

                canvas.width = width;
                canvas.height = height;

                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';

                const mimeType = this.getFastestMimeType();
                const stream = canvas.captureStream(30); // 30 FPS

                const mediaRecorder = new MediaRecorder(stream, {
                    mimeType,
                    videoBitsPerSecond: 2000000
                });

                const chunks: Blob[] = [];
                let frameCount = 0;
                const totalFrames = Math.floor(video.duration * 30);

                mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        chunks.push(event.data);
                    }
                };

                mediaRecorder.onstop = async () => {
                    try {
                        const blob = new Blob(chunks, { type: mimeType });
                        const compressedFile = new File([blob],
                            file.name.replace(/\.[^/.]+$/, '_ultra_compressed.webm'),
                            { type: mimeType }
                        );

                        const thumbnailBlob = await this.generateThumbnail(file);

                        resolve({
                            compressedFile,
                            originalSizeMB: file.size / (1024 * 1024),
                            compressedSizeMB: blob.size / (1024 * 1024),
                            compressionRatio: file.size / blob.size,
                            processingTimeMs: 0,
                            method: 'ultra',
                            speedImprovement: 0,
                            thumbnailBlob
                        });
                    } catch (error) {
                        reject(error);
                    }
                };

                mediaRecorder.onerror = () => reject(new Error('Ultra compression failed'));

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

    private getFastestMimeType(): string {
        // Return the fastest supported codec
        if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
            return 'video/webm;codecs=vp8';
        } else if (MediaRecorder.isTypeSupported('video/webm')) {
            return 'video/webm';
        } else if (MediaRecorder.isTypeSupported('video/mp4')) {
            return 'video/mp4';
        } else {
            return 'video/webm';
        }
    }

    private calculateSpeedImprovement(originalSizeMB: number, processingTimeMs: number): number {
        // Estimate FFmpeg processing time (roughly 1MB per second)
        const estimatedFFmpegTime = originalSizeMB * 1000;
        return Math.round(estimatedFFmpegTime / processingTimeMs);
    }

    // Generate thumbnail from video
    async generateThumbnail(file: File, timestampSeconds: number = 5): Promise<Blob> {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                reject(new Error('Canvas context not available'));
                return;
            }

            video.onloadedmetadata = () => {
                // Set canvas size for thumbnail
                canvas.width = 640;
                canvas.height = 360;

                video.currentTime = timestampSeconds;
            };

            video.onseeked = () => {
                // Draw frame to canvas
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                // Convert to blob
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

    // Cleanup
    destroy(): void {
        this.compressionCache.clear();
    }
}

// Export singleton instance
export const instantVideoCompressionService = new InstantVideoCompressionService();
