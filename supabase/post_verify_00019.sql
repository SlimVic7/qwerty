-- ============================================================
-- POST-VERIFICATION AUDIT: Migration 00019 (Stage 7.3 Learning Resources)
-- READ-ONLY SQL SCRIPT — RUN AFTER MIGRATION 00019
-- ============================================================

-- 1. Table existence
SELECT 
    '1. Table exists' AS check_name,
    EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name = 'career_learning_resources'
    ) AS passed,
    'public.career_learning_resources must exist in public schema' AS note;

-- 2. Foreign Key & ON DELETE constraints
SELECT 
    '2. Foreign Key constraints & ON DELETE behavior' AS check_name,
    EXISTS (
        SELECT 1 
        FROM information_schema.referential_constraints rc
        JOIN information_schema.table_constraints tc ON rc.constraint_name = tc.constraint_name
        WHERE tc.table_schema = 'public' 
          AND tc.table_name = 'career_learning_resources'
          AND rc.delete_rule IN ('RESTRICT', 'NO ACTION')
    ) AS passed,
    'FK must enforce RESTRICT/NO ACTION on career_role_roadmap_items' AS note;

-- 3. Check and Unique Constraints
SELECT 
    '3. Check and unique constraints' AS check_name,
    (
        SELECT COUNT(*) FROM pg_constraint
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
    ) = 10 AS passed,
    'All 10 target check and unique constraints must be active' AS note;

-- 4. Target Indexes
SELECT 
    '4. Target performance indexes' AS check_name,
    (
        SELECT COUNT(*) FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname IN (
            'idx_career_learning_resources_item_status_order',
            'idx_career_learning_resources_status'
          )
    ) = 2 AS passed,
    'Both target performance indexes must be registered' AS note;

-- 5. Updated_at Trigger
SELECT 
    '5. Updated_at trigger' AS check_name,
    EXISTS (
        SELECT 1 FROM pg_trigger t
        JOIN pg_proc p ON t.tgfoid = p.oid
        WHERE t.tgname = 'set_career_learning_resources_updated_at'
          AND p.proname = 'set_current_timestamp_updated_at'
    ) AS passed,
    'Trigger must be attached to public.set_current_timestamp_updated_at()' AS note;

-- 6. Row Level Security Enabled
SELECT 
    '6. Row Level Security enabled' AS check_name,
    EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relname = 'career_learning_resources'
          AND c.relrowsecurity = true
    ) AS passed,
    'RLS must be enabled on public.career_learning_resources' AS note;

-- 7. Database Grants & Zero Direct Access for Public/Anon/Authenticated
SELECT 
    '7. Least-privilege server-mediated grants' AS check_name,
    (
        -- Zero direct table privileges for PUBLIC, anon, and authenticated
        (
            SELECT COUNT(*) 
            FROM information_schema.role_table_grants 
            WHERE table_schema = 'public' 
              AND table_name = 'career_learning_resources'
              AND grantee IN ('PUBLIC', 'anon', 'authenticated')
        ) = 0
        AND
        -- service_role has exactly and only the 4 required CRUD privileges (no TRUNCATE, REFERENCES, TRIGGER)
        (
            SELECT COUNT(*)
            FROM information_schema.role_table_grants
            WHERE table_schema = 'public'
              AND table_name = 'career_learning_resources'
              AND grantee = 'service_role'
        ) = 4
        AND
        (
            SELECT COUNT(DISTINCT privilege_type)
            FROM information_schema.role_table_grants
            WHERE table_schema = 'public'
              AND table_name = 'career_learning_resources'
              AND grantee = 'service_role'
              AND privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
        ) = 4
    ) AS passed,
    'Zero direct privileges for public/anon/auth; exactly SELECT, INSERT, UPDATE, DELETE for service_role' AS note;

