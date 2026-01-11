
-- Drop existing RLS policies for enhanced_video_analysis table
DROP POLICY IF EXISTS "Users can view their own enhanced analysis" ON enhanced_video_analysis;
DROP POLICY IF EXISTS "Users can insert their own enhanced analysis" ON enhanced_video_analysis;

-- Create updated RLS policies that properly handle the video ownership check
CREATE POLICY "Users can view their own enhanced analysis" ON enhanced_video_analysis
    FOR SELECT USING (
        video_id IN (
            SELECT v.id FROM videos v
            JOIN teams t ON v.team_id = t.id
            JOIN profiles p ON t.profile_id = p.id
            WHERE p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own enhanced analysis" ON enhanced_video_analysis
    FOR INSERT WITH CHECK (
        video_id IN (
            SELECT v.id FROM videos v
            JOIN teams t ON v.team_id = t.id
            JOIN profiles p ON t.profile_id = p.id
            WHERE p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own enhanced analysis" ON enhanced_video_analysis
    FOR UPDATE USING (
        video_id IN (
            SELECT v.id FROM videos v
            JOIN teams t ON v.team_id = t.id
            JOIN profiles p ON t.profile_id = p.id
            WHERE p.user_id = auth.uid()
        )
    )
    WITH CHECK (
        video_id IN (
            SELECT v.id FROM videos v
            JOIN teams t ON v.team_id = t.id
            JOIN profiles p ON t.profile_id = p.id
            WHERE p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own enhanced analysis" ON enhanced_video_analysis
    FOR DELETE USING (
        video_id IN (
            SELECT v.id FROM videos v
            JOIN teams t ON v.team_id = t.id
            JOIN profiles p ON t.profile_id = p.id
            WHERE p.user_id = auth.uid()
        )
    );
