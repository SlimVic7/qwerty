-- ============================================================
-- PREFLIGHT AUDIT: Migration 00016 (Stage 6.3 Job Alerts)
-- READ-ONLY SQL SCRIPT — RUN BEFORE MIGRATION 00016
-- ============================================================

-- A. Verify candidate_job_alerts does not already exist
SELECT 
    'A. candidate_job_alerts table check' AS test_name,
    NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'candidate_job_alerts'
    ) AS passed,
    'candidate_job_alerts table should not exist prior to migration' AS note;

-- B. Verify profiles table exists for foreign key user_id
SELECT 
    'B. profiles identity table check' AS test_name,
    EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'profiles'
    ) AS passed,
    'profiles table must exist for user_id foreign key' AS note;

-- C. Verify updated_at trigger function exists
SELECT 
    'C. updated_at trigger function check' AS test_name,
    EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'set_current_timestamp_updated_at'
    ) AS passed,
    'set_current_timestamp_updated_at function must exist' AS note;

-- D. Verify target constraint does not already exist
SELECT 
    'D. target constraint name check' AS test_name,
    NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_candidate_job_alerts_name_length'
    ) AS passed,
    'chk_candidate_job_alerts_name_length constraint should not exist' AS note;

-- E. Verify target indexes do not already exist
SELECT 
    'E. target index check' AS test_name,
    NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public' 
          AND indexname IN (
            'idx_candidate_job_alerts_user_active',
            'idx_candidate_job_alerts_created_at'
          )
    ) AS passed,
    'target indexes should not exist prior to migration' AS note;
