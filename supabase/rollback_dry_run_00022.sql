-- ============================================================================
-- STAGE 7.6 TRANSACTIONAL ROLLBACK DRY-RUN — DO NOT USE AS A DEPLOYMENT SCRIPT
-- Execute with psql from the repository root against a disposable/staging DB:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/rollback_dry_run_00022.sql
-- Never run this against production. It applies migration 00022 inside an explicit
-- transaction, verifies objects exist before rollback, rolls back, then verifies
-- the migration's target objects are absent. The migration itself must not COMMIT.
-- ============================================================================
\set ON_ERROR_STOP on

BEGIN;

\echo 'Applying migration 00022 inside a transaction that will be rolled back'
\i supabase/migrations/00022_stage7_6_ai_career_coach.sql

DO $inside_transaction$
DECLARE
    v_missing text[] := ARRAY[]::text[];
    v_name text;
BEGIN
    FOREACH v_name IN ARRAY ARRAY[
      'candidate_career_coach_threads',
      'candidate_career_coach_messages',
      'candidate_career_coach_jobs',
      'candidate_notifications'
    ] LOOP
      IF to_regclass(format('%I.%I','public',v_name)) IS NULL THEN
        v_missing := array_append(v_missing,v_name);
      END IF;
    END LOOP;
    IF cardinality(v_missing) > 0 THEN
      RAISE EXCEPTION 'Rollback dry-run failed: migration did not create expected targets: %', array_to_string(v_missing,', ');
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_class i JOIN pg_namespace n ON n.oid=i.relnamespace
      WHERE n.nspname='public' AND i.relname='uq_candidate_notifications_career_coach_job_link'
    ) THEN
      RAISE EXCEPTION 'Rollback dry-run failed: notification idempotency index is missing';
    END IF;
    RAISE NOTICE 'PASS: migration objects created inside the uncommitted transaction';
END
$inside_transaction$;

ROLLBACK;

DO $after_rollback$
DECLARE
    v_remaining text[] := ARRAY[]::text[];
    v_name text;
BEGIN
    FOREACH v_name IN ARRAY ARRAY[
      'candidate_career_coach_threads',
      'candidate_career_coach_messages',
      'candidate_career_coach_jobs',
      'candidate_notifications'
    ] LOOP
      IF to_regclass(format('%I.%I','public',v_name)) IS NOT NULL THEN
        v_remaining := array_append(v_remaining,v_name);
      END IF;
    END LOOP;
    IF cardinality(v_remaining) > 0 THEN
      RAISE EXCEPTION 'Post-rollback verification failed; target tables remain: %', array_to_string(v_remaining,', ');
    END IF;
    IF EXISTS (
      SELECT 1 FROM pg_class i JOIN pg_namespace n ON n.oid=i.relnamespace
      WHERE n.nspname='public' AND i.relname='uq_candidate_notifications_career_coach_job_link'
    ) THEN
      RAISE EXCEPTION 'Post-rollback verification failed; notification idempotency index remains';
    END IF;
    RAISE NOTICE 'PASS: rollback restored the pre-migration target-object state';
END
$after_rollback$;
