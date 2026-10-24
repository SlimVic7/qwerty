-- ============================================================================
-- STAGE 7.6 MIGRATION TEST — JOB/RESPONSE AND NOTIFICATION IDEMPOTENCY
-- Run only against a disposable/test database after migration 00022.
-- Inserts are enclosed in a transaction that is rolled back on success.
-- This script is not part of deployment and has not been executed.
-- ============================================================================
BEGIN;

DO $idempotency_test$
DECLARE
    v_user_id uuid;
    v_thread_id constant uuid := '00000000-0000-4000-8000-000000000033';
    v_user_message_id constant uuid := '00000000-0000-4000-8000-000000000034';
    v_job_id constant uuid := '00000000-0000-4000-8000-000000000022';
    v_url text;
BEGIN
    SELECT id INTO v_user_id FROM public.profiles ORDER BY id LIMIT 1;
    IF v_user_id IS NULL THEN
      RAISE EXCEPTION 'Cannot run idempotency test: profiles has no row to satisfy ownership foreign keys';
    END IF;

    INSERT INTO public.candidate_career_coach_threads (id,user_id,title,status)
    VALUES (v_thread_id,v_user_id,'Rollback-only idempotency test','active');

    INSERT INTO public.candidate_career_coach_messages (id,thread_id,user_id,role,content,grounding_metadata)
    VALUES (v_user_message_id,v_thread_id,v_user_id,'user','Rollback-only test question','{}'::jsonb);

    INSERT INTO public.candidate_career_coach_jobs (id,user_id,thread_id,user_message_id,status)
    VALUES (v_job_id,v_user_id,v_thread_id,v_user_message_id,'queued');

    INSERT INTO public.candidate_career_coach_messages (thread_id,user_id,role,content,grounding_metadata)
    VALUES (v_thread_id,v_user_id,'assistant','Rollback-only test response',jsonb_build_object('job_id',v_job_id::text));

    BEGIN
      INSERT INTO public.candidate_career_coach_messages (thread_id,user_id,role,content,grounding_metadata)
      VALUES (v_thread_id,v_user_id,'assistant','Duplicate response',jsonb_build_object('job_id',v_job_id::text));

      RAISE EXCEPTION 'Assistant-response idempotency failure: duplicate response for one job was accepted';
    EXCEPTION
      WHEN unique_violation THEN
        RAISE NOTICE 'PASS: one Career Coach job cannot have duplicate assistant responses';
    END;

    v_url := '/candidate/career/coach?threadId=' || v_thread_id::text || '&jobId=' || v_job_id::text;
    INSERT INTO public.candidate_notifications (user_id,type,title,message,link_url)
    VALUES (v_user_id,'career_coach_response','Test notification','Test only; rolled back',v_url);

    BEGIN
      INSERT INTO public.candidate_notifications (user_id,type,title,message,link_url)
      VALUES (v_user_id,'career_coach_response','Duplicate test','Must be rejected',v_url);

      RAISE EXCEPTION 'Notification idempotency failure: duplicate completion URL was accepted';
    EXCEPTION
      WHEN unique_violation THEN
        RAISE NOTICE 'PASS: one Career Coach job URL cannot be inserted twice';
    END;
END
$idempotency_test$;

ROLLBACK;
