
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload their own message attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can view message attachments they're involved in" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own message attachments" ON storage.objects;

-- Create proper RLS policies for message attachments bucket
CREATE POLICY "Authenticated users can upload message attachments" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'message-attachments' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Authenticated users can view message attachments" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'message-attachments' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can delete message attachments" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'message-attachments' AND
    auth.uid() IS NOT NULL
  );

-- Fix contracts bucket policies too
DROP POLICY IF EXISTS "Teams and agents can manage contracts" ON storage.objects;

CREATE POLICY "Authenticated users can upload contracts" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'contracts' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Authenticated users can view contracts" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'contracts' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can delete contracts" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'contracts' AND
    auth.uid() IS NOT NULL
  );
