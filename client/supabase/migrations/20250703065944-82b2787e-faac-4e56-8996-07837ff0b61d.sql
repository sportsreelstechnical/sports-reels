
-- Create the message-attachments bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('message-attachments', 'message-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for message-attachments bucket
CREATE POLICY "Authenticated users can upload to message-attachments" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'message-attachments' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Anyone can view message-attachments" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'message-attachments'
  );

CREATE POLICY "Users can delete from message-attachments" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'message-attachments' AND
    auth.uid() IS NOT NULL
  );

-- Also ensure the contracts bucket exists and is public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'contracts';

CREATE POLICY "Anyone can view contracts" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'contracts'
  );

CREATE POLICY "Authenticated users can upload contracts" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'contracts' AND
    auth.uid() IS NOT NULL
  );
