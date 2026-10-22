-- ============================================================
-- Migration: 00016_stage6_3_job_alerts.sql
-- Stage: 6.3 Job Alerts
-- Status: PENDING MANUAL PREFLIGHT REVIEW — DO NOT RUN AUTOMATICALLY
--
-- Description:
-- Provisions candidate-private job alerts table (public.candidate_job_alerts):
-- - Multi-criteria saved job alerts for registered candidates
-- - Specific criteria: name, keywords, location_query, workplace_type,
--   employment_type, frequency
-- - Frequency taxonomy: 'daily', 'weekly' (default: 'daily')
-- - Status flag (is_active), last_opened_at tracking
-- - Performance indexes for candidate alert queries
-- - Strict RLS & Grants:
--     authenticated: SELECT own rows only
--     authenticated direct: INSERT, UPDATE, DELETE denied
--     anon: no access
--     service_role: minimum required CRUD (API mediated mutations)
-- ============================================================

BEGIN;

-- ============================================================
-- 1. CANDIDATE JOB ALERTS TABLE
-- ============================================================

CREATE TABLE public.candidate_job_alerts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name text NOT NULL,
    keywords text,
    location_query text,
    workplace_type text CHECK (workplace_type IS NULL OR workplace_type IN ('onsite', 'hybrid', 'remote', 'unspecified')),
    employment_type text CHECK (employment_type IS NULL OR employment_type IN ('full_time', 'part_time', 'contract', 'temporary', 'internship', 'unspecified')),
    frequency text NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly')),
    is_active boolean NOT NULL DEFAULT true,
    last_opened_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_candidate_job_alerts_name_length CHECK (char_length(trim(name)) > 0 AND char_length(name) <= 80)
);

-- ============================================================
-- 2. PERFORMANCE INDEXES
-- ============================================================

CREATE INDEX idx_candidate_job_alerts_user_active ON public.candidate_job_alerts (user_id, is_active);
CREATE INDEX idx_candidate_job_alerts_created_at ON public.candidate_job_alerts (user_id, created_at DESC);

-- ============================================================
-- 3. UPDATED_AT TRIGGER
-- ============================================================

CREATE TRIGGER set_candidate_job_alerts_updated_at
BEFORE UPDATE ON public.candidate_job_alerts
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- ============================================================
-- 4. ROW LEVEL SECURITY & LEAST-PRIVILEGE GRANTS
-- ============================================================

ALTER TABLE public.candidate_job_alerts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.candidate_job_alerts FROM PUBLIC, anon, authenticated, service_role;

-- Authenticated candidates can read their own alerts only
GRANT SELECT ON TABLE public.candidate_job_alerts TO authenticated;

-- Service role manages insertions, updates, and deletions via server endpoints
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.candidate_job_alerts TO service_role;

-- Policy: Candidates can view their own alerts
CREATE POLICY "Candidates can view their own job alerts"
ON public.candidate_job_alerts
FOR SELECT
TO authenticated
USING (
    auth.uid() = user_id
);

COMMIT;
