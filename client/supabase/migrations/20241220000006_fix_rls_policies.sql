-- Alternative: If the above policies don't work, create a more permissive policy for testing
CREATE POLICY "Allow authenticated users to manage notifications" ON notifications
    FOR ALL USING (auth.role() = 'authenticated');

-- Grant proper permissions
GRANT ALL ON notifications TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
