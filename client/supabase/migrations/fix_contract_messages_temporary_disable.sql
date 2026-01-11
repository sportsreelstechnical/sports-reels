-- Temporarily disable contract message creation by making sender_id nullable
-- This is a quick fix to allow contract creation without message creation issues

-- Step 1: Check current table structure
SELECT '🔍 CHECKING CURRENT TABLE STRUCTURE:' as info;

SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'contract_messages' 
ORDER BY column_name;

-- Step 2: Make sender_id nullable
SELECT '🔧 MAKING SENDER_ID NULLABLE:' as info;

ALTER TABLE contract_messages ALTER COLUMN sender_id DROP NOT NULL;

-- Step 3: Verify the change
SELECT '✅ VERIFYING CHANGE:' as info;

SELECT 
    'sender_id nullable:' as info,
    CASE 
        WHEN is_nullable = 'YES' THEN '✅ sender_id is now nullable'
        ELSE '❌ sender_id is still NOT NULL'
    END as status
FROM information_schema.columns 
WHERE table_name = 'contract_messages' 
AND column_name = 'sender_id';

-- Step 4: Test inserting a message with null sender_id
SELECT '🧪 TESTING NULL SENDER_ID INSERT:' as info;

-- This will only work if there are existing contracts
DO $$ 
BEGIN
    -- Try to insert a test message with null sender_id
    IF EXISTS (SELECT 1 FROM contracts LIMIT 1) THEN
        INSERT INTO contract_messages (contract_id, sender_id, content, message_type)
        SELECT 
            c.id,
            NULL,
            'Test system message',
            'system'
        FROM contracts c
        LIMIT 1;
        
        RAISE NOTICE '✅ Successfully inserted test message with null sender_id';
        
        -- Clean up the test message
        DELETE FROM contract_messages 
        WHERE content = 'Test system message' AND sender_id IS NULL;
        
        RAISE NOTICE '✅ Cleaned up test message';
    ELSE
        RAISE NOTICE '⚠️ No contracts found to test with';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Error testing null sender_id insert: %', SQLERRM;
END $$;

SELECT '🎉 QUICK FIX APPLIED!' as info;
SELECT 'The contract_messages table now allows NULL sender_id values.' as next_steps;
SELECT 'Contract creation should now work without foreign key violations.' as recommendation;
