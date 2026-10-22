-- ============================================================
-- PREFLIGHT AUDIT: Migration 00021 (Stage 7.5 Personalized Development Roadmaps)
-- READ-ONLY SQL SCRIPT — RUN BEFORE MIGRATION 00021
-- DO NOT DEPLOY AUTOMATICALLY — INSPECT OUTPUT IN SUPABASE SQL EDITOR
-- ============================================================

SELECT 
    'A. candidate_development_plans table absence' AS test_name,
    NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name = 'candidate_development_plans'
    ) AS passed,
    'public.candidate_development_plans must not exist prior to migration 00021' AS note

UNION ALL

SELECT 
    'B. candidate_development_plan_items table absence' AS test_name,
    NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name = 'candidate_development_plan_items'
    ) AS passed,
    'public.candidate_development_plan_items must not exist prior to migration 00021' AS note

UNION ALL

SELECT 
    'C. profiles table existence' AS test_name,
    EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'profiles'
    ) AS passed,
    'public.profiles must exist as foreign key target for user_id' AS note

UNION ALL

SELECT 
    'D. career_roles table existence' AS test_name,
    EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'career_roles'
    ) AS passed,
    'public.career_roles must exist as foreign key target for career_role_id' AS note

UNION ALL

SELECT 
    'E. career_role_roadmaps table existence' AS test_name,
    EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'career_role_roadmaps'
    ) AS passed,
    'public.career_role_roadmaps must exist as foreign key target for roadmap_id' AS note

UNION ALL

SELECT 
    'F. career_role_roadmap_items table existence' AS test_name,
    EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'career_role_roadmap_items'
    ) AS passed,
    'public.career_role_roadmap_items must exist as foreign key target for roadmap_item_id' AS note

UNION ALL

SELECT 
    'G. target constraint names free' AS test_name,
    NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname IN (
            'chk_candidate_development_plans_status',
            'chk_candidate_development_plans_ruleset',
            'chk_candidate_development_plans_archived_consistency',
            'uq_candidate_development_plan_items_plan_item',
            'chk_candidate_development_plan_items_classification',
            'chk_candidate_development_plan_items_priority',
            'chk_candidate_development_plan_items_evidence_refs_array',
            'chk_candidate_development_plan_items_display_order'
        )
    ) AS passed,
    'Target check and unique constraints must not already be registered' AS note

UNION ALL

SELECT 
    'H. target index names free' AS test_name,
    NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public' 
          AND indexname IN (
            'uq_candidate_development_plans_active',
            'idx_candidate_development_plans_user_status',
            'idx_candidate_development_plans_role',
            'idx_candidate_development_plans_roadmap',
            'idx_candidate_development_plan_items_plan_priority_order',
            'idx_candidate_development_plan_items_roadmap_item'
          )
    ) AS passed,
    'Target index names must not exist prior to migration' AS note

UNION ALL

SELECT 
    'I. target trigger names free' AS test_name,
    NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname IN (
            'set_candidate_development_plans_updated_at',
            'set_candidate_development_plan_items_updated_at'
        )
    ) AS passed,
    'Target triggers must not exist prior to migration' AS note

UNION ALL

SELECT 
    'J. canonical timestamp trigger helper exists' AS test_name,
    EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'set_current_timestamp_updated_at'
    ) AS passed,
    'public.set_current_timestamp_updated_at() must exist' AS note

UNION ALL

SELECT 
    'K. target policies absent' AS test_name,
    NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' 
          AND tablename IN ('candidate_development_plans', 'candidate_development_plan_items')
    ) AS passed,
    'No policies should exist for Stage 7.5 tables prior to creation' AS note;
