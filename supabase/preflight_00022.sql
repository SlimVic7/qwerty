-- ============================================================================
-- QWERTY STAGE 7.6 PREFLIGHT SCRIPT
-- File: supabase/preflight_00022.sql
-- ============================================================================

DO $$
DECLARE
    v_missing_tables text[] := '{}';
    v_conflicting_tables text[] := '{}';
    v_resource_count integer := 0;
    v_course_count integer := 0;
    v_preflight_passed boolean := true;
BEGIN
    RAISE NOTICE 'Starting Stage 7.6 Preflight Check...';

    -- 1. Check existing prerequisite tables
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        v_missing_tables := array_append(v_missing_tables, 'profiles');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'career_roles') THEN
        v_missing_tables := array_append(v_missing_tables, 'career_roles');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'candidate_development_plans') THEN
        v_missing_tables := array_append(v_missing_tables, 'candidate_development_plans');
    END IF;

    -- 2. Verify target Stage 7.6 tables are currently absent
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'candidate_career_coach_threads') THEN
        v_conflicting_tables := array_append(v_conflicting_tables, 'candidate_career_coach_threads');
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'candidate_career_coach_messages') THEN
        v_conflicting_tables := array_append(v_conflicting_tables, 'candidate_career_coach_messages');
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'candidate_career_coach_jobs') THEN
        v_conflicting_tables := array_append(v_conflicting_tables, 'candidate_career_coach_jobs');
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'candidate_notifications') THEN
        v_conflicting_tables := array_append(v_conflicting_tables, 'candidate_notifications');
    END IF;

    -- 3. Verify Stage 7.3 and Stage 7.4 baselines
    SELECT COUNT(*) INTO v_resource_count FROM public.career_learning_resources;
    SELECT COUNT(*) INTO v_course_count FROM public.career_course_recommendations;

    RAISE NOTICE 'Preflight Verification Results:';
    RAISE NOTICE 'Missing Prerequisites: %', v_missing_tables;
    RAISE NOTICE 'Conflicting Target Tables: %', v_conflicting_tables;
    RAISE NOTICE 'Learning Resources Count: % (Expected >= 47)', v_resource_count;
    RAISE NOTICE 'Course Recommendations Count: % (Expected >= 24)', v_course_count;

    IF array_length(v_missing_tables, 1) > 0 OR array_length(v_conflicting_tables, 1) > 0 THEN
        v_preflight_passed := false;
    END IF;

    RAISE NOTICE 'STAGE 7.6 PREFLIGHT FINAL: %', v_preflight_passed;
END $$;
