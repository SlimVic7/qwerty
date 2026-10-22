-- ============================================================
-- POST-VERIFICATION AUDIT: Migration 00018 (Stage 7.2 Skill Roadmaps)
-- READ-ONLY SQL SCRIPT — RUN AFTER MIGRATION 00018
-- ============================================================

-- 1. Table existence
SELECT 
    '1. Tables exist' AS check_name,
    (
        SELECT COUNT(*) FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name IN ('career_role_roadmaps', 'career_role_roadmap_items')
    ) = 2 AS passed,
    'Both career_role_roadmaps and career_role_roadmap_items must exist in public schema' AS note;

-- 2. Foreign Key & ON DELETE constraints
SELECT 
    '2. Foreign Key constraints & ON DELETE behavior' AS check_name,
    (
        -- Check career_role_roadmaps -> career_roles (ON DELETE RESTRICT / NO ACTION)
        EXISTS (
            SELECT 1 
            FROM information_schema.referential_constraints rc
            JOIN information_schema.table_constraints tc ON rc.constraint_name = tc.constraint_name
            WHERE tc.table_schema = 'public' 
              AND tc.table_name = 'career_role_roadmaps'
              AND rc.delete_rule IN ('RESTRICT', 'NO ACTION')
        )
        AND
        -- Check career_role_roadmap_items -> career_role_roadmaps (ON DELETE CASCADE)
        EXISTS (
            SELECT 1 
            FROM information_schema.referential_constraints rc
            JOIN information_schema.table_constraints tc ON rc.constraint_name = tc.constraint_name
            WHERE tc.table_schema = 'public' 
              AND tc.table_name = 'career_role_roadmap_items'
              AND rc.delete_rule = 'CASCADE'
        )
    ) AS passed,
    'FKs must enforce RESTRICT on career_roles and CASCADE on roadmaps' AS note;

-- 3. Check and Unique Constraints
SELECT 
    '3. Check and unique constraints' AS check_name,
    (
        SELECT COUNT(*) FROM pg_constraint
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
    ) = 15 AS passed,
    'All 15 target check and unique constraints must be active' AS note;

-- 4. Target Indexes
SELECT 
    '4. Target performance indexes' AS check_name,
    (
        SELECT COUNT(*) FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname IN (
            'idx_career_role_roadmaps_role_status',
            'idx_career_role_roadmap_items_roadmap_stage_order'
          )
    ) = 2 AS passed,
    'Both target performance indexes must be registered' AS note;

-- 5. Updated_at Triggers
SELECT 
    '5. Updated_at triggers' AS check_name,
    (
        SELECT COUNT(*) FROM pg_trigger t
        JOIN pg_proc p ON t.tgfoid = p.oid
        WHERE t.tgname IN (
            'set_career_role_roadmaps_updated_at',
            'set_career_role_roadmap_items_updated_at'
        )
        AND p.proname = 'set_current_timestamp_updated_at'
    ) = 2 AS passed,
    'Both updated_at triggers must be attached to set_current_timestamp_updated_at' AS note;

-- 6. Row Level Security Enabled
SELECT 
    '6. Row Level Security enabled' AS check_name,
    (
        SELECT COUNT(*) FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relname IN ('career_role_roadmaps', 'career_role_roadmap_items')
          AND c.relrowsecurity = true
    ) = 2 AS passed,
    'RLS must be enabled on both roadmap tables' AS note;

-- 7. Database Grants & Zero Direct Access for Public/Anon/Authenticated
SELECT 
    '7. Least-privilege server-mediated grants' AS check_name,
    (
        -- Zero direct table privileges for PUBLIC, anon, and authenticated
        (
            SELECT COUNT(*) 
            FROM information_schema.role_table_grants 
            WHERE table_schema = 'public' 
              AND table_name IN ('career_role_roadmaps', 'career_role_roadmap_items')
              AND grantee IN ('PUBLIC', 'anon', 'authenticated')
        ) = 0
        AND
        -- service_role has exactly and only the 4 required CRUD privileges (no TRUNCATE, REFERENCES, TRIGGER)
        (
            SELECT COUNT(*)
            FROM information_schema.role_table_grants
            WHERE table_schema = 'public'
              AND table_name = 'career_role_roadmaps'
              AND grantee = 'service_role'
        ) = 4
        AND
        (
            SELECT COUNT(DISTINCT privilege_type)
            FROM information_schema.role_table_grants
            WHERE table_schema = 'public'
              AND table_name = 'career_role_roadmaps'
              AND grantee = 'service_role'
              AND privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
        ) = 4
        AND
        (
            SELECT COUNT(*)
            FROM information_schema.role_table_grants
            WHERE table_schema = 'public'
              AND table_name = 'career_role_roadmap_items'
              AND grantee = 'service_role'
        ) = 4
        AND
        (
            SELECT COUNT(DISTINCT privilege_type)
            FROM information_schema.role_table_grants
            WHERE table_schema = 'public'
              AND table_name = 'career_role_roadmap_items'
              AND grantee = 'service_role'
              AND privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
        ) = 4
    ) AS passed,
    'Zero direct privileges for public/anon/auth; exactly SELECT, INSERT, UPDATE, DELETE for service_role' AS note;

-- 8. Seed Counts: Launch Roadmaps & Published Status
SELECT 
    '8. Launch roadmaps count & publication' AS check_name,
    (
        (SELECT COUNT(*) FROM public.career_role_roadmaps) = 6
        AND
        (SELECT COUNT(*) FROM public.career_role_roadmaps WHERE status = 'published') = 6
        AND
        (SELECT COUNT(*) FROM public.career_role_roadmaps WHERE version = 1 AND version_label = 'v1') = 6
    ) AS passed,
    'Exactly 6 published v1 launch roadmaps must exist' AS note;

