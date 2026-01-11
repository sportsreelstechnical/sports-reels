
-- Fix the transfer pitches query issue by ensuring proper RLS policies
-- and fixing any potential data type issues

-- Update transfer_pitches table to ensure all required fields are properly typed
ALTER TABLE transfer_pitches 
ALTER COLUMN tagged_videos SET DEFAULT '[]'::jsonb,
ALTER COLUMN contract_details SET DEFAULT '{}'::jsonb;

-- Ensure the active_pitches_view works correctly
DROP VIEW IF EXISTS active_pitches_view;

CREATE VIEW active_pitches_view AS
SELECT 
  tp.*,
  p.full_name as player_name,
  p.position as player_position,
  p.citizenship as player_citizenship,
  t.team_name,
  t.country as team_country,
  t.domestic_currency,
  t.international_currency,
  t.member_association,
  CASE 
    WHEN tp.is_international THEN t.international_currency
    ELSE t.domestic_currency
  END as display_currency,
  t.subscription_tier,
  -- Calculate service charge amount
  CASE 
    WHEN tp.transfer_type = 'permanent' AND tp.asking_price IS NOT NULL 
    THEN tp.asking_price * (tp.service_charge_rate / 100)
    WHEN tp.transfer_type = 'loan' AND tp.loan_fee IS NOT NULL 
    THEN tp.loan_fee * (tp.service_charge_rate / 100)
    ELSE 0
  END as service_charge_amount,
  -- Calculate total transfer value
  CASE 
    WHEN tp.transfer_type = 'permanent' AND tp.asking_price IS NOT NULL 
    THEN tp.asking_price + COALESCE(tp.sign_on_bonus, 0) + COALESCE(tp.performance_bonus, 0)
    WHEN tp.transfer_type = 'loan' AND tp.loan_fee IS NOT NULL 
    THEN tp.loan_fee
    ELSE 0
  END as total_transfer_value
FROM transfer_pitches tp
LEFT JOIN players p ON tp.player_id = p.id
LEFT JOIN teams t ON tp.team_id = t.id
WHERE tp.status = 'active' AND tp.expires_at > now();

-- Add missing indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transfer_pitches_status_expires ON transfer_pitches(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_messages_pitch_id ON messages(pitch_id);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);

-- Ensure contract file handling in messages
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS contract_file_name TEXT,
ADD COLUMN IF NOT EXISTS contract_file_size BIGINT,
ADD COLUMN IF NOT EXISTS is_contract_message BOOLEAN DEFAULT false;

-- Create a view for message threads with contract info
CREATE OR REPLACE VIEW message_threads_view AS
SELECT 
  m.*,
  sender.full_name as sender_name,
  sender.user_type as sender_type,
  receiver.full_name as receiver_name,
  receiver.user_type as receiver_type,
  p.full_name as player_name,
  tp.description as pitch_description
FROM messages m
LEFT JOIN profiles sender ON m.sender_id = sender.id
LEFT JOIN profiles receiver ON m.receiver_id = receiver.id
LEFT JOIN players p ON m.player_id = p.id
LEFT JOIN transfer_pitches tp ON m.pitch_id = tp.id
ORDER BY m.created_at DESC;
