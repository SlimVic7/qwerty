-- ============================================================
-- READ-ONLY Preflight Verification: Migration 00015
-- Stage 6.2 External Apply + Job Source Attribution (RPC Hardening)
-- ============================================================

-- A. Confirm jobs table has Stage 6.2 source columns present
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'jobs'
  AND column_name IN ('source_type', 'source_published_at', 'source_last_verified_at', 'source_name', 'source_url', 'application_url')
ORDER BY column_name;

-- B. Confirm current existence of RPC functions before migration
SELECT 
  p.proname AS function_name,
  pg_catalog.pg_get_function_identity_arguments(p.oid) AS identity_arguments,
  p.prosecdef AS is_security_definer
FROM pg_catalog.pg_proc p
JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('ops_update_job', 'ops_create_job');

-- C. Check existing jobs source_type distribution
SELECT 
  source_type,
  count(*) AS total_count
FROM public.jobs
GROUP BY source_type
ORDER BY count(*) DESC;

-- D. Consolidated readiness check: returns TRUE when prerequisites are satisfied
SELECT
  -- 1. jobs.source_type column must exist
  EXISTS(
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'source_type'
  ) AS col_source_type_exists,
  -- 2. jobs.source_published_at column must exist
  EXISTS(
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'source_published_at'
  ) AS col_source_pub_exists,
  -- 3. jobs.source_last_verified_at column must exist
  EXISTS(
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'source_last_verified_at'
  ) AS col_source_ver_exists,
  -- 4. public.ops_update_job function exists
  EXISTS(
    SELECT 1 FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'ops_update_job'
  ) AS fn_ops_update_job_exists,
  -- 5. public.ops_create_job function exists
  EXISTS(
    SELECT 1 FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'ops_create_job'
  ) AS fn_ops_create_job_exists;
