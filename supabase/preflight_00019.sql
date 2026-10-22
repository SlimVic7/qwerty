-- ============================================================
-- PREFLIGHT AUDIT: Migration 00019 (Stage 7.3 Learning Resources)
-- READ-ONLY SQL SCRIPT — RUN BEFORE MIGRATION 00019
-- DO NOT DEPLOY AUTOMATICALLY — INSPECT OUTPUT IN SUPABASE SQL EDITOR
-- ============================================================

-- A. Verify target table does NOT exist
SELECT 
    'A. target learning resources table absence' AS test_name,
    NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name = 'career_learning_resources'
    ) AS passed,
    'public.career_learning_resources must not exist prior to migration 00019' AS note;

-- B. Verify prerequisite table public.career_role_roadmap_items exists
SELECT 
    'B. career_role_roadmap_items table existence' AS test_name,
    EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'career_role_roadmap_items'
    ) AS passed,
    'public.career_role_roadmap_items must exist as foreign key target' AS note;

-- C. Verify career_role_roadmap_items.id is valid UUID primary key column
SELECT 
    'C. career_role_roadmap_items.id valid FK target' AS test_name,
    EXISTS (
        SELECT 1
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY(con.conkey)
        JOIN pg_type typ ON typ.oid = att.atttypid
        WHERE nsp.nspname = 'public'
          AND rel.relname = 'career_role_roadmap_items'
          AND con.contype = 'p'
          AND att.attname = 'id'
          AND typ.typname = 'uuid'
    ) AS passed,
    'public.career_role_roadmap_items.id must be a UUID column and primary key' AS note;

-- D. Verify all target constraint names do NOT already exist
SELECT 
    'D. target constraint names free' AS test_name,
    NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname IN (
            'chk_career_learning_resources_title',
            'chk_career_learning_resources_provider_name',
            'chk_career_learning_resources_resource_type',
            'chk_career_learning_resources_url',
            'chk_career_learning_resources_description',
            'chk_career_learning_resources_access_type',
            'chk_career_learning_resources_difficulty',
            'chk_career_learning_resources_display_order',
            'chk_career_learning_resources_status',
            'uq_career_learning_resources_item_order'
        )
    ) AS passed,
    'Target check and unique constraints must not be registered prior to migration' AS note;

-- E. Verify target index names do NOT exist
SELECT 
    'E. target index names free' AS test_name,
    NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public' 
          AND indexname IN (
            'idx_career_learning_resources_item_status_order',
            'idx_career_learning_resources_status'
          )
    ) AS passed,
    'Target indexes must not exist prior to migration' AS note;

-- F. Verify target trigger names do NOT exist
SELECT 
    'F. target trigger names free' AS test_name,
    NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'set_career_learning_resources_updated_at'
    ) AS passed,
    'Updated_at trigger for learning resources must not exist' AS note;

-- G. Verify target policies absent
SELECT 
    'G. target policies absent' AS test_name,
    NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' 
          AND tablename = 'career_learning_resources'
    ) AS passed,
    'No policies should exist for career_learning_resources prior to creation' AS note;

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

-- J. Verify no conflicting learning resource tables across schemas
SELECT 
    'J. no conflicting learning resources tables' AS test_name,
    (
        SELECT COUNT(*) FROM information_schema.tables 
        WHERE table_name = 'career_learning_resources'
    ) = 0 AS passed,
    'Zero conflicting career_learning_resources tables across schemas' AS note;

-- K. 00019 target objects not deployed yet
SELECT 
    'K. 00019 target objects not deployed' AS test_name,
    NOT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name = 'career_learning_resources'
    ) AND NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'set_career_learning_resources_updated_at'
    ) AS passed,
    'Target table and trigger must not be deployed yet' AS note;

-- L. Verify launch target roadmap item IDs exist in public.career_role_roadmap_items
SELECT 
    'L. launch roadmap items exist as FK targets' AS test_name,
    (
        SELECT COUNT(*) FROM public.career_role_roadmap_items
        WHERE id IN (
            'c1000000-0000-0000-0000-000000000001', -- frontend skill 1
            'c1000000-0000-0000-0000-000000000005', -- frontend skill 5
            'c1000000-0000-0000-0000-000000000006', -- frontend skill 6
            'c1000000-0000-0000-0000-000000000010', -- frontend skill 10
            'c1000000-0000-0000-0000-000000000014', -- backend skill 14
            'c1000000-0000-0000-0000-000000000015', -- backend skill 15
            'c1000000-0000-0000-0000-000000000017', -- backend skill 17
            'c1000000-0000-0000-0000-000000000023', -- backend skill 23
            'c1000000-0000-0000-0000-000000000025', -- data analyst skill 25
            'c1000000-0000-0000-0000-000000000030', -- data analyst skill 30
            'c1000000-0000-0000-0000-000000000033', -- data analyst skill 33
            'c1000000-0000-0000-0000-000000000035', -- product manager skill 35
            'c1000000-0000-0000-0000-000000000038', -- product manager skill 38
            'c1000000-0000-0000-0000-000000000042', -- product manager skill 42
            'c1000000-0000-0000-0000-000000000046', -- devops skill 46
            'c1000000-0000-0000-0000-000000000048', -- devops skill 48
            'c1000000-0000-0000-0000-000000000049', -- devops skill 49
            'c1000000-0000-0000-0000-000000000052', -- devops skill 52
            'c1000000-0000-0000-0000-000000000055', -- cyber skill 55
            'c1000000-0000-0000-0000-000000000060', -- cyber skill 60
            'c1000000-0000-0000-0000-000000000061', -- cyber skill 61
            'c1000000-0000-0000-0000-000000000062'  -- cyber skill 62
        )
    ) = 22 AS passed,
    'All 22 target launch roadmap skills must exist in public.career_role_roadmap_items' AS note;
