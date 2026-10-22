-- ============================================================
-- PREFLIGHT AUDIT: Migration 00020 (Stage 7.4 Course Recommendations)
-- READ-ONLY SQL SCRIPT — RUN BEFORE MIGRATION 00020
-- DO NOT DEPLOY AUTOMATICALLY — INSPECT OUTPUT IN SUPABASE SQL EDITOR
-- ============================================================

SELECT 
    'A. target table absence' AS test_name,
    NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name = 'career_course_recommendations'
    ) AS passed,
    'public.career_course_recommendations must not exist prior to migration 00020' AS note

UNION ALL

SELECT 
    'B. career_role_roadmap_items table existence' AS test_name,
    EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'career_role_roadmap_items'
    ) AS passed,
    'public.career_role_roadmap_items must exist as foreign key target' AS note

UNION ALL

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
    'public.career_role_roadmap_items.id must be a UUID column and primary key' AS note

UNION ALL

SELECT 
    'D. target constraint names free' AS test_name,
    NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname IN (
            'chk_career_course_recommendations_title',
            'chk_career_course_recommendations_provider_name',
            'chk_career_course_recommendations_url',
            'chk_career_course_recommendations_description',
            'chk_career_course_recommendations_why',
            'chk_career_course_recommendations_access_type',
            'chk_career_course_recommendations_difficulty',
            'chk_career_course_recommendations_display_order',
            'chk_career_course_recommendations_status',
            'uq_career_course_recommendations_item_order',
            'uq_career_course_recommendations_item_url'
        )
    ) AS passed,
    'Target check and unique constraints must not be registered' AS note

UNION ALL

SELECT 
    'E. target index names free' AS test_name,
    NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public' 
          AND indexname IN (
            'idx_career_course_recommendations_item_status_order',
            'idx_career_course_recommendations_status'
          )
    ) AS passed,
    'Target indexes must not exist prior to migration' AS note

UNION ALL

SELECT 
    'F. target trigger name free' AS test_name,
    NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'set_career_course_recommendations_updated_at'
    ) AS passed,
    'Target update trigger must not exist' AS note

UNION ALL

SELECT 
    'G. target policies absent' AS test_name,
    NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' 
          AND tablename = 'career_course_recommendations'
    ) AS passed,
    'No policies should exist for course recommendations table prior to creation' AS note

UNION ALL

SELECT 
    'H. canonical updated_at function available' AS test_name,
    EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'set_current_timestamp_updated_at'
    ) AS passed,
    'public.set_current_timestamp_updated_at() must exist for update trigger' AS note

UNION ALL

SELECT 
    'I. required database roles exist' AS test_name,
    (
        SELECT COUNT(*) FROM pg_roles 
        WHERE rolname IN ('service_role', 'authenticated', 'anon')
    ) = 3 AS passed,
    'service_role, authenticated, and anon roles must be present' AS note

UNION ALL

SELECT 
    'J. no conflicting career_course_recommendations tables' AS test_name,
    (
        SELECT COUNT(*) FROM information_schema.tables 
        WHERE table_name = 'career_course_recommendations'
    ) = 0 AS passed,
    'Zero conflicting career_course_recommendations tables across schemas' AS note

UNION ALL

SELECT 
    'K. 00020 target objects not deployed' AS test_name,
    NOT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name = 'career_course_recommendations'
    ) AND NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'set_career_course_recommendations_updated_at'
    ) AS passed,
    'Target table and trigger must not be deployed yet' AS note

UNION ALL

SELECT 
    'L. all seed roadmap_item_id references exist' AS test_name,
    (
        SELECT COUNT(DISTINCT ri.id) 
        FROM public.career_role_roadmap_items ri
        JOIN public.career_role_roadmaps rm ON rm.id = ri.roadmap_id
        WHERE ri.id IN (
            'c1000000-0000-0000-0000-000000000001',
            'c1000000-0000-0000-0000-000000000003',
            'c1000000-0000-0000-0000-000000000006',
            'c1000000-0000-0000-0000-000000000010',
            'c1000000-0000-0000-0000-000000000014',
            'c1000000-0000-0000-0000-000000000016',
            'c1000000-0000-0000-0000-000000000017',
            'c1000000-0000-0000-0000-000000000023',
            'c1000000-0000-0000-0000-000000000025',
            'c1000000-0000-0000-0000-000000000028',
            'c1000000-0000-0000-0000-000000000030',
            'c1000000-0000-0000-0000-000000000033',
            'c1000000-0000-0000-0000-000000000035',
            'c1000000-0000-0000-0000-000000000036',
            'c1000000-0000-0000-0000-000000000038',
            'c1000000-0000-0000-0000-000000000042',
            'c1000000-0000-0000-0000-000000000045',
            'c1000000-0000-0000-0000-000000000049',
            'c1000000-0000-0000-0000-000000000051',
            'c1000000-0000-0000-0000-000000000052',
            'c1000000-0000-0000-0000-000000000055',
            'c1000000-0000-0000-0000-000000000060',
            'c1000000-0000-0000-0000-000000000061',
            'c1000000-0000-0000-0000-000000000063'
        )
        AND rm.status = 'published'
    ) = 24 AS passed,
    'All 24 target roadmap items must exist and belong to published roadmaps' AS note;
