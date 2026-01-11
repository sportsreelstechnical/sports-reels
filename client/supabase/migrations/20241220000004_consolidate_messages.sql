-- Consolidate player_messages into messages table
-- This migration moves all data from player_messages to messages and removes the duplicate table

-- First, migrate existing data from player_messages to messages
INSERT INTO messages (
    id,
    sender_id,
    receiver_id,
    player_id,
    pitch_id,
    subject,
    content,
    message_type,
    is_flagged,
    created_at,
    updated_at
)
SELECT 
    id,
    sender_id,
    receiver_id,
    player_id,
    pitch_id,
    subject,
    content,
    COALESCE(message_type, 'general'),
    COALESCE(is_flagged, false),
    created_at,
    updated_at
FROM player_messages
ON CONFLICT (id) DO NOTHING;

-- Update message status based on is_read field
UPDATE messages 
SET status = CASE 
    WHEN EXISTS (
        SELECT 1 FROM player_messages pm 
        WHERE pm.id = messages.id AND pm.is_read = true
    ) THEN 'read'
    ELSE 'sent'
    END
WHERE id IN (SELECT id FROM player_messages);

-- Drop the player_messages table since it's no longer needed
DROP TABLE IF EXISTS player_messages CASCADE;

-- Update any remaining references to use the messages table
-- This ensures all messaging goes through the unified system

-- Grant proper permissions on messages table
GRANT ALL ON messages TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Ensure the messages table has all necessary columns
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'general',
ADD COLUMN IF NOT EXISTS contract_file_url TEXT,
ADD COLUMN IF NOT EXISTS contract_file_name TEXT,
ADD COLUMN IF NOT EXISTS contract_file_size INTEGER,
ADD COLUMN IF NOT EXISTS contract_file_type TEXT,
ADD COLUMN IF NOT EXISTS contract_status TEXT DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS requires_response BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS response_deadline TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS flag_reason TEXT,
ADD COLUMN IF NOT EXISTS auto_flag_contact BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS responded_at TIMESTAMP WITH TIME ZONE;

-- Add check constraints for message_type and contract_status
ALTER TABLE messages 
ADD CONSTRAINT IF NOT EXISTS messages_message_type_check 
CHECK (message_type IN ('general', 'contract', 'invitation', 'negotiation', 'response', 'inquiry'));

ALTER TABLE messages 
ADD CONSTRAINT IF NOT EXISTS messages_contract_status_check 
CHECK (contract_status IN ('draft', 'sent', 'reviewed', 'signed', 'rejected'));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_message_type ON messages(message_type);
CREATE INDEX IF NOT EXISTS idx_messages_contract_status ON messages(contract_status);
CREATE INDEX IF NOT EXISTS idx_messages_read_at ON messages(read_at);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- Update the flag_contact_info function to work with the messages table
CREATE OR REPLACE FUNCTION flag_contact_info()
RETURNS TRIGGER AS $$
BEGIN
    -- Check for phone numbers
    IF NEW.content ~ '(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}' OR
       NEW.content ~ '(\+?\d{1,4}[-.\s]?)?\d{10,15}' OR
       NEW.content ~ '(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})' OR
       NEW.content ~ '(\+\d{1,3}\s?\d{1,14})' THEN
       
        NEW.is_flagged := true;
        NEW.flag_reason := 'phone_number_detected';
        NEW.auto_flag_contact := true;
    END IF;
    
    -- Check for email addresses
    IF NEW.content ~ '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}' OR
       NEW.content ~ '[a-zA-Z0-9._%+-]+\s*@\s*[a-zA-Z0-9.-]+\s*\.\s*[a-zA-Z]{2,}' OR
       NEW.content ~ '[a-zA-Z0-9._%+-]+\[at\][a-zA-Z0-9.-]+\[dot\][a-zA-Z]{2,}' THEN
       
        NEW.is_flagged := true;
        NEW.flag_reason := 'email_address_detected';
        NEW.auto_flag_contact := true;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS auto_flag_contact_info ON messages;
DROP TRIGGER IF EXISTS flag_contact_messages ON messages;

-- Create trigger for auto-flagging
CREATE TRIGGER auto_flag_contact_info
    BEFORE INSERT OR UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION flag_contact_info();

-- Function to create enhanced notification when message is received
CREATE OR REPLACE FUNCTION create_enhanced_message_notification()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notifications (
        user_id,
        title,
        message,
        type,
        category,
        priority,
        is_actionable,
        action_url,
        action_text,
        metadata
    ) VALUES (
        NEW.receiver_id,
        'New Message Received',
        CASE 
            WHEN NEW.subject IS NOT NULL THEN NEW.subject
            ELSE 'You have received a new message'
        END,
        'message',
        'message',
        'normal',
        true,
        '/messages/' || NEW.id,
        'View Message',
        jsonb_build_object(
            'message_id', NEW.id,
            'sender_id', NEW.sender_id,
            'pitch_id', NEW.pitch_id,
            'player_id', NEW.player_id,
            'message_type', NEW.message_type
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS create_message_notification_trigger ON messages;
DROP TRIGGER IF EXISTS create_enhanced_message_notification_trigger ON messages;

-- Create trigger for creating enhanced notifications
CREATE TRIGGER create_enhanced_message_notification_trigger
    AFTER INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION create_enhanced_message_notification();

-- Function to update message count on transfer pitches
CREATE OR REPLACE FUNCTION update_pitch_message_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE transfer_pitches 
        SET message_count = COALESCE(message_count, 0) + 1,
            updated_at = NOW()
        WHERE id = NEW.pitch_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE transfer_pitches 
        SET message_count = GREATEST(COALESCE(message_count, 0) - 1, 0),
            updated_at = NOW()
        WHERE id = OLD.pitch_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_pitch_message_count_trigger ON messages;

-- Create trigger for updating pitch message count
CREATE TRIGGER update_pitch_message_count_trigger
    AFTER INSERT OR DELETE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_pitch_message_count();

-- Ensure realtime is enabled for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
