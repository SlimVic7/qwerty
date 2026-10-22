-- ============================================================
-- Post-Deployment Verification: Migration 00014
-- Stage 6.2 External Apply + Job Source Attribution
-- ============================================================

-- 1. Verify source columns on public.jobs
SELECT 
    '1. jobs source columns' AS check_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'jobs'
  AND column_name IN ('source_type', 'source_published_at', 'source_last_verified_at', 'source_name', 'source_url', 'application_url')
ORDER BY column_name;

-- 2. Verify constraints on public.jobs and candidate_outbound_apply_events
SELECT 
    '2. constraints' AS check_name,
    conrelid::regclass AS table_name,
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE (conrelid = 'public.jobs'::regclass AND conname IN ('jobs_source_type_check', 'jobs_source_url_safe_scheme', 'jobs_application_url_safe_scheme'))
   OR (conrelid = 'public.candidate_outbound_apply_events'::regclass AND conname = 'candidate_outbound_apply_events_source_type_check')
ORDER BY table_name, constraint_name;

-- 3. Verify candidate_outbound_apply_events table schema
SELECT 
    '3. candidate_outbound_apply_events columns' AS check_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'candidate_outbound_apply_events'
ORDER BY ordinal_position;

-- 4. Verify candidate_outbound_apply_events foreign keys
SELECT 
    '4. outbound apply events foreign keys' AS check_name,
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.candidate_outbound_apply_events'::regclass
  AND contype = 'f';

-- 5. Verify indexes on candidate_outbound_apply_events and jobs
SELECT 
    '5. indexes' AS check_name,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND (
    tablename = 'candidate_outbound_apply_events'
    OR (tablename = 'jobs' AND indexname = 'idx_jobs_source_type')
  )
ORDER BY tablename, indexname;

-- 6. Verify RLS is enabled on candidate_outbound_apply_events
SELECT 
    '6. rls enabled' AS check_name,
    relname AS table_name,
    relrowsecurity AS rls_enabled
FROM pg_class
WHERE relname = 'candidate_outbound_apply_events'
  AND relnamespace = 'public'::regnamespace;

-- 7. Verify Table Grants (anon/authenticated revoked, service_role granted)
SELECT 
    '7. table privileges' AS check_name,
    grantee,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'candidate_outbound_apply_events'
ORDER BY grantee, privilege_type;
