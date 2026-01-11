-- Add 'cancelled' status to agent_interest table
-- This allows agents to cancel their interest in players

-- Drop the existing check constraint
ALTER TABLE public.agent_interest DROP CONSTRAINT IF EXISTS agent_interest_status_check;

-- Add the new check constraint with 'cancelled' included
ALTER TABLE public.agent_interest ADD CONSTRAINT agent_interest_status_check 
CHECK (status IN ('interested', 'requested', 'negotiating', 'cancelled'));

-- Add policy to allow agents to update their own interest status (for cancelling)
DROP POLICY IF EXISTS "Agents can update their own interest" ON public.agent_interest;
CREATE POLICY "Agents can update their own interest" ON public.agent_interest
    FOR UPDATE USING (auth.uid() = agent_id);
