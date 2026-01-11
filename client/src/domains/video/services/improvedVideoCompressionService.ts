import { balancedVideoCompressionService, type BalancedOptions, type BalancedResult } from './balancedVideoCompressionService';

export interface ImprovedCompressionOptions {
    targetSizeMB: number;
    mode: 'premium' | 'high' | 'balanced' | 'fast';
    preserveAudio: boolean;
    maintainSmoothPlayback: boolean;
    onProgress?: (progress: number) => void;
}

export interface ImprovedCompressionResult {
    compressedFile: File;
    originalSizeMB: number;
    compressedSizeMB: number;
    compressionRatio: number;
    processingTimeMs: number;
    method: 'improved-quality' | 'improved-balanced' | 'improved-speed';
    qualityScore: number;
    audioPreserved: boolean;
    smoothPlayback: boolean;
    thumbnailBlob?: Blob;
}

export class ImprovedVideoCompressionService {
    async compressVideo(
        file: File,
        options: ImprovedCompressionOptions
    ): Promise<ImprovedCompressionResult> {
        const fileSizeMB = file.size / (1024 * 1024);
        console.log(`🎬 Improved compression for ${fileSizeMB.toFixed(2)}MB file`);

        // Determine optimal settings based on file size and mode
        const settings = this.getOptimalSettings(fileSizeMB, options.mode);

        console.log(`⚙️ Compression settings:`, settings);

        // Use the balanced service with improved settings
        const balancedOptions: BalancedOptions = {
            targetSizeMB: settings.targetSizeMB,
            mode: settings.balancedMode,
            preserveAudio: options.preserveAudio,
            maintainSmoothPlayback: options.maintainSmoothPlayback,
            onProgress: options.onProgress
        };

        const result = await balancedVideoCompressionService.compressVideo(file, balancedOptions);

        return {
            ...result,
            method: `improved-${settings.balancedMode}`,
            qualityScore: settings.qualityScore
        };
    }

    private getOptimalSettings(fileSizeMB: number, mode: string) {
        // Premium mode: Maximum quality for important videos
        if (mode === 'premium') {
            return {
                targetSizeMB: Math.min(fileSizeMB * 0.8, 50), // 80% of original, max 50MB
                balancedMode: 'quality' as const,
                qualityScore: 10
            };
        }

        // High mode: High quality for large files
        if (mode === 'high') {
            if (fileSizeMB <= 20) {
                return {
                    targetSizeMB: Math.min(fileSizeMB * 0.7, 15),
                    balancedMode: 'quality' as const,
                    qualityScore: 9
                };
            } else if (fileSizeMB <= 100) {
                return {
                    targetSizeMB: Math.min(fileSizeMB * 0.6, 40),
                    balancedMode: 'balanced' as const,
                    qualityScore: 8
                };
            } else {
                return {
                    targetSizeMB: Math.min(fileSizeMB * 0.5, 60),
                    balancedMode: 'balanced' as const,
                    qualityScore: 7
                };
            }
        }

        // Balanced mode: Good quality with reasonable file size
        if (mode === 'balanced') {
            if (fileSizeMB <= 15) {
                return {
                    targetSizeMB: Math.min(fileSizeMB * 0.6, 12),
                    balancedMode: 'quality' as const,
                    qualityScore: 8
                };
            } else if (fileSizeMB <= 50) {
                return {
                    targetSizeMB: Math.min(fileSizeMB * 0.5, 25),
                    balancedMode: 'balanced' as const,
                    qualityScore: 7
                };
            } else if (fileSizeMB <= 100) {
                return {
                    targetSizeMB: Math.min(fileSizeMB * 0.45, 40),
                    balancedMode: 'balanced' as const,
                    qualityScore: 6
                };
            } else {
                return {
                    targetSizeMB: Math.min(fileSizeMB * 0.4, 60),
                    balancedMode: 'speed' as const,
                    qualityScore: 5
                };
            }
        }

        // Fast mode: Quick compression with acceptable quality
        if (mode === 'fast') {
            if (fileSizeMB <= 20) {
                return {
                    targetSizeMB: Math.min(fileSizeMB * 0.5, 15),
                    balancedMode: 'balanced' as const,
                    qualityScore: 6
                };
            } else if (fileSizeMB <= 100) {
                return {
                    targetSizeMB: Math.min(fileSizeMB * 0.4, 35),
                    balancedMode: 'speed' as const,
                    qualityScore: 5
                };
            } else {
                return {
                    targetSizeMB: Math.min(fileSizeMB * 0.35, 50),
                    balancedMode: 'speed' as const,
                    qualityScore: 4
                };
            }
        }

        // Default fallback
        return {
            targetSizeMB: Math.min(fileSizeMB * 0.5, 30),
            balancedMode: 'balanced' as const,
            qualityScore: 6
        };
    }

    /**
     * Get compression recommendations based on file size
     */
    getCompressionRecommendations(fileSizeMB: number): {
        recommendedMode: string;
        expectedSizeMB: number;
        qualityScore: number;
        description: string;
    }[] {
        const recommendations = [];

        // Premium mode
        recommendations.push({
            recommendedMode: 'premium',
            expectedSizeMB: Math.min(fileSizeMB * 0.8, 50),
            qualityScore: 10,
            description: 'Maximum quality, best for important match footage'
        });

        // High mode
        recommendations.push({
            recommendedMode: 'high',
            expectedSizeMB: Math.min(fileSizeMB * 0.6, 40),
            qualityScore: 8,
            description: 'High quality with good compression'
        });

        // Balanced mode
        recommendations.push({
            recommendedMode: 'balanced',
            expectedSizeMB: Math.min(fileSizeMB * 0.5, 30),
            qualityScore: 7,
            description: 'Good balance of quality and file size'
        });

        // Fast mode
        recommendations.push({
            recommendedMode: 'fast',
            expectedSizeMB: Math.min(fileSizeMB * 0.4, 25),
            qualityScore: 5,
            description: 'Quick compression for sharing'
        });

        return recommendations;
    }
}

export const improvedVideoCompressionService = new ImprovedVideoCompressionService();
