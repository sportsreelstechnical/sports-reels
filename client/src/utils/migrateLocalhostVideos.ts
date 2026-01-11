import { supabase } from '@/integrations/supabase/client';

/**
 * Migration utility to identify and help fix videos with localhost URLs
 */
export class LocalhostVideoMigration {

    /**
     * Find all videos with localhost URLs
     */
    static async findLocalhostVideos() {
        try {
            const { data, error } = await supabase
                .from('videos')
                .select('id, title, video_url, thumbnail_url, created_at')
                .or('video_url.like.localhost:*,thumbnail_url.like.localhost:*');

            if (error) throw error;

            return {
                success: true,
                videos: data || [],
                count: data?.length || 0
            };
        } catch (error) {
            console.error('Error finding localhost videos:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                videos: [],
                count: 0
            };
        }
    }

    /**
     * Mark videos with localhost URLs as needing re-upload
     */
    static async markVideosForReupload(videoIds: string[]) {
        try {
            const { error } = await supabase
                .from('videos')
                .update({
                    ai_analysis_status: 'failed',
                    // Add a custom field to mark for re-upload
                    description: 'This video needs to be re-uploaded due to invalid localhost URL'
                })
                .in('id', videoIds);

            if (error) throw error;

            return {
                success: true,
                updatedCount: videoIds.length
            };
        } catch (error) {
            console.error('Error marking videos for re-upload:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                updatedCount: 0
            };
        }
    }

    /**
     * Get migration report
     */
    static async getMigrationReport() {
        const result = await this.findLocalhostVideos();

        if (!result.success) {
            return result;
        }

        const localhostVideos = result.videos.filter(video =>
            video.video_url?.includes('localhost') || video.thumbnail_url?.includes('localhost')
        );

        return {
            success: true,
            totalVideos: result.count,
            localhostVideos: localhostVideos,
            localhostCount: localhostVideos.length,
            needsReupload: localhostVideos.length > 0
        };
    }

    /**
     * Check if a URL is a localhost URL
     */
    static isLocalhostUrl(url: string): boolean {
        return url.includes('localhost') || url.includes('127.0.0.1') || url.includes('::1');
    }

    /**
     * Get user-friendly migration instructions
     */
    static getMigrationInstructions() {
        return {
            title: "Video URL Migration Required",
            description: "Some of your videos were uploaded during development and are no longer accessible. These videos need to be re-uploaded.",
            steps: [
                "1. Identify videos marked with 'Invalid URL' badges",
                "2. Download the original video files if you have them",
                "3. Delete the old videos with invalid URLs",
                "4. Re-upload the videos using the upload form",
                "5. The new videos will use proper signed URLs and work correctly"
            ],
            benefits: [
                "Videos will be accessible from anywhere",
                "Better security with signed URLs",
                "Improved performance and reliability",
                "AI analysis will work properly"
            ]
        };
    }
}

export default LocalhostVideoMigration;
