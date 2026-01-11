-- Update existing draft contracts to sent status
-- This ensures existing contracts work with the new role-specific action buttons

UPDATE contracts 
SET 
    status = 'sent',
    current_step = 'under_review',
    updated_at = NOW()
WHERE 
    status = 'draft' 
    AND current_step = 'draft';

-- Add comment explaining the change
COMMENT ON TABLE contracts IS 'Contracts now start as sent to enable immediate agent actions';
