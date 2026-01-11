
-- Create table for custom player tags
CREATE TABLE IF NOT EXISTS player_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL,
  color TEXT NOT NULL,
  description TEXT,
  is_system_tag BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create table for player tag assignments
CREATE TABLE IF NOT EXISTS player_tag_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES player_tags(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  assigned_by UUID REFERENCES auth.users(id),
  UNIQUE(player_id, tag_id)
);

-- Insert default system tags
INSERT INTO player_tags (id, label, color, description, is_system_tag) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Injured', 'bg-red-500', 'Player is currently injured', true),
  ('00000000-0000-0000-0000-000000000002', 'For Sale', 'bg-green-500', 'Available for transfer', true),
  ('00000000-0000-0000-0000-000000000003', 'On Loan', 'bg-blue-500', 'Player is on loan', true),
  ('00000000-0000-0000-0000-000000000004', 'Youth Prospect', 'bg-purple-500', 'Young promising player', true),
  ('00000000-0000-0000-0000-000000000005', 'Captain', 'bg-yellow-500', 'Team captain', true),
  ('00000000-0000-0000-0000-000000000006', 'Key Player', 'bg-orange-500', 'Important team member', true),
  ('00000000-0000-0000-0000-000000000007', 'Retiring', 'bg-gray-500', 'Planning to retire', true),
  ('00000000-0000-0000-0000-000000000008', 'New Signing', 'bg-pink-500', 'Recently joined the team', true)
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE player_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_tag_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for player_tags
CREATE POLICY "Everyone can view tags" ON player_tags FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create custom tags" ON player_tags FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND is_system_tag = false);
CREATE POLICY "Users can update their own custom tags" ON player_tags FOR UPDATE USING (created_by = auth.uid() AND is_system_tag = false);
CREATE POLICY "Users can delete their own custom tags" ON player_tags FOR DELETE USING (created_by = auth.uid() AND is_system_tag = false);

-- RLS Policies for player_tag_assignments
CREATE POLICY "Team owners can view their player tags" ON player_tag_assignments FOR SELECT USING (
  player_id IN (
    SELECT p.id FROM players p
    JOIN teams t ON p.team_id = t.id
    WHERE t.profile_id = auth.uid()
  )
);
CREATE POLICY "Team owners can assign tags to their players" ON player_tag_assignments FOR INSERT WITH CHECK (
  player_id IN (
    SELECT p.id FROM players p
    JOIN teams t ON p.team_id = t.id
    WHERE t.profile_id = auth.uid()
  )
);
CREATE POLICY "Team owners can update their player tags" ON player_tag_assignments FOR UPDATE USING (
  player_id IN (
    SELECT p.id FROM players p
    JOIN teams t ON p.team_id = t.id
    WHERE t.profile_id = auth.uid()
  )
);
CREATE POLICY "Team owners can remove tags from their players" ON player_tag_assignments FOR DELETE USING (
  player_id IN (
    SELECT p.id FROM players p
    JOIN teams t ON p.team_id = t.id
    WHERE t.profile_id = auth.uid()
  )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_player_tag_assignments_player_id ON player_tag_assignments(player_id);
CREATE INDEX IF NOT EXISTS idx_player_tag_assignments_tag_id ON player_tag_assignments(tag_id);
CREATE INDEX IF NOT EXISTS idx_player_tags_is_system ON player_tags(is_system_tag);