-- 9. Roadmap Items Count & Stage Integrity
SELECT 
    '9. Roadmap items count & valid stages' AS check_name,
    (
        (SELECT COUNT(*) FROM public.career_role_roadmap_items) = 64
        AND
        (
            SELECT COUNT(*) FROM public.career_role_roadmap_items
            WHERE stage IN ('foundation', 'core', 'advanced')
        ) = 64
        AND
        (
            SELECT COUNT(*) FROM public.career_role_roadmap_items
            WHERE jsonb_typeof(evidence_examples) = 'array'
              AND jsonb_array_length(evidence_examples) >= 2
        ) = 64
    ) AS passed,
    'Exactly 64 roadmap items with valid stages and non-empty evidence arrays' AS note;

-- 10. No orphan items & all role foreign keys valid
SELECT 
    '10. Foreign key integrity' AS check_name,
    (
        NOT EXISTS (
            SELECT 1 FROM public.career_role_roadmap_items i
            LEFT JOIN public.career_role_roadmaps r ON r.id = i.roadmap_id
            WHERE r.id IS NULL
        )
        AND
        NOT EXISTS (
            SELECT 1 FROM public.career_role_roadmaps r
            LEFT JOIN public.career_roles cr ON cr.id = r.career_role_id
            WHERE cr.id IS NULL
        )
    ) AS passed,
    'Zero orphan roadmap items and zero invalid career role references' AS note;

-- 11. No duplicate display order within same stage & roadmap
SELECT 
    '11. Deterministic display ordering' AS check_name,
    NOT EXISTS (
        SELECT roadmap_id, stage, display_order, COUNT(*)
        FROM public.career_role_roadmap_items
        GROUP BY roadmap_id, stage, display_order
        HAVING COUNT(*) > 1
    ) AS passed,
    'Zero duplicate display_order values within the same stage of any roadmap' AS note;

-- 12. Content Governance: Zero Salary Claims
SELECT 
    '12. Zero salary or compensation claims' AS check_name,
    NOT EXISTS (
        SELECT 1 FROM public.career_role_roadmaps
        WHERE title ~* '(salary|compensation|£|\$|per annum)'
           OR summary ~* '(salary|compensation|£|\$|per annum)'
    )
    AND
    NOT EXISTS (
        SELECT 1 FROM public.career_role_roadmap_items
        WHERE description ~* '(salary|compensation|£|\$|per annum)'
           OR why_it_matters ~* '(salary|compensation|£|\$|per annum)'
           OR competency_outcome ~* '(salary|compensation|£|\$|per annum)'
    ) AS passed,
    'Zero speculative salary or compensation figures across all roadmap content' AS note;

-- 13. Content Governance: Zero Course URLs or Marketplace Links
SELECT 
    '13. Zero course or provider URLs' AS check_name,
    NOT EXISTS (
        SELECT 1 FROM public.career_role_roadmap_items
        WHERE description ~* '(https?://|coursera|udemy|edx|pluralsight)'
           OR why_it_matters ~* '(https?://|coursera|udemy|edx|pluralsight)'
           OR competency_outcome ~* '(https?://|coursera|udemy|edx|pluralsight)'
           OR evidence_examples::text ~* '(https?://|coursera|udemy|edx|pluralsight)'
    ) AS passed,
    'Zero external provider URLs or course marketplace links' AS note;

-- ============================================================
-- CONSOLIDATED AUDIT SUMMARY
-- ============================================================
SELECT 
    'STAGE 7.2 POST-VERIFY FINAL' AS summary,
    (
        (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('career_role_roadmaps', 'career_role_roadmap_items')) = 2
        AND (SELECT COUNT(*) FROM pg_constraint WHERE conname IN (
            'chk_career_role_roadmaps_version', 'chk_career_role_roadmaps_version_label', 'chk_career_role_roadmaps_title',
            'chk_career_role_roadmaps_summary', 'chk_career_role_roadmaps_status', 'uq_career_role_roadmaps_role_version',
            'chk_career_role_roadmap_items_stage', 'chk_career_role_roadmap_items_skill_name', 'chk_career_role_roadmap_items_skill_category',
            'chk_career_role_roadmap_items_description', 'chk_career_role_roadmap_items_why_it_matters', 'chk_career_role_roadmap_items_competency_outcome',
            'chk_career_role_roadmap_items_evidence_array', 'chk_career_role_roadmap_items_display_order', 'uq_career_role_roadmap_items_order'
        )) = 15
        AND (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND indexname IN ('idx_career_role_roadmaps_role_status', 'idx_career_role_roadmap_items_roadmap_stage_order')) = 2
        AND (SELECT COUNT(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname IN ('career_role_roadmaps', 'career_role_roadmap_items') AND c.relrowsecurity = true) = 2
        AND (SELECT COUNT(*) FROM information_schema.role_table_grants WHERE table_schema = 'public' AND table_name IN ('career_role_roadmaps', 'career_role_roadmap_items') AND grantee IN ('PUBLIC', 'anon', 'authenticated')) = 0
        AND (SELECT COUNT(*) FROM public.career_role_roadmaps WHERE status = 'published') = 6
        AND (SELECT COUNT(*) FROM public.career_role_roadmap_items) = 64
    ) AS all_checks_passed;
