-- ============================================================================
-- STAGE 7.6 MIGRATION TEST — CAREER COACH NOTIFICATION IDEMPOTENCY
-- Run only against a disposable/test database after migration 00022.
-- Inserts are enclosed in a transaction that is always rolled back on success.
-- This script is not part of deployment and has not been executed.
-- ============================================================================
BEGIN;

DO $idempotency_test$
DECLARE
    v_user_id uuid;
    v_job_id constant text := '00000000-0000-4000-8000-000000000022';
    v_url text;
BEGIN
    SELECT id INTO v_user_id FROM public.profiles ORDER BY id LIMIT 1;
    IF v_user_id IS NULL THEN
      RAISE EXCEPTION 'Cannot run idempotency test: profiles has no row to satisfy notification ownership';
    END IF;

    v_url := '/candidate/career/coach?threadId=00000000-0000-4000-8000-000000000033&jobId=' || v_job_id;

    INSERT INTO public.candidate_notifications (user_id, type, title, message, link_url)
    VALUES (v_user_id, 'career_coach_response', 'Test notification', 'Test only; rolled back', v_url);

    BEGIN
      INSERT INTO public.candidate_notifications (user_id, type, title, message, link_url)
      VALUES (v_user_id, 'career_coach_response', 'Duplicate test', 'Must be rejected', v_url);

      RAISE EXCEPTION 'Notification idempotency failure: duplicate completion URL was accepted';
    EXCEPTION
      WHEN unique_violation THEN
        RAISE NOTICE 'PASS: one Career Coach job URL cannot be inserted twice';
    END;
END
$idempotency_test$;

ROLLBACK;
