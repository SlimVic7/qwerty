-- ============================================================
-- POST-DEPLOYMENT VERIFICATION: Migration 00016 (Stage 6.3 Job Alerts)
-- READ-ONLY SQL SCRIPT — RUN AFTER MIGRATION 00016
-- ============================================================

-- 1. Table existence & schema
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'candidate_job_alerts';

-- 2. Columns, types, and defaults
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'candidate_job_alerts'
ORDER BY ordinal_position;

-- 3. Confirm absence of salary columns in candidate_job_alerts
SELECT 
    'Absence of salary columns' AS check_name,
    COUNT(*) = 0 AS passed,
    'salary_min and salary_currency must not exist in candidate_job_alerts' AS note
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'candidate_job_alerts'
  AND column_name LIKE '%salary%';

-- 4. Confirm absence of experience_level in candidate_job_alerts
SELECT 
    'Absence of experience_level column' AS check_name,
    COUNT(*) = 0 AS passed,
    'experience_level is deferred until jobs.experience_level taxonomy normalization' AS note
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'candidate_job_alerts'
  AND column_name = 'experience_level';

-- 5. Confirm candidate_job_preferences table does NOT exist
SELECT 
    'Absence of candidate_job_preferences' AS check_name,
    COUNT(*) = 0 AS passed,
    'candidate_job_preferences is deferred to Stage 6.4' AS note
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'candidate_job_preferences';

-- 6. Foreign Key & ON DELETE behavior
SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
LEFT JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.table_schema = 'public' AND tc.table_name = 'candidate_job_alerts';

-- 7. Check constraints (frequency in daily/weekly, name length <= 80, workplace, employment)
SELECT
    conname,
    pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.candidate_job_alerts'::regclass
  AND contype = 'c';

-- 8. Indexes (user_active, created_at only - no redundant user_id index)
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'candidate_job_alerts';

-- 9. Trigger verification
SELECT
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public' 
  AND event_object_table = 'candidate_job_alerts';

-- 10. Row Level Security status
SELECT
    relname AS table_name,
    relrowsecurity AS rls_enabled,
    relforcerowsecurity AS rls_enforced
FROM pg_class
WHERE relnamespace = 'public'::regnamespace
  AND relname = 'candidate_job_alerts';

-- 11. Table Privileges / Grants verification
SELECT 
    grantee, 
    privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public' 
  AND table_name = 'candidate_job_alerts'
ORDER BY grantee, privilege_type;

-- 12. RLS Policies
SELECT
    policyname,
    cmd,
    roles,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'candidate_job_alerts';
