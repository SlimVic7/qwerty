-- ============================================================
-- PREFLIGHT AUDIT: Migration 00013 (Stage 6.1 Saved Jobs)
-- READ-ONLY SQL SCRIPT
-- ============================================================

-- A. Verify candidate_saved_jobs does not already exist
SELECT 
    'A. candidate_saved_jobs table check' AS test_name,
    NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'candidate_saved_jobs'
    ) AS passed,
    'candidate_saved_jobs table should not exist prior to migration' AS note;

-- B. Verify jobs table exists
SELECT 
    'B. jobs table existence check' AS test_name,
    EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'jobs'
    ) AS passed,
    'jobs table must exist' AS note;

-- C. Verify jobs.id and jobs.status required columns exist
SELECT 
    'C. jobs required columns check' AS test_name,
    (
        COUNT(*) = 2
    ) AS passed,
    'jobs.id and jobs.status columns must exist' AS note
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'jobs' 
  AND column_name IN ('id', 'status');

-- D. Verify required public.profiles identity table exists
SELECT 
    'D. profiles identity table check' AS test_name,
    EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'profiles'
    ) AS passed,
    'profiles table must exist for user_id foreign key' AS note;

-- E. Verify public.set_current_timestamp_updated_at() trigger function exists
SELECT 
    'E. updated_at trigger function check' AS test_name,
    EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'set_current_timestamp_updated_at'
    ) AS passed,
    'set_current_timestamp_updated_at function must exist' AS note;

-- F. Verify target constraint names do not exist
SELECT 
    'F. target constraint name check' AS test_name,
    NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname IN ('uq_candidate_saved_jobs_user_job')
    ) AS passed,
    'Constraint uq_candidate_saved_jobs_user_job must not pre-exist' AS note;

-- G. Verify target indexes do not exist
SELECT 
    'G. target index names check' AS test_name,
    NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public' 
          AND indexname IN ('idx_candidate_saved_jobs_user_saved_at', 'idx_candidate_saved_jobs_job_id')
    ) AS passed,
    'Indexes must not pre-exist' AS note;

-- H. Verify target trigger does not exist
SELECT 
    'H. target trigger check' AS test_name,
    NOT EXISTS (
        SELECT 1 FROM information_schema.triggers
        WHERE trigger_schema = 'public' 
          AND trigger_name = 'set_candidate_saved_jobs_updated_at'
    ) AS passed,
    'Trigger set_candidate_saved_jobs_updated_at must not pre-exist' AS note;

-- I. Verify RLS policy names do not exist
SELECT 
    'I. RLS policy name check' AS test_name,
    NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' 
          AND policyname = 'Candidates can view their own saved jobs'
    ) AS passed,
    'Policy name must not pre-exist' AS note;

-- J. Verify save/unsave RPC functions do not exist
SELECT 
    'J. save/unsave RPC functions check' AS test_name,
    NOT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname IN ('save_candidate_job', 'unsave_candidate_job')
    ) AS passed,
    'Functions save_candidate_job and unsave_candidate_job must not pre-exist' AS note;

-- K. Check schema migrations record
SELECT 
    'K. migration 00013 check' AS test_name,
    NOT EXISTS (
        SELECT 1 
        FROM supabase_migrations.schema_migrations 
        WHERE version = '00013' OR version LIKE '00013%'
    ) AS passed,
    'Migration 00013 must not already be recorded in supabase_migrations.schema_migrations' AS note;

-- L. Report any existing saved-job/bookmark/favorite structures that could conflict
SELECT 
    'L. conflicting bookmark tables check' AS test_name,
    table_name,
    table_schema
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_name ILIKE ANY(ARRAY['%saved%job%', '%bookmark%', '%favorite%']);

-- M. Verify public.profiles.id exists, is uuid, and non-nullable
SELECT 
    'M. profiles.id type check' AS test_name,
    (
        COUNT(*) = 1 AND 
        bool_and(data_type = 'uuid' AND is_nullable = 'NO')
    ) AS passed,
    'profiles.id must exist as non-nullable uuid' AS note
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles' 
  AND column_name = 'id';

-- N. Verify public.profiles.id is primary key or unique constraint suitable for FK
SELECT 
    'N. profiles.id primary/unique key check' AS test_name,
    EXISTS (
        SELECT 1
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
        WHERE tc.table_schema = 'public'
          AND tc.table_name = 'profiles'
          AND kcu.column_name = 'id'
          AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE')
    ) AS passed,
    'profiles.id must be a primary key or unique constraint suitable for FK target' AS note;

-- O. Verify public.jobs.id exists, is uuid, and non-nullable
SELECT 
    'O. jobs.id type check' AS test_name,
    (
        COUNT(*) = 1 AND 
        bool_and(data_type = 'uuid' AND is_nullable = 'NO')
    ) AS passed,
    'jobs.id must exist as non-nullable uuid' AS note
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'jobs' 
  AND column_name = 'id';

-- P. Verify public.jobs.id is primary key or unique constraint suitable for FK
SELECT 
    'P. jobs.id primary/unique key check' AS test_name,
    EXISTS (
        SELECT 1
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
        WHERE tc.table_schema = 'public'
          AND tc.table_name = 'jobs'
          AND kcu.column_name = 'id'
          AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE')
    ) AS passed,
    'jobs.id must be a primary key or unique constraint suitable for FK target' AS note;

-- Q. Verify public.jobs.status existence and report actual PostgreSQL type
SELECT 
    'Q. jobs.status existence and type check' AS test_name,
    column_name,
    data_type,
    udt_name,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'jobs' 
  AND column_name = 'status';
