-- ============================================================
-- POST-VERIFICATION AUDIT: Migration 00021 (Stage 7.5 Personalized Development Roadmaps)
-- READ-ONLY SQL SCRIPT — RUN AFTER MIGRATION 00021
-- ============================================================

-- 1. Table existence
SELECT 
    '1. Tables exist' AS check_name,
    (
        SELECT COUNT(*) FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name IN ('candidate_development_plans', 'candidate_development_plan_items')
    ) = 2 AS passed,
    'Both candidate_development_plans and candidate_development_plan_items must exist' AS note

UNION ALL

-- 2. Expected columns and nullability for candidate_development_plans
SELECT 
    '2. candidate_development_plans columns structure' AS check_name,
    (
        SELECT COUNT(*) FROM information_schema.columns
        WHERE table_schema = 'public' 
          AND table_name = 'candidate_development_plans'
          AND (
            (column_name = 'id' AND data_type = 'uuid' AND is_nullable = 'NO') OR
            (column_name = 'user_id' AND data_type = 'uuid' AND is_nullable = 'NO') OR
            (column_name = 'career_role_id' AND data_type = 'uuid' AND is_nullable = 'NO') OR
            (column_name = 'roadmap_id' AND data_type = 'uuid' AND is_nullable = 'NO') OR
            (column_name = 'status' AND data_type = 'text' AND is_nullable = 'NO') OR
            (column_name = 'ruleset_version' AND data_type = 'text' AND is_nullable = 'NO') OR
            (column_name = 'summary' AND data_type = 'text' AND is_nullable = 'YES') OR
            (column_name = 'created_at' AND data_type LIKE '%timestamp%' AND is_nullable = 'NO') OR
            (column_name = 'updated_at' AND data_type LIKE '%timestamp%' AND is_nullable = 'NO') OR
            (column_name = 'archived_at' AND data_type LIKE '%timestamp%' AND is_nullable = 'YES')
          )
    ) = 10 AS passed,
    'All 10 required columns in candidate_development_plans must exist with matching types' AS note

UNION ALL

-- 3. Expected columns and nullability for candidate_development_plan_items
SELECT 
    '3. candidate_development_plan_items columns structure' AS check_name,
    (
        SELECT COUNT(*) FROM information_schema.columns
        WHERE table_schema = 'public' 
          AND table_name = 'candidate_development_plan_items'
          AND (
            (column_name = 'id' AND data_type = 'uuid' AND is_nullable = 'NO') OR
            (column_name = 'plan_id' AND data_type = 'uuid' AND is_nullable = 'NO') OR
            (column_name = 'roadmap_item_id' AND data_type = 'uuid' AND is_nullable = 'NO') OR
            (column_name = 'classification' AND data_type = 'text' AND is_nullable = 'NO') OR
            (column_name = 'priority' AND data_type = 'text' AND is_nullable = 'NO') OR
            (column_name = 'evidence_refs' AND data_type = 'jsonb' AND is_nullable = 'NO') OR
            (column_name = 'candidate_notes' AND data_type = 'text' AND is_nullable = 'YES') OR
            (column_name = 'display_order' AND data_type = 'integer' AND is_nullable = 'NO') OR
            (column_name = 'created_at' AND data_type LIKE '%timestamp%' AND is_nullable = 'NO') OR
            (column_name = 'updated_at' AND data_type LIKE '%timestamp%' AND is_nullable = 'NO')
          )
    ) = 10 AS passed,
    'All 10 required columns in candidate_development_plan_items must exist with matching types' AS note

UNION ALL

