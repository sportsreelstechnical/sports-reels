
-- Timeline Events Table
CREATE TABLE IF NOT EXISTS timeline_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('match', 'transfer', 'player', 'team', 'achievement')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    event_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    is_pinned BOOLEAN DEFAULT false,
    player_id UUID REFERENCES players(id) ON DELETE SET NULL,
    match_id UUID REFERENCES match_videos(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES profiles(id),
    reactions_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0
);

-- Timeline Comments Table  
CREATE TABLE IF NOT EXISTS timeline_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES timeline_events(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES profiles(id),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Timeline Reactions Table
CREATE TABLE IF NOT EXISTS timeline_reactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES timeline_events(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES profiles(id),
    reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'important', 'flag')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, profile_id, reaction_type)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_timeline_events_team_id ON timeline_events(team_id);
CREATE INDEX IF NOT EXISTS idx_timeline_events_event_type ON timeline_events(event_type);
CREATE INDEX IF NOT EXISTS idx_timeline_events_event_date ON timeline_events(event_date);
CREATE INDEX IF NOT EXISTS idx_timeline_events_is_pinned ON timeline_events(is_pinned);
CREATE INDEX IF NOT EXISTS idx_timeline_comments_event_id ON timeline_comments(event_id);
CREATE INDEX IF NOT EXISTS idx_timeline_reactions_event_id ON timeline_reactions(event_id);

-- RLS Policies
ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_reactions ENABLE ROW LEVEL SECURITY;

-- Timeline Events Policies
CREATE POLICY "Team members can view their team events" ON timeline_events
    FOR SELECT USING (
        team_id IN (
            SELECT id FROM teams WHERE profile_id = auth.uid()
        )
    );

CREATE POLICY "Team members can create events" ON timeline_events
    FOR INSERT WITH CHECK (
        team_id IN (
            SELECT id FROM teams WHERE profile_id = auth.uid()
        ) AND created_by = (
            SELECT id FROM profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Team members can update their events" ON timeline_events
    FOR UPDATE USING (
        team_id IN (
            SELECT id FROM teams WHERE profile_id = auth.uid()
        )
    );

CREATE POLICY "Team members can delete their events" ON timeline_events
    FOR DELETE USING (
        team_id IN (
            SELECT id FROM teams WHERE profile_id = auth.uid()
        )
    );

-- Timeline Comments Policies
CREATE POLICY "Team members can view event comments" ON timeline_comments
    FOR SELECT USING (
        event_id IN (
            SELECT id FROM timeline_events WHERE team_id IN (
                SELECT id FROM teams WHERE profile_id = auth.uid()
            )
        )
    );

CREATE POLICY "Team members can create comments" ON timeline_comments
    FOR INSERT WITH CHECK (
        event_id IN (
            SELECT id FROM timeline_events WHERE team_id IN (
                SELECT id FROM teams WHERE profile_id = auth.uid()
            )
        ) AND profile_id = (
            SELECT id FROM profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own comments" ON timeline_comments
    FOR UPDATE USING (
        profile_id = (
            SELECT id FROM profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own comments" ON timeline_comments
    FOR DELETE USING (
        profile_id = (
            SELECT id FROM profiles WHERE user_id = auth.uid()
        )
    );

-- Timeline Reactions Policies
CREATE POLICY "Team members can view event reactions" ON timeline_reactions
    FOR SELECT USING (
        event_id IN (
            SELECT id FROM timeline_events WHERE team_id IN (
                SELECT id FROM teams WHERE profile_id = auth.uid()
            )
        )
    );

CREATE POLICY "Team members can create reactions" ON timeline_reactions
    FOR INSERT WITH CHECK (
        event_id IN (
            SELECT id FROM timeline_events WHERE team_id IN (
                SELECT id FROM teams WHERE profile_id = auth.uid()
            )
        ) AND profile_id = (
            SELECT id FROM profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own reactions" ON timeline_reactions
    FOR UPDATE USING (
        profile_id = (
            SELECT id FROM profiles WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own reactions" ON timeline_reactions
    FOR DELETE USING (
        profile_id = (
            SELECT id FROM profiles WHERE user_id = auth.uid()
        )
    );

-- Function to update comment count
CREATE OR REPLACE FUNCTION update_timeline_comments_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE timeline_events 
        SET comments_count = comments_count + 1,
            updated_at = NOW()
        WHERE id = NEW.event_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE timeline_events 
        SET comments_count = GREATEST(comments_count - 1, 0),
            updated_at = NOW()
        WHERE id = OLD.event_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update reaction count
CREATE OR REPLACE FUNCTION update_timeline_reactions_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE timeline_events 
        SET reactions_count = reactions_count + 1,
            updated_at = NOW()
        WHERE id = NEW.event_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE timeline_events 
        SET reactions_count = GREATEST(reactions_count - 1, 0),
            updated_at = NOW()
        WHERE id = OLD.event_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggers
DROP TRIGGER IF EXISTS timeline_comments_count_trigger ON timeline_comments;
CREATE TRIGGER timeline_comments_count_trigger
    AFTER INSERT OR DELETE ON timeline_comments
    FOR EACH ROW EXECUTE FUNCTION update_timeline_comments_count();

DROP TRIGGER IF EXISTS timeline_reactions_count_trigger ON timeline_reactions;
CREATE TRIGGER timeline_reactions_count_trigger
    AFTER INSERT OR DELETE ON timeline_reactions
    FOR EACH ROW EXECUTE FUNCTION update_timeline_reactions_count();

-- Function to auto-create timeline events for transfers
CREATE OR REPLACE FUNCTION auto_create_transfer_event()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO timeline_events (
            team_id,
            event_type,
            title,
            description,
            event_date,
            player_id,
            created_by
        ) VALUES (
            NEW.team_id,
            'transfer',
            'Transfer Pitch Created',
            'Created transfer pitch for ' || (
                SELECT full_name FROM players WHERE id = NEW.player_id
            ) || ' with asking price of ' || NEW.asking_price || ' ' || NEW.currency,
            CURRENT_DATE,
            NEW.player_id,
            (SELECT profile_id FROM teams WHERE id = NEW.team_id)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-creating transfer events
DROP TRIGGER IF EXISTS auto_transfer_event_trigger ON transfer_pitches;
CREATE TRIGGER auto_transfer_event_trigger
    AFTER INSERT ON transfer_pitches
    FOR EACH ROW EXECUTE FUNCTION auto_create_transfer_event();
