import { supabase } from '@/integrations/supabase/client';

export const cleanupVideoUrls = async () => {
    try {
        console.log('🧹 Starting URL cleanup...');

        // Fetch all videos with potential URL issues
        const { data: videos, error: fetchError } = await supabase
            .from('videos')
            .select('id, video_url, thumbnail_url')
            .or('video_url.like.% %', 'thumbnail_url.like.% %'); // Find URLs with spaces

        if (fetchError) {
            throw fetchError;
        }

        if (!videos || videos.length === 0) {
            console.log('✅ No videos with URL issues found');
            return;
        }

        console.log(`🔍 Found ${videos.length} videos with potential URL issues`);

        // Clean up URLs
        for (const video of videos) {
            const updates: any = {};

            if (video.video_url && video.video_url.includes(' ')) {
                updates.video_url = video.video_url.trim();
                console.log(`📹 Cleaning video URL: "${video.video_url}" → "${updates.video_url}"`);
            }

            if (video.thumbnail_url && video.thumbnail_url.includes(' ')) {
                updates.thumbnail_url = video.thumbnail_url.trim();
                console.log(`🖼️ Cleaning thumbnail URL: "${video.thumbnail_url}" → "${updates.thumbnail_url}"`);
            }

            if (Object.keys(updates).length > 0) {
                const { error: updateError } = await supabase
                    .from('videos')
                    .update(updates)
                    .eq('id', video.id);

                if (updateError) {
                    console.error(`❌ Error updating video ${video.id}:`, updateError);
                } else {
                    console.log(`✅ Updated video ${video.id}`);
                }
            }
        }

        console.log('🎉 URL cleanup completed!');
    } catch (error) {
        console.error('❌ Error during URL cleanup:', error);
    }
};

// Export for use in components
export const testVideoUrl = async (url: string) => {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        return {
            accessible: response.ok,
            status: response.status,
            contentType: response.headers.get('content-type'),
        };
    } catch (error) {
        return {
            accessible: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
};

// Test all video URLs in database
export const testAllVideoUrls = async () => {
    try {
        console.log('🧪 Testing all video URLs...');

        const { data: videos, error } = await supabase
            .from('videos')
            .select('id, title, video_url, thumbnail_url')
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) {
            throw error;
        }

        if (!videos || videos.length === 0) {
            console.log('📭 No videos found');
            return;
        }

        console.log(`🔍 Testing ${videos.length} recent videos`);

        for (const video of videos) {
            console.log(`\n📹 Testing: ${video.title}`);

            if (video.video_url) {
                const videoTest = await testVideoUrl(video.video_url);
                console.log(`   Video URL: ${videoTest.accessible ? '✅' : '❌'} ${video.video_url}`);
                if (!videoTest.accessible) {
                    console.log(`   Error: ${videoTest.error || `Status: ${videoTest.status}`}`);
                }
            } else {
                console.log('   Video URL: ❌ Missing');
            }

            if (video.thumbnail_url) {
                const thumbnailTest = await testVideoUrl(video.thumbnail_url);
                console.log(`   Thumbnail: ${thumbnailTest.accessible ? '✅' : '❌'} ${video.thumbnail_url}`);
                if (!thumbnailTest.accessible) {
                    console.log(`   Error: ${thumbnailTest.error || `Status: ${thumbnailTest.status}`}`);
                }
            } else {
                console.log('   Thumbnail: ❌ Missing');
            }
        }

        console.log('\n🎉 URL testing completed!');
    } catch (error) {
        console.error('❌ Error testing URLs:', error);
    }
};
