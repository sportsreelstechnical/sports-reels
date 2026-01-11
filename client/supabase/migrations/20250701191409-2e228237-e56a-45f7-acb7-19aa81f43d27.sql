
-- Add missing columns to players table
ALTER TABLE players ADD COLUMN IF NOT EXISTS age INTEGER;

-- Add missing columns to profiles table that are being queried
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS league TEXT;

-- Update the age column for existing players based on date_of_birth
UPDATE players 
SET age = EXTRACT(YEAR FROM AGE(date_of_birth))
WHERE date_of_birth IS NOT NULL AND age IS NULL;

-- Add missing columns to messages table for file handling
ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_type TEXT;

-- Create a storage bucket for message attachments if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'message-attachments', 
  'message-attachments', 
  false, 
  52428800, -- 50MB limit
  ARRAY['image/*', 'application/pdf', 'text/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
) ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for message attachments bucket
CREATE POLICY "Users can upload their own message attachments" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'message-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view message attachments they're involved in" ON storage.objects
FOR SELECT USING (
  bucket_id = 'message-attachments' AND
  (
    auth.uid()::text = (storage.foldername(name))[1] OR
    EXISTS (
      SELECT 1 FROM messages m 
      WHERE m.attachment_urls::text LIKE '%' || name || '%' 
      AND (m.sender_id = auth.uid() OR m.receiver_id = auth.uid())
    )
  )
);

CREATE POLICY "Users can delete their own message attachments" ON storage.objects
FOR DELETE USING (
  bucket_id = 'message-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
