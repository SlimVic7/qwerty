-- ============================================================
-- POST-DEPLOYMENT VERIFICATION: Migration 00013 (Stage 6.1 Saved Jobs)
-- ============================================================

-- 1. Table existence & schema
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'candidate_saved_jobs';

-- 2. Columns, types, and defaults
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'candidate_saved_jobs'
ORDER BY ordinal_position;

-- 3. Primary Key, Foreign Keys and ON DELETE behavior
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
WHERE tc.table_schema = 'public' AND tc.table_name = 'candidate_saved_jobs';

-- 4. Unique user/job constraint
SELECT
    conname,
    contype,
    pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.candidate_saved_jobs'::regclass
  AND conname = 'uq_candidate_saved_jobs_user_job';

-- 5. Indexes
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'candidate_saved_jobs';

-- 6. Trigger verification
SELECT
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public' 
  AND event_object_table = 'candidate_saved_jobs';

-- 7. RLS enabled
SELECT 
    relname,
    relrowsecurity,
    relforcerowsecurity
FROM pg_class
WHERE relname = 'candidate_saved_jobs' AND relnamespace = 'public'::regnamespace;

-- 8. Policies
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'candidate_saved_jobs';

-- 9. Table privileges (grantee, privilege_type)
SELECT 
    grantee, 
    privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' AND table_name = 'candidate_saved_jobs';

-- 10. RPC functions definition, owner, security definer, search_path, and ACL
SELECT 
    p.proname AS function_name,
    pg_get_function_identity_arguments(p.oid) AS argument_signature,
    r.rolname AS owner,
    p.prosecdef AS is_security_definer,
    array_to_string(p.proconfig, ', ') AS configured_search_path,
    p.proacl AS function_acl
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
JOIN pg_roles r ON p.proowner = r.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('save_candidate_job', 'unsave_candidate_job')
ORDER BY p.proname;

-- 11. Explicit verification of RPC EXECUTE grants (PUBLIC/anon/authenticated absent, service_role present)
SELECT 
    p.proname AS function_name,
    has_function_privilege('public', p.oid, 'EXECUTE') AS public_execute_allowed,
    has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_execute_allowed,
    has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_execute_allowed,
    has_function_privilege('service_role', p.oid, 'EXECUTE') AS service_role_execute_allowed,
    (
        NOT has_function_privilege('public', p.oid, 'EXECUTE') AND
        NOT has_function_privilege('anon', p.oid, 'EXECUTE') AND
        NOT has_function_privilege('authenticated', p.oid, 'EXECUTE') AND
        has_function_privilege('service_role', p.oid, 'EXECUTE')
    ) AS execute_privileges_valid
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('save_candidate_job', 'unsave_candidate_job')
ORDER BY p.proname;
