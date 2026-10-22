-- ============================================================
-- POST-DEPLOYMENT VERIFICATION: Migration 00017 (Stage 7.1 Career Role Library Hardened)
-- READ-ONLY SQL SCRIPT — RUN AFTER MIGRATION 00017
-- ============================================================

-- 1. Table existence & schema
SELECT 
    '1. table existence' AS check_name,
    EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'career_roles'
    ) AS passed,
    'public.career_roles table must exist' AS note;

-- 2. Status column default is 'draft'
SELECT 
    '2. status default is draft' AS check_name,
    (column_default = '''draft''::text') AS passed,
    'status column default must be draft (actual: ' || column_default || ')' AS note
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'career_roles' 
  AND column_name = 'status';

-- 3. Primary Key & Unique Constraints
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
 AND tc.table_schema = kcu.table_schema
WHERE tc.table_schema = 'public' 
  AND tc.table_name = 'career_roles'
ORDER BY tc.constraint_type, kcu.ordinal_position;

-- 4. Check Constraints (Taxonomy, Arrays, Non-empty content)
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(c.oid) AS constraint_definition
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
JOIN pg_namespace n ON t.relnamespace = n.oid
WHERE n.nspname = 'public' 
  AND t.relname = 'career_roles' 
  AND c.contype = 'c';

-- 5. Confirm ABSENCE of speculative salary columns
SELECT 
    '5. zero salary columns check' AS check_name,
    COUNT(*) = 0 AS passed,
    'No salary columns should exist on career_roles' AS note
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'career_roles'
  AND column_name LIKE '%salary%';

-- 6. Verified Performance Indexes (Only 2 explicit + PK + UNIQUE)
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
  AND tablename = 'career_roles'
ORDER BY indexname;

-- 7. Updated_at Trigger
SELECT 
    tgname AS trigger_name,
    proname AS function_name,
    tgenabled
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public' 
  AND c.relname = 'career_roles'
  AND NOT t.tgisinternal;

-- 8. Row Level Security (RLS) is Enabled
SELECT 
    '8. RLS enabled check' AS check_name,
    rowsecurity AS passed,
    'public.career_roles must have rowsecurity = true' AS note
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'career_roles';

-- 9. Table Grants: PUBLIC, anon, and authenticated must have ZERO grants. Service_role has 4 CRUD privileges.
SELECT 
    '9a. authenticated direct table grants zero' AS check_name,
    (COUNT(*) = 0) AS passed,
    'authenticated must have 0 direct grants (server-mediated candidate access only)' AS note
FROM information_schema.role_table_grants
WHERE table_schema = 'public' 
  AND table_name = 'career_roles' 
  AND grantee = 'authenticated'
UNION ALL
SELECT 
    '9b. anon direct table grants zero' AS check_name,
    (COUNT(*) = 0) AS passed,
    'anon must have 0 grants' AS note
FROM information_schema.role_table_grants
WHERE table_schema = 'public' 
  AND table_name = 'career_roles' 
  AND grantee = 'anon'
UNION ALL
SELECT 
    '9c. service_role CRUD grants' AS check_name,
    (COUNT(*) = 4) AS passed,
    'service_role must have exactly 4 privileges (SELECT, INSERT, UPDATE, DELETE)' AS note
FROM information_schema.role_table_grants
WHERE table_schema = 'public' 
  AND table_name = 'career_roles' 
  AND grantee = 'service_role'
  AND privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE');

-- 10. RLS Policies: Zero policies required because all candidate access is server-mediated
SELECT 
    '10. zero RLS policies check' AS check_name,
    (COUNT(*) = 0) AS passed,
    'Zero direct RLS policies required; direct browser access is fully locked, candidate access is server-mediated' AS note
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'career_roles';

-- 11. Seed Roles Count & Status
SELECT 
    '11. seed count check' AS check_name,
    (COUNT(*) = 13) AS passed,
    COUNT(*) || ' curated roles seeded (expected 13)' AS note
FROM public.career_roles;

-- 12. Slug Uniqueness & Formatting
SELECT 
    '12. slug uniqueness check' AS check_name,
    (COUNT(DISTINCT slug) = 13) AS passed,
    COUNT(DISTINCT slug) || ' distinct slugs' AS note
FROM public.career_roles;

-- 13. All 13 Launch Roles Published
SELECT 
    '13. all 13 launch roles published check' AS check_name,
    (COUNT(*) = 13) AS passed,
    COUNT(*) || ' roles in published status' AS note
FROM public.career_roles
WHERE status = 'published';

-- 14. Career Area Taxonomy Conformity
SELECT 
    '14. career area taxonomy conformity' AS check_name,
    BOOL_AND(career_area IN (
        'Software Engineering',
        'Data & Analytics',
        'Product & Delivery',
        'Cloud & Infrastructure',
        'Security & Compliance',
        'Quality Engineering'
    )) AS passed,
    'All roles belong to approved 6-discipline taxonomy' AS note
FROM public.career_roles;

-- 15. JSONB Array Typing Integrity
SELECT 
    '15. jsonb array typing integrity' AS check_name,
    BOOL_AND(
        jsonb_typeof(responsibilities) = 'array' AND
        jsonb_typeof(core_skills) = 'array' AND
        jsonb_typeof(supporting_skills) = 'array' AND
        jsonb_typeof(career_progression) = 'array' AND
        jsonb_typeof(related_roles) = 'array'
    ) AS passed,
    'All 5 structured JSONB columns are typed as arrays across all rows' AS note
FROM public.career_roles;

-- 16. Related-Role Reference Resolution & Zero Self-References
SELECT 
    r.slug AS source_role_slug,
    ref->>'slug' AS target_role_slug,
    (ref->>'slug' <> r.slug) AS not_self_reference,
    EXISTS (
        SELECT 1 FROM public.career_roles target 
        WHERE target.slug = ref->>'slug'
    ) AS target_exists
FROM public.career_roles r,
     jsonb_array_elements(r.related_roles) AS ref;

-- ============================================================
-- CONSOLIDATED POST-VERIFY BOOLEAN SUMMARY
-- ============================================================
SELECT 
    bool_and(passed) AS post_verify_00017_passed,
    CASE 
        WHEN bool_and(passed) THEN 'POST-VERIFICATION PASSED — Migration 00017 successfully hardened and verified'
        ELSE 'POST-VERIFICATION FAILED — Inspect row-level queries above'
    END AS status_summary
FROM (
    -- Table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'career_roles'
    ) AS passed
    UNION ALL
    -- Status default is draft
    SELECT (column_default = '''draft''::text') AS passed 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'career_roles' AND column_name = 'status'
    UNION ALL
    -- Primary Key exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints WHERE table_schema = 'public' AND table_name = 'career_roles' AND constraint_type = 'PRIMARY KEY'
    ) AS passed
    UNION ALL
    -- Unique slug exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints WHERE table_schema = 'public' AND table_name = 'career_roles' AND constraint_type = 'UNIQUE'
    ) AS passed
    UNION ALL
    -- Career Area constraint exists
    SELECT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_career_roles_career_area'
    ) AS passed
    UNION ALL
    -- All 5 JSONB array constraints exist
    SELECT (COUNT(*) = 5) AS passed FROM pg_constraint WHERE conname IN (
        'chk_career_roles_responsibilities_array',
        'chk_career_roles_core_skills_array',
        'chk_career_roles_supporting_skills_array',
        'chk_career_roles_progression_array',
        'chk_career_roles_related_roles_array'
    )
    UNION ALL
    -- Non-empty text constraints exist
    SELECT (COUNT(*) = 2) AS passed FROM pg_constraint WHERE conname IN (
        'chk_career_roles_overview_nonempty',
        'chk_career_roles_background_nonempty'
    )
    UNION ALL
    -- Display order check constraint exists
    SELECT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_career_roles_display_order'
    ) AS passed
    UNION ALL
    -- Only justified performance indexes exist (exactly 2 in addition to PK/UNIQUE)
    SELECT (COUNT(*) = 2) AS passed FROM pg_indexes 
    WHERE schemaname = 'public' AND tablename = 'career_roles' 
      AND indexname IN ('idx_career_roles_status_order', 'idx_career_roles_area')
    UNION ALL
    -- Redundant slug index is ABSENT
    SELECT NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'career_roles' AND indexname = 'idx_career_roles_slug'
    ) AS passed
    UNION ALL
    -- Zero salary columns
    SELECT (COUNT(*) = 0) AS passed FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'career_roles' AND column_name LIKE '%salary%'
    UNION ALL
    -- RLS enabled
    SELECT rowsecurity AS passed FROM pg_tables WHERE schemaname = 'public' AND tablename = 'career_roles'
    UNION ALL
    -- Trigger exists
    SELECT EXISTS (
        SELECT 1 FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public' AND c.relname = 'career_roles' AND tgname = 'set_career_roles_updated_at'
    ) AS passed
    UNION ALL
    -- Authenticated has ZERO direct table grants (server-mediated access only)
    SELECT (COUNT(*) = 0) AS passed FROM information_schema.role_table_grants WHERE table_schema = 'public' AND table_name = 'career_roles' AND grantee = 'authenticated'
    UNION ALL
    -- Anon has zero grants
    SELECT (COUNT(*) = 0) AS passed FROM information_schema.role_table_grants WHERE table_schema = 'public' AND table_name = 'career_roles' AND grantee = 'anon'
    UNION ALL
    -- Service role has all 4 CRUD privileges
    SELECT (COUNT(*) = 4) AS passed FROM information_schema.role_table_grants WHERE table_schema = 'public' AND table_name = 'career_roles' AND grantee = 'service_role' AND privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
    UNION ALL
    -- Zero RLS policies required (all candidate access is server-mediated)
    SELECT (COUNT(*) = 0) AS passed FROM pg_policies WHERE schemaname = 'public' AND tablename = 'career_roles'
    UNION ALL
    -- 13 curated launch roles seeded
    SELECT (COUNT(*) = 13) AS passed FROM public.career_roles
    UNION ALL
    -- 13 unique slugs
    SELECT (COUNT(DISTINCT slug) = 13) AS passed FROM public.career_roles
    UNION ALL
    -- All 13 launch roles published
    SELECT (COUNT(*) = 13) AS passed FROM public.career_roles WHERE status = 'published'
    UNION ALL
    -- All roles in approved 6 areas
    SELECT BOOL_AND(career_area IN ('Software Engineering', 'Data & Analytics', 'Product & Delivery', 'Cloud & Infrastructure', 'Security & Compliance', 'Quality Engineering')) AS passed FROM public.career_roles
    UNION ALL
    -- All 5 JSONB columns are arrays across all rows
    SELECT BOOL_AND(
        jsonb_typeof(responsibilities) = 'array' AND
        jsonb_typeof(core_skills) = 'array' AND
        jsonb_typeof(supporting_skills) = 'array' AND
        jsonb_typeof(career_progression) = 'array' AND
        jsonb_typeof(related_roles) = 'array'
    ) AS passed FROM public.career_roles
    UNION ALL
    -- Zero self-references in related roles
    SELECT BOOL_AND(ref->>'slug' <> r.slug) AS passed 
    FROM public.career_roles r, jsonb_array_elements(r.related_roles) AS ref
    UNION ALL
    -- All related role target slugs resolve to existing roles
    SELECT BOOL_AND(EXISTS (SELECT 1 FROM public.career_roles target WHERE target.slug = ref->>'slug')) AS passed 
    FROM public.career_roles r, jsonb_array_elements(r.related_roles) AS ref
) AS verification;
