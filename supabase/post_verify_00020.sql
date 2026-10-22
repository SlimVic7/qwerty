-- ============================================================
-- POST-VERIFICATION AUDIT: Migration 00020 (Stage 7.4 Course Recommendations)
-- READ-ONLY SQL SCRIPT — RUN AFTER MIGRATION 00020
-- ============================================================

-- 1. Table existence
SELECT 
    '1. Table exists' AS check_name,
    EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name = 'career_course_recommendations'
    ) AS passed,
    'public.career_course_recommendations must exist' AS note

UNION ALL

-- 2. Expected columns and nullability
SELECT 
    '2. Columns structure' AS check_name,
    (
        SELECT COUNT(*) FROM information_schema.columns
        WHERE table_schema = 'public' 
          AND table_name = 'career_course_recommendations'
          AND (
            (column_name = 'id' AND data_type = 'uuid' AND is_nullable = 'NO') OR
            (column_name = 'roadmap_item_id' AND data_type = 'uuid' AND is_nullable = 'NO') OR
            (column_name = 'title' AND data_type = 'text' AND is_nullable = 'NO') OR
            (column_name = 'provider_name' AND data_type = 'text' AND is_nullable = 'NO') OR
            (column_name = 'url' AND data_type = 'text' AND is_nullable = 'NO') OR
            (column_name = 'description' AND data_type = 'text' AND is_nullable = 'NO') OR
            (column_name = 'why_this_course' AND data_type = 'text' AND is_nullable = 'NO') OR
            (column_name = 'access_type' AND data_type = 'text' AND is_nullable = 'NO') OR
            (column_name = 'difficulty' AND data_type = 'text' AND is_nullable = 'YES') OR
            (column_name = 'display_order' AND data_type = 'integer' AND is_nullable = 'NO') OR
            (column_name = 'status' AND data_type = 'text' AND is_nullable = 'NO') OR
            (column_name = 'created_at' AND data_type LIKE '%timestamp%' AND is_nullable = 'NO') OR
            (column_name = 'updated_at' AND data_type LIKE '%timestamp%' AND is_nullable = 'NO')
          )
    ) = 13 AS passed,
    'All 13 required columns must exist with matching types and nullability' AS note

UNION ALL

-- 3. Foreign key constraint & ON DELETE RESTRICT
SELECT 
    '3. Foreign Key constraint (ON DELETE RESTRICT)' AS check_name,
    EXISTS (
        SELECT 1 
        FROM information_schema.referential_constraints rc
        JOIN information_schema.table_constraints tc ON rc.constraint_name = tc.constraint_name
        WHERE tc.table_schema = 'public' 
          AND tc.table_name = 'career_course_recommendations'
          AND rc.delete_rule IN ('RESTRICT', 'NO ACTION')
    ) AS passed,
    'FK to career_role_roadmap_items must enforce ON DELETE RESTRICT' AS note

UNION ALL

-- 4. Check and unique constraints
SELECT 
    '4. Constraints count and registration' AS check_name,
    (
        SELECT COUNT(*) FROM pg_constraint
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
    ) = 11 AS passed,
    'All 11 check and unique constraints must be active' AS note

UNION ALL

-- 5. Performance indexes
SELECT 
    '5. Performance indexes' AS check_name,
    (
        SELECT COUNT(*) FROM pg_indexes
        WHERE schemaname = 'public' 
          AND indexname IN (
            'idx_career_course_recommendations_item_status_order',
            'idx_career_course_recommendations_status'
          )
    ) = 2 AS passed,
    'Both target indexes must be registered' AS note

UNION ALL

-- 6. Updated_at trigger
SELECT 
    '6. Updated_at trigger' AS check_name,
    EXISTS (
        SELECT 1 FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        JOIN pg_proc p ON p.oid = t.tgfoid
        WHERE c.relname = 'career_course_recommendations'
          AND t.tgname = 'set_career_course_recommendations_updated_at'
          AND p.proname = 'set_current_timestamp_updated_at'
    ) AS passed,
    'Trigger must point to public.set_current_timestamp_updated_at()' AS note

UNION ALL

-- 7. RLS Enabled & Zero Policies
SELECT 
    '7. RLS enabled with zero candidate-facing policies' AS check_name,
    (
        (SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'career_course_recommendations') = true
        AND
        (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'career_course_recommendations') = 0
    ) AS passed,
    'RLS must be enabled with zero policies (server-mediated access model)' AS note

UNION ALL

-- 8. Table privilege lockdown
SELECT 
    '8. Table privilege lockdown' AS check_name,
    (
        -- Zero public/anon/authenticated access
        (
            SELECT COUNT(*) FROM information_schema.role_table_grants 
            WHERE table_schema = 'public' 
              AND table_name = 'career_course_recommendations'
              AND grantee IN ('PUBLIC', 'anon', 'authenticated')
        ) = 0
        AND
        -- service_role has exactly SELECT, INSERT, UPDATE, DELETE
        (
            SELECT COUNT(*) FROM information_schema.role_table_grants 
            WHERE table_schema = 'public' 
              AND table_name = 'career_course_recommendations'
              AND grantee = 'service_role'
              AND privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
        ) = 4
        AND
        -- service_role does NOT have TRUNCATE, REFERENCES, TRIGGER
        (
            SELECT COUNT(*) FROM information_schema.role_table_grants 
            WHERE table_schema = 'public' 
              AND table_name = 'career_course_recommendations'
              AND grantee = 'service_role'
              AND privilege_type IN ('TRUNCATE', 'REFERENCES', 'TRIGGER')
        ) = 0
    ) AS passed,
    'Strict table grants: zero anon/auth, service_role has CRUD only, no TRUNCATE/REFERENCES/TRIGGER' AS note

