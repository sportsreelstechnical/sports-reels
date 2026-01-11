-- Add status tracking for agent interests instead of deleting records
-- This allows us to show withdrawal/rejection messages in the communication hub

-- Add new status values to the existing check constraint
ALTER TABLE public.agent_interest DROP CONSTRAINT IF EXISTS agent_interest_status_check;
ALTER TABLE public.agent_interest ADD CONSTRAINT agent_interest_status_check 
CHECK (status IN ('interested', 'requested', 'negotiating', 'withdrawn', 'rejected'));

-- Add columns for status tracking
ALTER TABLE public.agent_interest 
ADD COLUMN IF NOT EXISTS status_message TEXT,
ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS status_changed_by UUID REFERENCES auth.users(id);

-- Create function to update status with message
CREATE OR REPLACE FUNCTION public.update_agent_interest_status(
  interest_id UUID,
  new_status TEXT,
  status_msg TEXT DEFAULT NULL,
  changed_by_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.agent_interest 
  SET 
    status = new_status,
    status_message = status_msg,
    status_changed_at = NOW(),
    status_changed_by = changed_by_user_id,
    updated_at = NOW()
  WHERE id = interest_id;
  
  RETURN FOUND;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.update_agent_interest_status TO authenticated;
