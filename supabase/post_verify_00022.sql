-- ============================================================================
-- QWERTY STAGE 7.6 POST-VERIFY SCRIPT
-- File: supabase/post_verify_00022.sql
-- ============================================================================

DO $$
DECLARE
    v_missing_target_tables text[] := '{}';
    v_rls_disabled_tables text[] := '{}';
    v_post_verify_passed boolean := true;
BEGIN
    RAISE NOTICE 'Starting Stage 7.6 Post-Verify Check...';

    -- 1. Check target tables exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'candidate_career_coach_threads') THEN
        v_missing_target_tables := array_append(v_missing_target_tables, 'candidate_career_coach_threads');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'candidate_career_coach_messages') THEN
        v_missing_target_tables := array_append(v_missing_target_tables, 'candidate_career_coach_messages');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'candidate_career_coach_jobs') THEN
        v_missing_target_tables := array_append(v_missing_target_tables, 'candidate_career_coach_jobs');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'candidate_notifications') THEN
        v_missing_target_tables := array_append(v_missing_target_tables, 'candidate_notifications');
    END IF;

    -- 2. Verify RLS is enabled
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('candidate_career_coach_threads', 'candidate_career_coach_messages', 'candidate_career_coach_jobs', 'candidate_notifications') AND rowsecurity = false) THEN
        v_rls_disabled_tables := array_append(v_rls_disabled_tables, 'RLS_DISABLED_DETECTED');
    END IF;

    IF array_length(v_missing_target_tables, 1) > 0 OR array_length(v_rls_disabled_tables, 1) > 0 THEN
        v_post_verify_passed := false;
    END IF;

    RAISE NOTICE 'STAGE 7.6 POST-VERIFY FINAL: %', v_post_verify_passed;
END $$;
