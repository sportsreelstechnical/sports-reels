-- Ensure agents and teams tables exist with correct structure
DO $$ 
BEGIN
    -- Create sport_type enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sport_type') THEN
        CREATE TYPE sport_type AS ENUM ('football', 'basketball', 'tennis', 'cricket', 'rugby', 'hockey', 'baseball', 'volleyball', 'golf', 'athletics');
    END IF;

    -- Create agents table if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'agents') THEN
        CREATE TABLE public.agents (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
            agency_name TEXT NOT NULL,
            fifa_id TEXT,
            license_number TEXT,
            specialization sport_type[] DEFAULT '{}',
            bio TEXT,
            website TEXT,
            verified BOOLEAN DEFAULT false,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            UNIQUE(profile_id)
        );
    END IF;

    -- Create teams table if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'teams') THEN
        CREATE TABLE public.teams (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
            team_name TEXT NOT NULL,
            country TEXT NOT NULL,
            sport_type sport_type NOT NULL,
            league TEXT,
            division TEXT,
            logo_url TEXT,
            website TEXT,
            verified BOOLEAN DEFAULT false,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            UNIQUE(profile_id)
        );
    END IF;

    -- Add missing columns to agents table if they don't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'agents' AND column_name = 'profile_id') THEN
        ALTER TABLE agents ADD COLUMN profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL;
    END IF;

    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'agents' AND column_name = 'agency_name') THEN
        ALTER TABLE agents ADD COLUMN agency_name TEXT NOT NULL DEFAULT 'Agency';
    END IF;

    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'agents' AND column_name = 'specialization') THEN
        ALTER TABLE agents ADD COLUMN specialization sport_type[] DEFAULT '{}';
    END IF;

    -- Add missing columns to teams table if they don't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'profile_id') THEN
        ALTER TABLE teams ADD COLUMN profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL;
    END IF;

    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'team_name') THEN
        ALTER TABLE teams ADD COLUMN team_name TEXT NOT NULL DEFAULT 'Team';
    END IF;

    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'country') THEN
        ALTER TABLE teams ADD COLUMN country TEXT NOT NULL DEFAULT 'Unknown';
    END IF;

    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'sport_type') THEN
        ALTER TABLE teams ADD COLUMN sport_type sport_type NOT NULL DEFAULT 'football';
    END IF;
END $$;

-- Enable RLS on agents and teams tables
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Agents can view their own data" ON agents;
DROP POLICY IF EXISTS "Teams can view their own data" ON teams;
DROP POLICY IF EXISTS "Agents can update their own data" ON agents;
DROP POLICY IF EXISTS "Teams can update their own data" ON teams;

-- Create RLS policies for agents
CREATE POLICY "Agents can view their own data" ON agents
    FOR SELECT USING (profile_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Agents can update their own data" ON agents
    FOR UPDATE USING (profile_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Create RLS policies for teams
CREATE POLICY "Teams can view their own data" ON teams
    FOR SELECT USING (profile_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Teams can update their own data" ON teams
    FOR UPDATE USING (profile_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_agents_profile_id ON agents(profile_id);
CREATE INDEX IF NOT EXISTS idx_teams_profile_id ON teams(profile_id);
