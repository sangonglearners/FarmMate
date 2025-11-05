-- Run this query in Supabase SQL Editor to check table schemas

-- Check farms table
SELECT 'farms' as table_name, column_name, data_type, character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'farms'
ORDER BY ordinal_position;

-- Check tasks_v1 table
SELECT 'tasks_v1' as table_name, column_name, data_type, character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'tasks_v1'
ORDER BY ordinal_position;

-- Check crops table
SELECT 'crops' as table_name, column_name, data_type, character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'crops'
ORDER BY ordinal_position;

-- Check calendar_shares table
SELECT 'calendar_shares' as table_name, column_name, data_type, character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'calendar_shares'
ORDER BY ordinal_position;



