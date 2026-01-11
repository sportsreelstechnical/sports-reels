-- Check the actual schema of the notifications table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'notifications' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Test a simple update to see what works
UPDATE notifications 
SET is_read = true 
WHERE id = (SELECT id FROM notifications LIMIT 1)
RETURNING id, is_read;