-- 4. Foreign key constraint rules (ON DELETE CASCADE for plan items, ON DELETE RESTRICT for roadmaps/roles/profiles)
SELECT 
    '4. Foreign Key constraints and delete rules' AS check_name,
    (
        -- plan_items -> plans CASCADE
        EXISTS (
            SELECT 1 FROM information_schema.referential_constraints rc
            JOIN information_schema.table_constraints tc ON rc.constraint_name = tc.constraint_name
            WHERE tc.table_schema = 'public' 
              AND tc.table_name = 'candidate_development_plan_items'
              AND rc.delete_rule = 'CASCADE'
        )
        AND
        -- plan_items -> roadmap_items RESTRICT/NO ACTION
        EXISTS (
            SELECT 1 FROM information_schema.referential_constraints rc
            JOIN information_schema.table_constraints tc ON rc.constraint_name = tc.constraint_name
            WHERE tc.table_schema = 'public' 
              AND tc.table_name = 'candidate_development_plan_items'
              AND rc.delete_rule IN ('RESTRICT', 'NO ACTION')
        )
        AND
        -- plans -> profiles CASCADE/RESTRICT/NO ACTION
        EXISTS (
            SELECT 1 FROM information_schema.referential_constraints rc
            JOIN information_schema.table_constraints tc ON rc.constraint_name = tc.constraint_name
            WHERE tc.table_schema = 'public' 
              AND tc.table_name = 'candidate_development_plans'
              AND rc.delete_rule IN ('CASCADE', 'RESTRICT', 'NO ACTION')
        )
    ) AS passed,
    'FK delete rules must enforce CASCADE on plan items, and CASCADE or RESTRICT on profiles/roadmaps' AS note

UNION ALL

-- 5. Partial unique index for active plan
SELECT 
    '5. Partial unique index for active plan' AS check_name,
    EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'candidate_development_plans'
          AND indexname = 'uq_candidate_development_plans_active'
    ) AS passed,
    'uq_candidate_development_plans_active partial unique index must exist' AS note

UNION ALL

-- 6. Performance indexes
SELECT 
    '6. Performance indexes' AS check_name,
    (
        SELECT COUNT(*) FROM pg_indexes
        WHERE schemaname = 'public' 
          AND indexname IN (
            'uq_candidate_development_plans_active',
            'idx_candidate_development_plans_user_status',
            'idx_candidate_development_plans_role',
            'idx_candidate_development_plans_roadmap',
            'idx_candidate_development_plan_items_plan_priority_order',
            'idx_candidate_development_plan_items_roadmap_item'
          )
    ) = 6 AS passed,
    'All 6 target indexes must be registered' AS note

UNION ALL

-- 7. Updated_at triggers
SELECT 
    '7. Updated_at triggers' AS check_name,
    (
        SELECT COUNT(*) FROM pg_trigger
        WHERE tgname IN (
            'set_candidate_development_plans_updated_at',
            'set_candidate_development_plan_items_updated_at'
        )
    ) = 2 AS passed,
    'Both updated_at triggers must be attached' AS note

UNION ALL

-- 8. Row Level Security enabled
SELECT 
    '8. Row Level Security enabled' AS check_name,
    (
        SELECT COUNT(*) FROM pg_tables
        WHERE schemaname = 'public' 
          AND tablename IN ('candidate_development_plans', 'candidate_development_plan_items')
          AND rowsecurity = true
    ) = 2 AS passed,
    'Row level security must be enabled on both tables' AS note

UNION ALL

-- 9. Zero direct client policies
SELECT 
    '9. Zero direct client policies' AS check_name,
    NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' 
          AND tablename IN ('candidate_development_plans', 'candidate_development_plan_items')
    ) AS passed,
    'Zero direct policies must exist on candidate plan tables' AS note

UNION ALL

-- 10. Table privileges: service_role has CRUD, zero for anon/authenticated/public
SELECT 
    '10. Least-privilege grants' AS check_name,
    (
        -- PUBLIC, anon, authenticated have no privileges
        NOT EXISTS (
            SELECT 1 FROM information_schema.table_privileges
            WHERE table_schema = 'public'
              AND table_name IN ('candidate_development_plans', 'candidate_development_plan_items')
              AND grantee IN ('PUBLIC', 'anon', 'authenticated')
        )
        AND
        -- service_role has SELECT, INSERT, UPDATE, DELETE
        (
            SELECT COUNT(DISTINCT privilege_type)
            FROM information_schema.table_privileges
            WHERE table_schema = 'public'
              AND table_name = 'candidate_development_plans'
              AND grantee = 'service_role'
              AND privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
        ) = 4
        AND
        -- service_role does NOT have TRUNCATE, REFERENCES, TRIGGER
        NOT EXISTS (
            SELECT 1 FROM information_schema.table_privileges
            WHERE table_schema = 'public'
              AND table_name IN ('candidate_development_plans', 'candidate_development_plan_items')
              AND grantee = 'service_role'
              AND privilege_type IN ('TRUNCATE', 'REFERENCES', 'TRIGGER')
        )
    ) AS passed,
    'Strict least-privilege grants must be verified for service_role only' AS note;