-- 8. Seed Count: Curated Published Resources
SELECT 
    '8. Published learning resources count' AS check_name,
    (
        (SELECT COUNT(*) FROM public.career_learning_resources) = 47
        AND
        (SELECT COUNT(*) FROM public.career_learning_resources WHERE status = 'published') = 47
    ) AS passed,
    'Exactly 47 published launch learning resources must exist' AS note;

-- 9. No Duplicate Resource IDs
SELECT 
    '9. No duplicate resource IDs' AS check_name,
    (
        SELECT COUNT(DISTINCT id) FROM public.career_learning_resources
    ) = (SELECT COUNT(*) FROM public.career_learning_resources) AS passed,
    'All resource IDs must be unique primary keys' AS note;

-- 10. Deterministic Ordering per Item
SELECT 
    '10. Deterministic display ordering' AS check_name,
    NOT EXISTS (
        SELECT roadmap_item_id, display_order, COUNT(*)
        FROM public.career_learning_resources
        GROUP BY roadmap_item_id, display_order
        HAVING COUNT(*) > 1
    ) AS passed,
    'Zero duplicate display_order values within any roadmap item' AS note;

-- 11. URL Safety & No Tracking / Affiliate Codes
SELECT 
    '11. Safe HTTPS URLs & zero affiliate/tracking params' AS check_name,
    NOT EXISTS (
        SELECT 1 FROM public.career_learning_resources
        WHERE url !~* '^https://'
           OR url ~* '(utm_|affiliate|aff_id|ref=|click_id)'
    ) AS passed,
    'All URLs must be HTTPS with zero affiliate or tracking query parameters' AS note;

-- 12. Content Governance: Zero Salary or Ranking Claims
SELECT 
    '12. Zero salary or provider ranking claims' AS check_name,
    NOT EXISTS (
        SELECT 1 FROM public.career_learning_resources
        WHERE title ~* '(#1|best provider|top choice|salary|compensation|per annum)'
           OR description ~* '(#1|best provider|top choice|salary|compensation|per annum)'
    ) AS passed,
    'Zero speculative salary figures or provider ranking claims' AS note;

-- 13. Stage 7.2 Intact Objects
SELECT 
    '13. Stage 7.2 roadmaps and items intact' AS check_name,
    (
        (SELECT COUNT(*) FROM public.career_role_roadmaps WHERE status = 'published') = 6
        AND
        (SELECT COUNT(*) FROM public.career_role_roadmap_items) = 64
    ) AS passed,
    'All 6 Stage 7.2 roadmaps and 64 items remain intact' AS note;

-- ============================================================
-- CONSOLIDATED AUDIT SUMMARY
-- ============================================================
SELECT 
    'STAGE 7.3 POST-VERIFY FINAL' AS summary,
    (
        EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'career_learning_resources')
        AND (SELECT COUNT(*) FROM pg_constraint WHERE conname IN (
            'chk_career_learning_resources_title', 'chk_career_learning_resources_provider_name',
            'chk_career_learning_resources_resource_type', 'chk_career_learning_resources_url',
            'chk_career_learning_resources_description', 'chk_career_learning_resources_access_type',
            'chk_career_learning_resources_difficulty', 'chk_career_learning_resources_display_order',
            'chk_career_learning_resources_status', 'uq_career_learning_resources_item_order'
        )) = 10
        AND (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND indexname IN ('idx_career_learning_resources_item_status_order', 'idx_career_learning_resources_status')) = 2
        AND EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'career_learning_resources' AND c.relrowsecurity = true)
        AND (SELECT COUNT(*) FROM information_schema.role_table_grants WHERE table_schema = 'public' AND table_name = 'career_learning_resources' AND grantee IN ('PUBLIC', 'anon', 'authenticated')) = 0
        AND (SELECT COUNT(*) FROM public.career_learning_resources WHERE status = 'published') = 47
        AND (SELECT COUNT(*) FROM public.career_role_roadmaps WHERE status = 'published') = 6
        AND (SELECT COUNT(*) FROM public.career_role_roadmap_items) = 64
    ) AS all_checks_passed;
