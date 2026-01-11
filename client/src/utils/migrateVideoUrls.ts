import { supabase } from '@/integrations/supabase/client';

export const migrateVideoUrls = async () => {
    try {
        console.log('🔄 Starting video URL migration...');

        // Fetch all videos with localhost URLs
        const { data: videos, error: fetchError } = await supabase
            .from('videos')
            .select('id, video_url, thumbnail_url, title')
            .or('video_url.like.http://localhost:%', 'thumbnail_url.like.http://localhost:%');

        if (fetchError) {
            throw fetchError;
        }

        if (!videos || videos.length === 0) {
            console.log('✅ No videos with localhost URLs found');
            return;
        }

        console.log(`🔍 Found ${videos.length} videos with localhost URLs`);

        for (const video of videos) {
            const updates: any = {};

            // Convert localhost video URL to R2 key
            if (video.video_url && video.video_url.startsWith('http://localhost:8082/')) {
                const r2Key = video.video_url.replace('http://localhost:8082/', '');
                updates.video_url = r2Key;
                console.log(`📹 Converting video URL: "${video.video_url}" → "${r2Key}"`);
            }

            // Convert localhost thumbnail URL to R2 key
            if (video.thumbnail_url && video.thumbnail_url.startsWith('http://localhost:8082/')) {
                const r2Key = video.thumbnail_url.replace('http://localhost:8082/', '');
                updates.thumbnail_url = r2Key;
                console.log(`🖼️ Converting thumbnail URL: "${video.thumbnail_url}" → "${r2Key}"`);
            }

            if (Object.keys(updates).length > 0) {
                const { error: updateError } = await supabase
                    .from('videos')
                    .update(updates)
                    .eq('id', video.id);

                if (updateError) {
                    console.error(`❌ Error updating video ${video.id}:`, updateError);
                } else {
                    console.log(`✅ Updated video ${video.id} (${video.title})`);
                }
            }
        }

        console.log('🎉 Video URL migration completed!');
    } catch (error) {
        console.error('❌ Error during migration:', error);
    }
};

// Also migrate public URLs to R2 keys
export const migratePublicUrls = async () => {
    try {
        console.log('🔄 Starting public URL migration...');

        // Fetch all videos with public URLs
        const { data: videos, error: fetchError } = await supabase
            .from('videos')
            .select('id, video_url, thumbnail_url, title')
            .or('video_url.like.https://pub-%', 'thumbnail_url.like.https://pub-%');

        if (fetchError) {
            throw fetchError;
        }

        if (!videos || videos.length === 0) {
            console.log('✅ No videos with public URLs found');
            return;
        }

        console.log(`🔍 Found ${videos.length} videos with public URLs`);

        for (const video of videos) {
            const updates: any = {};

            // Convert public video URL to R2 key
            if (video.video_url && video.video_url.includes('pub-31ad0bcfb7e2c3a8bab2566eeabf1f4c.r2.dev/')) {
                const r2Key = video.video_url.replace('https://pub-31ad0bcfb7e2c3a8bab2566eeabf1f4c.r2.dev/', '');
                updates.video_url = r2Key;
                console.log(`📹 Converting video URL: "${video.video_url}" → "${r2Key}"`);
            }

            // Convert public thumbnail URL to R2 key
            if (video.thumbnail_url && video.thumbnail_url.includes('pub-31ad0bcfb7e2c3a8bab2566eeabf1f4c.r2.dev/')) {
                const r2Key = video.thumbnail_url.replace('https://pub-31ad0bcfb7e2c3a8bab2566eeabf1f4c.r2.dev/', '');
                updates.thumbnail_url = r2Key;
                console.log(`🖼️ Converting thumbnail URL: "${video.thumbnail_url}" → "${r2Key}"`);
            }

            if (Object.keys(updates).length > 0) {
                const { error: updateError } = await supabase
                    .from('videos')
                    .update(updates)
                    .eq('id', video.id);

                if (updateError) {
                    console.error(`❌ Error updating video ${video.id}:`, updateError);
                } else {
                    console.log(`✅ Updated video ${video.id} (${video.title})`);
                }
            }
        }

        console.log('🎉 Public URL migration completed!');
    } catch (error) {
        console.error('❌ Error during migration:', error);
    }
};

// Run both migrations
export const runAllMigrations = async () => {
    await migrateVideoUrls();
    await migratePublicUrls();
};
