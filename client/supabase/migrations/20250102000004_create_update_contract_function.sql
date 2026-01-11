-- Create a function to update contracts that bypasses RLS issues
-- This provides an alternative way to update contracts without trigger conflicts

CREATE OR REPLACE FUNCTION update_contract_status(
    contract_id_param uuid,
    new_status text,
    new_current_step text,
    new_terms jsonb DEFAULT NULL,
    user_id_param uuid DEFAULT auth.uid()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- This allows the function to bypass RLS
AS $$
DECLARE
    contract_record contracts;
BEGIN
    -- Get the contract to verify permissions
    SELECT * INTO contract_record 
    FROM contracts 
    WHERE id = contract_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Contract not found';
    END IF;
    
    -- Check if user has permission (either team owner or agent)
    IF NOT (
        EXISTS (
            SELECT 1 FROM teams t 
            WHERE t.id = contract_record.team_id 
            AND t.profile_id = user_id_param
        )
        OR
        EXISTS (
            SELECT 1 FROM agents a 
            WHERE a.id = contract_record.agent_id 
            AND a.profile_id = user_id_param
        )
    ) THEN
        RAISE EXCEPTION 'Permission denied';
    END IF;
    
    -- Update the contract
    UPDATE contracts 
    SET 
        status = new_status,
        current_step = new_current_step,
        terms = COALESCE(new_terms, terms),
        negotiation_rounds = negotiation_rounds + 1,
        last_activity = NOW(),
        updated_at = NOW()
    WHERE id = contract_id_param;
    
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_contract_status TO authenticated;
