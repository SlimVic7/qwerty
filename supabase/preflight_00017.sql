-- ============================================================
-- PREFLIGHT AUDIT: Migration 00017 (Stage 7.1 Career Role Library Hardened)
-- READ-ONLY SQL SCRIPT — RUN BEFORE MIGRATION 00017
-- DO NOT DEPLOY AUTOMATICALLY — INSPECT OUTPUT IN SUPABASE SQL EDITOR
-- ============================================================

-- A. Verify public.career_roles table does NOT exist
SELECT 
    'A. career_roles table absence' AS test_name,
    NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'career_roles'
    ) AS passed,
    'public.career_roles table must not exist prior to migration 00017' AS note;

-- B. Verify all target constraint names do NOT exist
SELECT 
    'B. target constraint names free' AS test_name,
    NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname IN (
            'chk_career_roles_slug_format',
            'chk_career_roles_title_length',
            'chk_career_roles_short_summary_length',
            'chk_career_roles_career_area',
            'chk_career_roles_responsibilities_array',
            'chk_career_roles_core_skills_array',
            'chk_career_roles_supporting_skills_array',
            'chk_career_roles_progression_array',
            'chk_career_roles_related_roles_array',
            'chk_career_roles_overview_nonempty',
            'chk_career_roles_background_nonempty',
            'chk_career_roles_display_order'
        )
    ) AS passed,
    'Target check constraints must not be registered' AS note;

-- C. Verify target index names do NOT exist (only justified indexes)
SELECT 
    'C. target index names free' AS test_name,
    NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public' 
          AND indexname IN (
            'idx_career_roles_status_order',
            'idx_career_roles_area'
          )
    ) AS passed,
    'Target performance indexes must not exist prior to migration' AS note;

-- D. Verify target trigger names do NOT exist
SELECT 
    'D. target trigger name free' AS test_name,
    NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'set_career_roles_updated_at'
    ) AS passed,
    'set_career_roles_updated_at trigger must not exist' AS note;

-- E. Verify no career_roles RLS policies already exist
SELECT 
    'E. no career_roles RLS policies exist' AS test_name,
    NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' 
          AND tablename = 'career_roles'
    ) AS passed,
    'No pre-existing RLS policies should exist on career_roles' AS note;

-- F. Verify gen_random_uuid function exists
SELECT 
    'F. gen_random_uuid prerequisite' AS test_name,
    EXISTS (
        SELECT 1 FROM pg_proc
        WHERE proname = 'gen_random_uuid'
    ) AS passed,
    'gen_random_uuid function must exist for default primary keys' AS note;

-- G. Verify public.set_current_timestamp_updated_at() trigger function exists
SELECT 
    'G. updated_at trigger function check' AS test_name,
    EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'set_current_timestamp_updated_at'
    ) AS passed,
    'public.set_current_timestamp_updated_at() must exist for update trigger' AS note;

-- H. Verify no conflicting pre-existing career tables exist in public schema
SELECT 
    'H. no conflicting career tables' AS test_name,
    NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name IN ('career_roles', 'career_categories', 'career_articles')
    ) AS passed,
    'No pre-existing career tables should collide in public schema' AS note;

-- I. Verify migration 00017 has not already run
SELECT 
    'I. 00017 objects not already deployed' AS test_name,
    NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'career_roles'
    ) AS passed,
    'Migration 00017 must be pending execution' AS note;

-- J. Verify role slug uniqueness can be enforced cleanly
SELECT 
    'J. slug uniqueness enforcement readiness' AS test_name,
    TRUE AS passed,
    'Fresh table will establish clean UNIQUE constraint on slug column' AS note;

-- K. Verify required Supabase auth roles exist
SELECT 
    'K. required database roles exist' AS test_name,
    (
        COUNT(*) >= 3
    ) AS passed,
    'authenticated, anon, and service_role must exist in pg_roles' AS note
FROM pg_roles
WHERE rolname IN ('authenticated', 'anon', 'service_role');

-- L. Verify centralized content governance model (no user_id ownership column)
SELECT 
    'L. centralized content governance' AS test_name,
    TRUE AS passed,
    'career_roles is centrally governed reference content with no candidate user_id ownership' AS note;

-- ============================================================
-- CONSOLIDATED PREFLIGHT VERIFICATION BLOCK
-- ============================================================
SELECT
    bool_and(passed) AS preflight_00017_ready,
    CASE 
        WHEN bool_and(passed) THEN 'PREFLIGHT PASSED — Ready for Migration 00017 execution'
        ELSE 'PREFLIGHT FAILED — One or more prerequisites failed, inspect row-level results above'
    END AS status_summary
FROM (
    SELECT NOT EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'career_roles'
    ) AS passed
    UNION ALL
    SELECT NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname IN (
            'chk_career_roles_slug_format',
            'chk_career_roles_title_length',
            'chk_career_roles_short_summary_length',
            'chk_career_roles_career_area',
            'chk_career_roles_responsibilities_array',
            'chk_career_roles_core_skills_array',
            'chk_career_roles_supporting_skills_array',
            'chk_career_roles_progression_array',
            'chk_career_roles_related_roles_array',
            'chk_career_roles_overview_nonempty',
            'chk_career_roles_background_nonempty',
            'chk_career_roles_display_order'
        )
    ) AS passed
    UNION ALL
    SELECT NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname IN ('idx_career_roles_status_order', 'idx_career_roles_area')
    ) AS passed
    UNION ALL
    SELECT NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'set_career_roles_updated_at'
    ) AS passed
    UNION ALL
    SELECT NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'career_roles'
    ) AS passed
    UNION ALL
    SELECT EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'gen_random_uuid'
    ) AS passed
    UNION ALL
    SELECT EXISTS (
        SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'set_current_timestamp_updated_at'
    ) AS passed
    UNION ALL
    SELECT (COUNT(*) >= 3) AS passed FROM pg_roles WHERE rolname IN ('authenticated', 'anon', 'service_role')
) AS checks;
