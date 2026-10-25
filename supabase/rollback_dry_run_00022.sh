#!/usr/bin/env bash
set -euo pipefail

# Safe rollback dry-run for migration 00022. This is NOT a deployment script.
# It removes only the migration file's standalone BEGIN/COMMIT lines from a
# temporary copy, wraps the unchanged DDL in one outer transaction, and forces
# ROLLBACK before checking that target objects are absent.
: "${DATABASE_URL:?Set DATABASE_URL to a disposable/staging PostgreSQL database}"

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
migration="${repo_root}/supabase/migrations/00022_stage7_6_ai_career_coach.sql"
tmp_sql="$(mktemp)"
trap 'rm -f "$tmp_sql"' EXIT

{
  printf '%s\n' '\set ON_ERROR_STOP on' 'BEGIN;'
  # Preserve all DDL and comments; suppress only explicit migration transaction
  # boundaries in this temporary copy so they cannot commit the dry-run.
  sed '/^BEGIN;$/d; /^COMMIT;$/d' "$migration"

  cat <<'SQL'
DO $inside_transaction$
DECLARE
    v_name text;
BEGIN
    FOREACH v_name IN ARRAY ARRAY[
      'candidate_career_coach_threads',
      'candidate_career_coach_messages',
      'candidate_career_coach_jobs',
      'candidate_notifications'
    ] LOOP
      IF to_regclass(format('%I.%I','public',v_name)) IS NULL THEN
        RAISE EXCEPTION 'Rollback dry-run failed: migration did not create target public.%', v_name;
      END IF;
    END LOOP;

    IF NOT EXISTS (
      SELECT 1 FROM pg_class i JOIN pg_namespace n ON n.oid=i.relnamespace
      WHERE n.nspname='public' AND i.relname='uq_candidate_notifications_career_coach_job_link'
    ) THEN
      RAISE EXCEPTION 'Rollback dry-run failed: notification idempotency index is missing';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_class i JOIN pg_namespace n ON n.oid=i.relnamespace
      WHERE n.nspname='public' AND i.relname='uq_candidate_career_coach_messages_assistant_job'
    ) THEN
      RAISE EXCEPTION 'Rollback dry-run failed: assistant response idempotency index is missing';
    END IF;
    RAISE NOTICE 'PASS: migration DDL applied inside the uncommitted transaction';
END
$inside_transaction$;

ROLLBACK;

DO $after_rollback$
DECLARE
    v_name text;
BEGIN
    FOREACH v_name IN ARRAY ARRAY[
      'candidate_career_coach_threads',
      'candidate_career_coach_messages',
      'candidate_career_coach_jobs',
      'candidate_notifications'
    ] LOOP
      IF to_regclass(format('%I.%I','public',v_name)) IS NOT NULL THEN
        RAISE EXCEPTION 'Post-rollback verification failed; target public.% remains', v_name;
      END IF;
    END LOOP;
    IF EXISTS (
      SELECT 1 FROM pg_class i JOIN pg_namespace n ON n.oid=i.relnamespace
      WHERE n.nspname='public'
        AND i.relname IN (
          'uq_candidate_notifications_career_coach_job_link',
          'uq_candidate_career_coach_messages_assistant_job'
        )
    ) THEN
      RAISE EXCEPTION 'Post-rollback verification failed; an idempotency index remains';
    END IF;
    RAISE NOTICE 'PASS: rollback restored the pre-migration target-object state';
END
$after_rollback$;
SQL
} > "$tmp_sql"

printf '%s\n' 'Running Stage 7.6 migration 00022 rollback dry-run; no commit will be issued.'
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$tmp_sql"
