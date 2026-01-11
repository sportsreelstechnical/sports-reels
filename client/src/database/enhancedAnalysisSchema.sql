
-- Enhanced Video Analysis Tables

-- Main analysis results table
CREATE TABLE IF NOT EXISTS enhanced_video_analysis (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
    tagged_player_present BOOLEAN DEFAULT false,
    analysis_status TEXT CHECK (analysis_status IN ('completed', 'partial', 'failed')) DEFAULT 'completed',
    game_context JSONB,
    overall_assessment TEXT,
    recommendations TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Player detections table
CREATE TABLE IF NOT EXISTS player_detections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
    player_id TEXT,
    player_name TEXT,
    bounding_box JSONB, -- {x, y, width, height}
    confidence DECIMAL(3,2),
    timestamp DECIMAL(10,3),
    is_tagged_player BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Player actions table
CREATE TABLE IF NOT EXISTS player_actions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
    player_id TEXT,
    timestamp DECIMAL(10,3),
    action TEXT,
    description TEXT,
    category TEXT CHECK (category IN ('skill', 'tactical', 'physical', 'mental', 'defensive', 'offensive')),
    confidence DECIMAL(3,2),
    metrics JSONB, -- {intensity, accuracy, effectiveness}
    position JSONB, -- {x, y}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance metrics table
CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
    player_id TEXT,
    player_name TEXT,
    is_tagged_player BOOLEAN DEFAULT false,
    metrics_data JSONB, -- All performance metrics
    key_moments JSONB, -- Array of key moments
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_enhanced_analysis_video_id ON enhanced_video_analysis(video_id);
CREATE INDEX IF NOT EXISTS idx_player_detections_video_id ON player_detections(video_id);
CREATE INDEX IF NOT EXISTS idx_player_detections_timestamp ON player_detections(timestamp);
CREATE INDEX IF NOT EXISTS idx_player_actions_video_id ON player_actions(video_id);
CREATE INDEX IF NOT EXISTS idx_player_actions_timestamp ON player_actions(timestamp);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_video_id ON performance_metrics(video_id);

-- RLS policies
ALTER TABLE enhanced_video_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_detections ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;

-- Allow users to access their own video analysis data
CREATE POLICY "Users can view their own enhanced analysis" ON enhanced_video_analysis
    FOR SELECT USING (
        video_id IN (
            SELECT id FROM videos WHERE profile_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own enhanced analysis" ON enhanced_video_analysis
    FOR INSERT WITH CHECK (
        video_id IN (
            SELECT id FROM videos WHERE profile_id = auth.uid()
        )
    );

CREATE POLICY "Users can view their own player detections" ON player_detections
    FOR SELECT USING (
        video_id IN (
            SELECT id FROM videos WHERE profile_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own player detections" ON player_detections
    FOR INSERT WITH CHECK (
        video_id IN (
            SELECT id FROM videos WHERE profile_id = auth.uid()
        )
    );

CREATE POLICY "Users can view their own player actions" ON player_actions
    FOR SELECT USING (
        video_id IN (
            SELECT id FROM videos WHERE profile_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own player actions" ON player_actions
    FOR INSERT WITH CHECK (
        video_id IN (
            SELECT id FROM videos WHERE profile_id = auth.uid()
        )
    );

CREATE POLICY "Users can view their own performance metrics" ON performance_metrics
    FOR SELECT USING (
        video_id IN (
            SELECT id FROM videos WHERE profile_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own performance metrics" ON performance_metrics
    FOR INSERT WITH CHECK (
        video_id IN (
            SELECT id FROM videos WHERE profile_id = auth.uid()
        )
    );
