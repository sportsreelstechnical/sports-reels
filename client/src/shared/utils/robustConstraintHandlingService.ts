export class RobustConstraintHandlingService {
    /**
     * Create MediaRecorder with robust constraint handling
     */
    static createMediaRecorderWithFallbacks(
        stream: MediaStream,
        preferredMimeType: string,
        videoBitrate?: number,
        audioBitrate?: number
    ): MediaRecorder {
        // Strategy 1: Try without any constraints first (most compatible)
        try {
            return new MediaRecorder(stream, {
                mimeType: preferredMimeType
            });
        } catch (error) {
            console.warn('Failed with preferred mime type without constraints, trying fallback codecs:', error);
        }

        // Strategy 2: Try fallback mime types without constraints
        const fallbackMimeTypes = this.getFallbackMimeTypes(preferredMimeType);

        for (const fallbackMimeType of fallbackMimeTypes) {
            try {
                return new MediaRecorder(stream, {
                    mimeType: fallbackMimeType
                });
            } catch (error) {
                console.warn(`Failed with fallback mime type ${fallbackMimeType}:`, error);
            }
        }

        // Strategy 3: Try with even more basic constraints
        const basicMimeTypes = ['video/mp4', 'video/webm'];
        for (const basicMimeType of basicMimeTypes) {
            try {
                return new MediaRecorder(stream, {
                    mimeType: basicMimeType
                });
            } catch (error) {
                console.warn(`Failed with basic mime type ${basicMimeType}:`, error);
            }
        }

        // Strategy 4: Try with video bitrate only (if provided)
        if (videoBitrate) {
            try {
                return new MediaRecorder(stream, {
                    mimeType: preferredMimeType,
                    videoBitsPerSecond: videoBitrate
                });
            } catch (error) {
                console.warn('Failed with video bitrate constraint:', error);
            }
        }

        // Strategy 5: Try with all constraints (if provided)
        if (videoBitrate && audioBitrate) {
            try {
                return new MediaRecorder(stream, {
                    mimeType: preferredMimeType,
                    videoBitsPerSecond: videoBitrate,
                    audioBitsPerSecond: audioBitrate
                });
            } catch (error) {
                console.warn('Failed with full constraints:', error);
            }
        }

        // Strategy 6: Ultimate fallback - no mime type specified
        try {
            return new MediaRecorder(stream);
        } catch (error) {
            throw new Error(`All MediaRecorder creation strategies failed. Last error: ${error}`);
        }
    }

    /**
     * Get fallback mime types based on preferred type
     */
    private static getFallbackMimeTypes(preferredMimeType: string): string[] {
        if (preferredMimeType.includes('mp4')) {
            return [
                'video/mp4;codecs=h264',
                'video/mp4',
                'video/webm;codecs=vp9,opus',
                'video/webm;codecs=vp8,opus',
                'video/webm;codecs=vp9',
                'video/webm;codecs=vp8',
                'video/webm'
            ];
        } else if (preferredMimeType.includes('webm')) {
            return [
                'video/webm;codecs=vp8,opus',
                'video/webm;codecs=vp9',
                'video/webm;codecs=vp8',
                'video/webm',
                'video/mp4;codecs=h264,aac',
                'video/mp4;codecs=h264',
                'video/mp4'
            ];
        } else {
            return [
                'video/mp4;codecs=h264,aac',
                'video/mp4;codecs=h264',
                'video/mp4',
                'video/webm;codecs=vp9,opus',
                'video/webm;codecs=vp8,opus',
                'video/webm;codecs=vp9',
                'video/webm;codecs=vp8',
                'video/webm'
            ];
        }
    }

    /**
     * Get optimal bitrates based on constraints and browser capabilities
     */
    static getOptimalBitrates(
        preferredVideoBitrate: number,
        preferredAudioBitrate: number,
        fileSizeMB: number
    ): { videoBitrate?: number; audioBitrate?: number } {
        // More conservative bitrates to prevent OverconstrainedError
        if (fileSizeMB > 200) {
            return {
                videoBitrate: Math.min(preferredVideoBitrate, 800000), // Max 800kbps for very large files
                audioBitrate: Math.min(preferredAudioBitrate, 64000)   // Max 64kbps for very large files
            };
        } else if (fileSizeMB > 100) {
            return {
                videoBitrate: Math.min(preferredVideoBitrate, 1200000), // Max 1.2Mbps for large files
                audioBitrate: Math.min(preferredAudioBitrate, 80000)    // Max 80kbps for large files
            };
        } else if (fileSizeMB > 50) {
            return {
                videoBitrate: Math.min(preferredVideoBitrate, 1800000), // Max 1.8Mbps for medium files
                audioBitrate: Math.min(preferredAudioBitrate, 96000)    // Max 96kbps for medium files
            };
        } else {
            return {
                videoBitrate: Math.min(preferredVideoBitrate, 2500000), // Max 2.5Mbps for small files
                audioBitrate: Math.min(preferredAudioBitrate, 128000)   // Max 128kbps for small files
            };
        }
    }

    /**
     * Test MediaRecorder support for specific constraints
     */
    static testMediaRecorderSupport(mimeType: string, videoBitrate?: number, audioBitrate?: number): boolean {
        try {
            // Create a dummy stream for testing
            const canvas = document.createElement('canvas');
            canvas.width = 320;
            canvas.height = 240;
            const stream = canvas.captureStream(30);

            const options: MediaRecorderOptions = { mimeType };
            if (videoBitrate) options.videoBitsPerSecond = videoBitrate;
            if (audioBitrate) options.audioBitsPerSecond = audioBitrate;

            new MediaRecorder(stream, options);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get the best supported mime type for a given format preference
     */
    static getBestSupportedMimeType(preferredFormat: 'mp4' | 'webm' | 'auto' = 'auto'): string {
        const testMimeTypes = preferredFormat === 'mp4'
            ? [
                'video/mp4;codecs=h264,aac',
                'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
                'video/mp4;codecs=h264',
                'video/mp4'
            ]
            : preferredFormat === 'webm'
                ? [
                    'video/webm;codecs=vp9,opus',
                    'video/webm;codecs=vp8,opus',
                    'video/webm;codecs=vp9',
                    'video/webm;codecs=vp8',
                    'video/webm'
                ]
                : [
                    'video/webm;codecs=vp9,opus',
                    'video/mp4;codecs=h264,aac',
                    'video/webm;codecs=vp8,opus',
                    'video/mp4;codecs=h264',
                    'video/webm;codecs=vp9',
                    'video/mp4',
                    'video/webm;codecs=vp8',
                    'video/webm'
                ];

        for (const mimeType of testMimeTypes) {
            if (MediaRecorder.isTypeSupported(mimeType)) {
                console.log(`✅ Found supported mime type: ${mimeType}`);
                return mimeType;
            }
        }

        // Ultimate fallback
        console.warn('⚠️ No specific mime type supported, using default WebM');
        return 'video/webm';
    }
}
