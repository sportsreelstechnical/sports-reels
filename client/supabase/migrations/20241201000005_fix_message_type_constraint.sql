-- Fix message_type constraint to include all valid message types
-- This migration ensures the constraint matches all the message types used in the application

-- Drop the existing constraint if it exists
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_message_type_check;

-- Add the correct constraint with all valid message types
ALTER TABLE messages 
ADD CONSTRAINT messages_message_type_check 
CHECK (message_type IN ('general', 'contract', 'invitation', 'negotiation', 'response', 'inquiry', 'interest'));

-- Update any existing messages with invalid message_type to 'general'
UPDATE messages 
SET message_type = 'general' 
WHERE message_type NOT IN ('general', 'contract', 'invitation', 'negotiation', 'response', 'inquiry', 'interest');

-- Ensure the message_type column has a default value
ALTER TABLE messages 
ALTER COLUMN message_type SET DEFAULT 'general';
