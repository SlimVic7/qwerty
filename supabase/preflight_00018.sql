-- ============================================================
-- PREFLIGHT AUDIT: Migration 00018 (Stage 7.2 Skill Roadmaps)
-- READ-ONLY SQL SCRIPT — RUN BEFORE MIGRATION 00018
-- DO NOT DEPLOY AUTOMATICALLY — INSPECT OUTPUT IN SUPABASE SQL EDITOR
-- ============================================================

-- A. Verify target tables do NOT exist
SELECT 
    'A. target roadmap tables absence' AS test_name,
    NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name IN ('career_role_roadmaps', 'career_role_roadmap_items')
    ) AS passed,
    'public.career_role_roadmaps and public.career_role_roadmap_items must not exist prior to migration 00018' AS note;

-- B. Verify prerequisite table public.career_roles exists
SELECT 
    'B. career_roles table existence' AS test_name,
    EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'career_roles'
    ) AS passed,
    'public.career_roles must exist as foreign key target' AS note;

-- C. Verify career_roles.id is valid UUID primary key column
SELECT 
    'C. career_roles.id valid FK target' AS test_name,
    EXISTS (
        SELECT 1
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY(con.conkey)
        JOIN pg_type typ ON typ.oid = att.atttypid
        WHERE nsp.nspname = 'public'
          AND rel.relname = 'career_roles'
          AND con.contype = 'p'
          AND att.attname = 'id'
          AND typ.typname = 'uuid'
    ) AS passed,
    'public.career_roles.id must be a UUID column and the primary key' AS note;

-- D. Verify all target constraint names do NOT already exist
SELECT 
    'D. target constraint names free' AS test_name,
    NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname IN (
            'chk_career_role_roadmaps_version',
            'chk_career_role_roadmaps_version_label',
            'chk_career_role_roadmaps_title',
            'chk_career_role_roadmaps_summary',
            'chk_career_role_roadmaps_status',
            'uq_career_role_roadmaps_role_version',
            'chk_career_role_roadmap_items_stage',
            'chk_career_role_roadmap_items_skill_name',
            'chk_career_role_roadmap_items_skill_category',
            'chk_career_role_roadmap_items_description',
            'chk_career_role_roadmap_items_why_it_matters',
            'chk_career_role_roadmap_items_competency_outcome',
            'chk_career_role_roadmap_items_evidence_array',
            'chk_career_role_roadmap_items_display_order',
            'uq_career_role_roadmap_items_order'
        )
    ) AS passed,
    'Target check and unique constraints must not be registered' AS note;

-- E. Verify target index names do NOT exist
SELECT 
    'E. target index names free' AS test_name,
    NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public' 
          AND indexname IN (
            'idx_career_role_roadmaps_role_status',
            'idx_career_role_roadmap_items_roadmap_stage_order'
          )
    ) AS passed,
    'Target roadmap indexes must not exist prior to migration' AS note;

-- F. Verify target trigger names do NOT exist
SELECT 
    'F. target trigger names free' AS test_name,
    NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname IN (
            'set_career_role_roadmaps_updated_at',
            'set_career_role_roadmap_items_updated_at'
        )
    ) AS passed,
    'Updated_at triggers for roadmap tables must not exist' AS note;

-- G. Verify target policies absent
SELECT 
    'G. target policies absent' AS test_name,
    NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' 
          AND tablename IN ('career_role_roadmaps', 'career_role_roadmap_items')
    ) AS passed,
    'No policies should exist for roadmap tables prior to creation' AS note;

-- H. Verify public.set_current_timestamp_updated_at() trigger function exists
SELECT 
    'H. updated_at function available' AS test_name,
    EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'set_current_timestamp_updated_at'
    ) AS passed,
    'public.set_current_timestamp_updated_at() must exist for update trigger' AS note;

-- I. Verify required database roles exist
SELECT 
    'I. required database roles exist' AS test_name,
    (
        SELECT COUNT(*) FROM pg_roles 
        WHERE rolname IN ('service_role', 'authenticated', 'anon')
    ) = 3 AS passed,
    'service_role, authenticated, and anon roles must be present' AS note;

-- J. Verify no conflicting roadmap tables in any schema
SELECT 
    'J. no conflicting roadmap tables' AS test_name,
    (
        SELECT COUNT(*) FROM information_schema.tables 
        WHERE table_name IN ('career_role_roadmaps', 'career_role_roadmap_items')
    ) = 0 AS passed,
    'Zero conflicting roadmap tables across schemas' AS note;

-- K. 00018 target objects not deployed
SELECT 
    'K. 00018 target objects not deployed' AS test_name,
    NOT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name IN ('career_role_roadmaps', 'career_role_roadmap_items')
    ) AND NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname IN ('set_career_role_roadmaps_updated_at', 'set_career_role_roadmap_items_updated_at')
    ) AS passed,
    'Target tables and triggers must not be deployed yet' AS note;

-- L. Verify launch roadmap target role IDs exist among Stage 7.1 roles
SELECT 
    'L. launch roadmap role references exist' AS test_name,
    (
        SELECT COUNT(*) FROM public.career_roles
        WHERE id IN (
            'a1000000-0000-0000-0000-000000000001', -- frontend-engineer
            'a1000000-0000-0000-0000-000000000002', -- backend-engineer
            'a1000000-0000-0000-0000-000000000005', -- data-analyst
            'a1000000-0000-0000-0000-000000000008', -- product-manager
            'a1000000-0000-0000-0000-000000000010', -- devops-engineer
            'a1000000-0000-0000-0000-000000000012'  -- cybersecurity-analyst
        ) AND status = 'published'
    ) = 6 AS passed,
    'All 6 launch roles must exist and be published in public.career_roles' AS note;
