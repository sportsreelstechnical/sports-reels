-- Fix agent_requests table relationships and add missing columns
-- This migration ensures proper foreign key constraints and adds missing columns

-- Step 1: Add missing columns to agent_requests table
DO $$ 
BEGIN
    -- Add agent_id column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'agent_requests' AND column_name = 'agent_id') THEN
        ALTER TABLE agent_requests ADD COLUMN agent_id UUID;
    END IF;

    -- Add position column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'agent_requests' AND column_name = 'position') THEN
        ALTER TABLE agent_requests ADD COLUMN position TEXT;
    END IF;

    -- Add is_public column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'agent_requests' AND column_name = 'is_public') THEN
        ALTER TABLE agent_requests ADD COLUMN is_public BOOLEAN DEFAULT true;
    END IF;

    -- Add expires_at column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'agent_requests' AND column_name = 'expires_at') THEN
        ALTER TABLE agent_requests ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add created_at column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'agent_requests' AND column_name = 'created_at') THEN
        ALTER TABLE agent_requests ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT now();
    END IF;

    -- Add description column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'agent_requests' AND column_name = 'description') THEN
        ALTER TABLE agent_requests ADD COLUMN description TEXT;
    END IF;

    -- Add budget_range column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'agent_requests' AND column_name = 'budget_range') THEN
        ALTER TABLE agent_requests ADD COLUMN budget_range TEXT;
    END IF;

    -- Add sport_type column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'agent_requests' AND column_name = 'sport_type') THEN
        ALTER TABLE agent_requests ADD COLUMN sport_type TEXT DEFAULT 'football';
    END IF;
END $$;

-- Step 2: Add missing columns to agents table
DO $$ 
BEGIN
    -- Add agency_name column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'agents' AND column_name = 'agency_name') THEN
        ALTER TABLE agents ADD COLUMN agency_name TEXT;
    END IF;

    -- Add specialization column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'agents' AND column_name = 'specialization') THEN
        ALTER TABLE agents ADD COLUMN specialization TEXT[] DEFAULT '{}';
    END IF;

    -- Add profile_id column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'agents' AND column_name = 'profile_id') THEN
        ALTER TABLE agents ADD COLUMN profile_id UUID;
    END IF;

    -- Add member_association column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'agents' AND column_name = 'member_association') THEN
        ALTER TABLE agents ADD COLUMN member_association TEXT;
    END IF;

    -- Add year_founded column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'agents' AND column_name = 'year_founded') THEN
        ALTER TABLE agents ADD COLUMN year_founded INTEGER;
    END IF;
END $$;

-- Step 3: Add missing columns to profiles table
DO $$ 
BEGIN
    -- Add full_name column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'full_name') THEN
        ALTER TABLE profiles ADD COLUMN full_name TEXT;
    END IF;

    -- Add user_type column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'user_type') THEN
        ALTER TABLE profiles ADD COLUMN user_type TEXT;
    END IF;
END $$;

-- Step 4: Drop existing foreign key constraints if they exist
ALTER TABLE agent_requests DROP CONSTRAINT IF EXISTS agent_requests_agent_id_fkey;
ALTER TABLE agents DROP CONSTRAINT IF EXISTS agents_profile_id_fkey;

-- Step 5: Create proper foreign key constraints
ALTER TABLE agent_requests 
ADD CONSTRAINT agent_requests_agent_id_fkey 
FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE;

ALTER TABLE agents 
ADD CONSTRAINT agents_profile_id_fkey 
FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Step 6: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_agent_requests_agent_id ON agent_requests(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_requests_position ON agent_requests(position);
CREATE INDEX IF NOT EXISTS idx_agent_requests_is_public ON agent_requests(is_public);
CREATE INDEX IF NOT EXISTS idx_agent_requests_expires_at ON agent_requests(expires_at);
CREATE INDEX IF NOT EXISTS idx_agent_requests_created_at ON agent_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_agent_requests_sport_type ON agent_requests(sport_type);
CREATE INDEX IF NOT EXISTS idx_agents_agency_name ON agents(agency_name);
CREATE INDEX IF NOT EXISTS idx_agents_specialization ON agents USING GIN(specialization);
CREATE INDEX IF NOT EXISTS idx_agents_profile_id ON agents(profile_id);
CREATE INDEX IF NOT EXISTS idx_agents_member_association ON agents(member_association);
CREATE INDEX IF NOT EXISTS idx_profiles_full_name ON profiles(full_name);
CREATE INDEX IF NOT EXISTS idx_profiles_user_type ON profiles(user_type);