UNION ALL

-- 9. Seed counts
SELECT 
    '9. Exactly 24 published launch courses' AS check_name,
    (
        SELECT COUNT(*) FROM public.career_course_recommendations
        WHERE status = 'published'
    ) = 24 AS passed,
    'Launch catalogue must contain exactly 24 published courses' AS note

UNION ALL

-- 10. Role distribution (exactly 6 roles, 4 courses each)
SELECT 
    '10. Course distribution by role' AS check_name,
    (
        WITH role_course_counts AS (
            SELECT rm.career_role_id, COUNT(c.id) AS course_count
            FROM public.career_course_recommendations c
            JOIN public.career_role_roadmap_items ri ON ri.id = c.roadmap_item_id
            JOIN public.career_role_roadmaps rm ON rm.id = ri.roadmap_id
            GROUP BY rm.career_role_id
        )
        SELECT COUNT(*) = 6 AND bool_and(course_count = 4)
        FROM role_course_counts
    ) AS passed,
    'All 6 published launch roles must have exactly 4 course recommendations' AS note

UNION ALL

-- 11. Roadmap stage representation (each role has foundation, core, advanced)
SELECT 
    '11. Stage coverage per role' AS check_name,
    (
        WITH role_stage_counts AS (
            SELECT rm.career_role_id,
                   COUNT(DISTINCT ri.stage) AS distinct_stages
            FROM public.career_course_recommendations c
            JOIN public.career_role_roadmap_items ri ON ri.id = c.roadmap_item_id
            JOIN public.career_role_roadmaps rm ON rm.id = ri.roadmap_id
            GROUP BY rm.career_role_id
        )
        SELECT COUNT(*) = 6 AND bool_and(distinct_stages = 3)
        FROM role_stage_counts
    ) AS passed,
    'Each role must have at least 1 course across foundation, core, and advanced stages' AS note

UNION ALL

-- 12. Safe HTTPS URLs & Zero Tracking / Affiliate
SELECT 
    '12. Safe HTTPS URLs and zero affiliate tracking' AS check_name,
    (
        -- All URLs start with https:// and have no whitespace
        (
            SELECT COUNT(*) FROM public.career_course_recommendations
            WHERE url NOT LIKE 'https://%' OR url ~ '\s'
        ) = 0
        AND
        -- Zero tracking / affiliate parameters
        (
            SELECT COUNT(*) FROM public.career_course_recommendations
            WHERE url ~* '(utm_|affiliate|ref=|referral|click_id|partner_id)'
        ) = 0
    ) AS passed,
    'All course URLs must be clean HTTPS with zero affiliate or tracking parameters' AS note

UNION ALL

-- 13. Zero draft or archived launch seeds
SELECT 
    '13. Zero draft or archived seeds' AS check_name,
    (
        SELECT COUNT(*) FROM public.career_course_recommendations
        WHERE status IN ('draft', 'archived')
    ) = 0 AS passed,
    'All 24 launch course recommendations must have published status' AS note

UNION ALL

-- 14. No orphan roadmap_item_id references
SELECT 
    '14. Foreign key integrity' AS check_name,
    NOT EXISTS (
        SELECT 1 FROM public.career_course_recommendations c
        LEFT JOIN public.career_role_roadmap_items ri ON ri.id = c.roadmap_item_id
        WHERE ri.id IS NULL
    ) AS passed,
    'Zero orphan course recommendation records' AS note;

-- ============================================================
-- CONSOLIDATED AUDIT SUMMARY
-- ============================================================
SELECT 
    'STAGE 7.4 POST-VERIFY FINAL' AS summary,
    (
        (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'career_course_recommendations') = 1
        AND (SELECT COUNT(*) FROM pg_constraint WHERE conname IN (
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
        )) = 11
        AND (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND indexname IN (
            'idx_career_course_recommendations_item_status_order',
            'idx_career_course_recommendations_status'
        )) = 2
        AND (SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'career_course_recommendations') = true
        AND (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'career_course_recommendations') = 0
        AND (SELECT COUNT(*) FROM information_schema.role_table_grants WHERE table_schema = 'public' AND table_name = 'career_course_recommendations' AND grantee IN ('PUBLIC', 'anon', 'authenticated')) = 0
        AND (SELECT COUNT(*) FROM public.career_course_recommendations WHERE status = 'published') = 24
        AND (SELECT COUNT(*) FROM public.career_course_recommendations WHERE url ~* '(utm_|affiliate|ref=|referral|click_id|partner_id)') = 0
    ) AS all_checks_passed;
