-- ============================================================
-- Migration: 00014_stage6_2_job_source_attribution.sql
-- Stage: 6.2 External Apply + Job Source Attribution
-- Status: PENDING MANUAL PREFLIGHT REVIEW — DO NOT RUN AUTOMATICALLY
--
-- Description:
-- 1. Extends public.jobs with governed source attribution taxonomy:
--    - source_type: external_company, external_job_board, external_social,
--                   external_recruiter, qwerty_direct, other_external
--    - source_published_at: timestamptz (nullable)
--    - source_last_verified_at: timestamptz (nullable)
--    - URL security scheme constraint for source_url and application_url
-- 2. Provisions candidate-private candidate_outbound_apply_events table:
--    - Records outbound_apply_click events (candidate intent, NOT application completed)
--    - Stores apply_url_host domain rather than full URL with sensitive queries
--    - Foreign keys to public.profiles and public.jobs
--    - CHECK constraint on source_type with governed taxonomy
--    - Indexes for candidate audit and job analytics
--    - Strict RLS: revoked from public/anon/authenticated direct mutation;
--      service_role mediated insertion
-- 3. Fail-fast semantics: assumes clean preflight state and fails immediately
--    on unexpected partial deployment.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. EXTEND PUBLIC.JOBS WITH SOURCE CLASSIFICATION & METADATA
-- ============================================================

-- Add source_type with governed taxonomy and backward-compatible default
ALTER TABLE public.jobs
ADD COLUMN source_type text NOT NULL DEFAULT 'other_external';

-- Add check constraint on source_type
ALTER TABLE public.jobs
ADD CONSTRAINT jobs_source_type_check
CHECK (
    source_type IN (
        'external_company',
        'external_job_board',
        'external_social',
        'external_recruiter',
        'qwerty_direct',
        'other_external'
    )
);

-- Add source_published_at and source_last_verified_at
ALTER TABLE public.jobs
ADD COLUMN source_published_at timestamptz,
ADD COLUMN source_last_verified_at timestamptz;

-- Add URL scheme security constraint (HTTP or HTTPS only, reasonable length up to 2048)
-- Empty string '' or NULL both treated safely
ALTER TABLE public.jobs
ADD CONSTRAINT jobs_source_url_safe_scheme
CHECK (
    source_url IS NULL
    OR source_url = ''
    OR (
        length(source_url) <= 2048
        AND (source_url ~* '^https?://')
    )
);

ALTER TABLE public.jobs
ADD CONSTRAINT jobs_application_url_safe_scheme
CHECK (
    application_url IS NULL
    OR application_url = ''
    OR (
        length(application_url) <= 2048
        AND (application_url ~* '^https?://')
    )
);

-- Index on source_type for operational and provenance queries
CREATE INDEX idx_jobs_source_type
ON public.jobs (source_type);

-- ============================================================
-- 2. CREATE CANDIDATE OUTBOUND APPLY EVENTS TABLE
-- ============================================================

CREATE TABLE public.candidate_outbound_apply_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE RESTRICT,
    source_type text NOT NULL,
    apply_url_host text,
    event_name text NOT NULL DEFAULT 'outbound_apply_click'
        CHECK (event_name = 'outbound_apply_click'),
    clicked_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT candidate_outbound_apply_events_source_type_check
        CHECK (
            source_type IN (
                'external_company',
                'external_job_board',
                'external_social',
                'external_recruiter',
                'qwerty_direct',
                'other_external'
            )
        )
);

-- Indexes for candidate tracking & aggregate analytics
CREATE INDEX idx_candidate_outbound_apply_user_id
ON public.candidate_outbound_apply_events (user_id, clicked_at DESC);

-- Index on job_id for job click performance tracking
CREATE INDEX idx_candidate_outbound_apply_job_id
ON public.candidate_outbound_apply_events (job_id, clicked_at DESC);

-- ============================================================
-- 3. ROW LEVEL SECURITY & PERMISSIONS
-- ============================================================

ALTER TABLE public.candidate_outbound_apply_events ENABLE ROW LEVEL SECURITY;

-- Revoke all permissions by default to maintain privacy & zero client mutation
REVOKE ALL ON TABLE public.candidate_outbound_apply_events FROM PUBLIC, anon, authenticated;

-- Grant server_role full administrative access
GRANT SELECT, INSERT ON TABLE public.candidate_outbound_apply_events TO service_role;

-- No UPDATE or DELETE allowed by anyone through standard application flows

COMMIT;
