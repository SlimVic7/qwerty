-- ============================================================
-- Post-Deployment Verification: Migration 00015
-- Stage 6.2 External Apply + Job Source Attribution (RPC Hardening)
-- ============================================================

-- ============================================================
-- 1. DETAILED INSPECTION: FUNCTION SIGNATURES & SECURITY CONFIG
-- ============================================================
SELECT 
  p.proname AS function_name,
  pg_catalog.pg_get_function_identity_arguments(p.oid) AS identity_arguments,
  p.pronargs AS num_arguments,
  CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END AS security_type,
  pg_catalog.pg_get_userbyid(p.proowner) AS function_owner,
  p.proconfig AS runtime_config
FROM pg_catalog.pg_proc p
JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('ops_update_job', 'ops_create_job')
ORDER BY p.proname;

-- ============================================================
-- 2. DETAILED INSPECTION: PERMISSIONS & GRANTEES
-- ============================================================
SELECT 
  routine_name,
  specific_name,
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name IN ('ops_update_job', 'ops_create_job')
ORDER BY routine_name, grantee, privilege_type;

-- ============================================================
-- 3. CONSOLIDATED ASSERTIONS (MUST ALL RETURN TRUE)
-- ============================================================
SELECT 
  -- A. Exactly ONE overload of public.ops_update_job exists
  (
    SELECT count(*)
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'ops_update_job'
  ) = 1 AS exactly_one_ops_update_job,

  -- B. ops_update_job has exact identity signature: (uuid, uuid, jsonb)
  EXISTS(
    SELECT 1
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'ops_update_job'
      AND pg_catalog.pg_get_function_identity_arguments(p.oid) = 'p_job_id uuid, p_actor_id uuid, p_updates jsonb'
  ) AS ops_update_job_signature_exact,

  -- C. ops_update_job is SECURITY INVOKER, owned by postgres, search_path=''
  EXISTS(
    SELECT 1
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'ops_update_job'
      AND p.prosecdef = false
      AND pg_catalog.pg_get_userbyid(p.proowner) = 'postgres'
      AND ARRAY['search_path=']::text[] <@ p.proconfig
  ) AS ops_update_job_security_invoker_owner_search_path,

  -- D. Legacy 25-argument ops_create_job is ABSENT
  NOT EXISTS(
    SELECT 1
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'ops_create_job'
      AND p.pronargs = 25
  ) AS legacy_25_arg_ops_create_job_absent,

  -- E. Exactly ONE overload of public.ops_create_job exists
  (
    SELECT count(*)
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'ops_create_job'
  ) = 1 AS exactly_one_ops_create_job,

  -- F. New 28-argument ops_create_job exists
  EXISTS(
    SELECT 1
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'ops_create_job'
      AND p.pronargs = 28
  ) AS new_28_arg_ops_create_job_exists,

  -- G. New ops_create_job is SECURITY INVOKER, owned by postgres, search_path=''
  EXISTS(
    SELECT 1
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'ops_create_job'
      AND p.prosecdef = false
      AND pg_catalog.pg_get_userbyid(p.proowner) = 'postgres'
      AND ARRAY['search_path=']::text[] <@ p.proconfig
  ) AS ops_create_job_security_invoker_owner_search_path,

  -- H. ops_update_job: PUBLIC has NO execute permission
  NOT EXISTS(
    SELECT 1
    FROM information_schema.routine_privileges
    WHERE routine_schema = 'public'
      AND routine_name = 'ops_update_job'
      AND grantee = 'PUBLIC'
      AND privilege_type = 'EXECUTE'
  ) AS ops_update_job_public_execute_false,

  -- I. ops_update_job: anon has NO execute permission
  NOT EXISTS(
    SELECT 1
    FROM information_schema.routine_privileges
    WHERE routine_schema = 'public'
      AND routine_name = 'ops_update_job'
      AND grantee = 'anon'
      AND privilege_type = 'EXECUTE'
  ) AS ops_update_job_anon_execute_false,

  -- J. ops_update_job: authenticated has NO execute permission
  NOT EXISTS(
    SELECT 1
    FROM information_schema.routine_privileges
    WHERE routine_schema = 'public'
      AND routine_name = 'ops_update_job'
      AND grantee = 'authenticated'
      AND privilege_type = 'EXECUTE'
  ) AS ops_update_job_authenticated_execute_false,

  -- K. ops_update_job: service_role HAS execute permission
  EXISTS(
    SELECT 1
    FROM information_schema.routine_privileges
    WHERE routine_schema = 'public'
      AND routine_name = 'ops_update_job'
      AND grantee = 'service_role'
      AND privilege_type = 'EXECUTE'
  ) AS ops_update_job_service_role_execute_true,

  -- L. ops_create_job: PUBLIC has NO execute permission
  NOT EXISTS(
    SELECT 1
    FROM information_schema.routine_privileges
    WHERE routine_schema = 'public'
      AND routine_name = 'ops_create_job'
      AND grantee = 'PUBLIC'
      AND privilege_type = 'EXECUTE'
  ) AS ops_create_job_public_execute_false,

  -- M. ops_create_job: anon has NO execute permission
  NOT EXISTS(
    SELECT 1
    FROM information_schema.routine_privileges
    WHERE routine_schema = 'public'
      AND routine_name = 'ops_create_job'
      AND grantee = 'anon'
      AND privilege_type = 'EXECUTE'
  ) AS ops_create_job_anon_execute_false,

  -- N. ops_create_job: authenticated has NO execute permission
  NOT EXISTS(
    SELECT 1
    FROM information_schema.routine_privileges
    WHERE routine_schema = 'public'
      AND routine_name = 'ops_create_job'
      AND grantee = 'authenticated'
      AND privilege_type = 'EXECUTE'
  ) AS ops_create_job_authenticated_execute_false,

  -- O. ops_create_job: service_role HAS execute permission
  EXISTS(
    SELECT 1
    FROM information_schema.routine_privileges
    WHERE routine_schema = 'public'
      AND routine_name = 'ops_create_job'
      AND grantee = 'service_role'
      AND privilege_type = 'EXECUTE'
  ) AS ops_create_job_service_role_execute_true;
