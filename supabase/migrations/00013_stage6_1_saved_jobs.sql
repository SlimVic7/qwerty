-- ============================================================
-- Migration: 00013_stage6_1_saved_jobs.sql
-- Stage: 6.1 Saved Jobs
-- Status: PENDING MANUAL PREFLIGHT REVIEW — DO NOT RUN AUTOMATICALLY
--
-- Description:
-- Provisions candidate-private saved jobs bookmarks table,
-- foreign keys to public.profiles and public.jobs, unique
-- bookmark constraint per candidate and job, performance
-- indexes, reusable updated_at trigger, least-privilege
-- RLS policies, and atomic idempotent save/unsave RPCs.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. CREATE CANDIDATE SAVED JOBS TABLE
-- ============================================================

CREATE TABLE public.candidate_saved_jobs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE RESTRICT,
    saved_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_candidate_saved_jobs_user_job UNIQUE (user_id, job_id)
);

-- ============================================================
-- 2. PERFORMANCE INDEXES
-- ============================================================

-- Fast lookup for candidate's saved jobs ordered chronologically
CREATE INDEX idx_candidate_saved_jobs_user_saved_at
ON public.candidate_saved_jobs (user_id, saved_at DESC);

-- Foreign key lookup index for job reference checks and cascading
CREATE INDEX idx_candidate_saved_jobs_job_id
ON public.candidate_saved_jobs (job_id);

-- ============================================================
-- 3. UPDATED_AT TRIGGER
-- ============================================================

CREATE TRIGGER set_candidate_saved_jobs_updated_at
BEFORE UPDATE ON public.candidate_saved_jobs
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- ============================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.candidate_saved_jobs ENABLE ROW LEVEL SECURITY;

-- Revoke all by default to follow least privilege
REVOKE ALL ON TABLE public.candidate_saved_jobs FROM PUBLIC, anon, authenticated, service_role;

-- Authenticated candidates can read their own saved jobs only
GRANT SELECT ON TABLE public.candidate_saved_jobs TO authenticated;

-- Service role manages insertions and deletions via server endpoints
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.candidate_saved_jobs TO service_role;

-- Policy: candidate can only view their own bookmarks
CREATE POLICY "Candidates can view their own saved jobs"
ON public.candidate_saved_jobs
FOR SELECT
TO authenticated
USING (
    auth.uid() = user_id
);

-- ============================================================
-- 5. ATOMIC / IDEMPOTENT SAVE RPC FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.save_candidate_job(
    p_user_id uuid,
    p_job_id uuid
)
RETURNS public.candidate_saved_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_job_status text;
    v_saved_row public.candidate_saved_jobs;
BEGIN
    -- Validate job exists and is trackable
    SELECT status INTO v_job_status
    FROM public.jobs
    WHERE id = p_job_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'JOB_NOT_FOUND' USING ERRCODE = 'P0002';
    END IF;

    IF v_job_status <> 'published' THEN
        RAISE EXCEPTION 'JOB_NOT_AVAILABLE' USING ERRCODE = 'P0003';
    END IF;

    -- Idempotent save: on conflict do nothing and return existing row (true no-op on duplicate)
    INSERT INTO public.candidate_saved_jobs (
        user_id,
        job_id,
        saved_at
    )
    VALUES (
        p_user_id,
        p_job_id,
        CURRENT_TIMESTAMP
    )
    ON CONFLICT (user_id, job_id)
    DO NOTHING
    RETURNING * INTO v_saved_row;

    IF v_saved_row IS NULL THEN
        SELECT * INTO v_saved_row
        FROM public.candidate_saved_jobs
        WHERE user_id = p_user_id
          AND job_id = p_job_id;
    END IF;

    RETURN v_saved_row;
END;
$$;

-- ============================================================
-- 6. ATOMIC UNSAVE RPC FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.unsave_candidate_job(
    p_user_id uuid,
    p_job_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_deleted_count bigint;
BEGIN
    DELETE FROM public.candidate_saved_jobs
    WHERE user_id = p_user_id AND job_id = p_job_id;

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN (v_deleted_count > 0);
END;
$$;

REVOKE ALL ON FUNCTION public.save_candidate_job(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_candidate_job(uuid, uuid) TO service_role;

REVOKE ALL ON FUNCTION public.unsave_candidate_job(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.unsave_candidate_job(uuid, uuid) TO service_role;

COMMIT;
