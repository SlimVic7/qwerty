-- ============================================================
-- Migration: 00012_stage5_2_cv_tailoring.sql
-- Stage: 5.2 Evidence-Safe CV Tailoring Assistant
-- Status: PENDING MANUAL PREFLIGHT REVIEW — DO NOT RUN AUTOMATICALLY
--
-- Description:
-- Provisions the candidate-private CV tailoring sessions table,
-- enforcing composite candidate parse ownership integrity,
-- source alignment composite validation, lifecycle constraints,
-- deterministic active-session idempotency, and candidate-only RLS.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. EXTEND ALIGNMENT COMPOSITE UNIQUE IDENTIFIER
-- ============================================================
-- Allows candidate_cv_tailoring_sessions to enforce composite
-- ownership ensuring alignment belongs to the exact same user,
-- job, CV parse, ruleset_version, and source snapshots.

ALTER TABLE public.candidate_job_alignments
ADD CONSTRAINT uq_candidate_job_alignment_tailoring_owner
UNIQUE (
    id,
    user_id,
    job_id,
    parse_id,
    ruleset_version,
    job_updated_at,
    candidate_applied_at
);


-- ============================================================
-- 2. CREATE CANDIDATE CV TAILORING SESSIONS TABLE
-- ============================================================

CREATE TABLE public.candidate_cv_tailoring_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id uuid NOT NULL,
    job_id uuid NOT NULL,
    cv_version_id uuid NOT NULL,
    parse_id uuid NOT NULL,
    alignment_id uuid NOT NULL,

    -- Lifecycle statuses
    status text NOT NULL DEFAULT 'pending'
        CHECK (
            status IN (
                'pending',
                'preparing_evidence',
                'generating',
                'completed',
                'failed'
            )
        ),

    tailoring_status text NOT NULL DEFAULT 'draft'
        CHECK (
            tailoring_status IN (
                'draft',
                'reviewing',
                'finalized'
            )
        ),

    -- Engine & ruleset tracking
    tailoring_engine_version text NOT NULL,
    source_alignment_ruleset text NOT NULL,

    -- Snapshot timestamps for source drift detection
    job_updated_at timestamptz NOT NULL,
    candidate_applied_at timestamptz NOT NULL,

    -- Job display metadata
    job_title text NOT NULL,
    company_name text NOT NULL,

    -- Layer A: Evidence manifest (Candidate-approved facts only)
    evidence_manifest jsonb NOT NULL DEFAULT '[]'::jsonb,

    -- Layer B: Tailoring plan (Strengths to emphasize, concision targets, unaddressed criteria)
    tailoring_plan jsonb,

    -- Generated suggestions with provenance & deterministic validation status
    suggestions jsonb NOT NULL DEFAULT '[]'::jsonb,

    -- Layer C: Tailored CV draft (Separate candidate-private artifact)
    draft_data jsonb,

    -- Deterministic validation diagnostics
    validation_results jsonb,

    -- AI generation execution metadata
    generation_provider text,
    generation_model text,

    -- Error tracking
    error_code text,

    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at timestamptz,
    finalized_at timestamptz,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- ========================================================
    -- Authoritative ownership and integrity relationships
    -- ========================================================

    -- Enforces that parse_id, cv_version_id, and user_id belong to
    -- the exact same applied candidate_cv_parses record.
    CONSTRAINT fk_tailoring_cv_parse
        FOREIGN KEY (
            parse_id,
            cv_version_id,
            user_id
        )
        REFERENCES public.candidate_cv_parses (
            id,
            cv_version_id,
            user_id
        )
        ON DELETE RESTRICT,

    -- Enforces canonical job reference
    CONSTRAINT fk_tailoring_job
        FOREIGN KEY (job_id)
        REFERENCES public.jobs (id)
        ON DELETE RESTRICT,

    -- Enforces that alignment_id belongs to the exact same user, job, parse, ruleset, and source snapshots
    CONSTRAINT fk_tailoring_alignment
        FOREIGN KEY (
            alignment_id,
            user_id,
            job_id,
            parse_id,
            source_alignment_ruleset,
            job_updated_at,
            candidate_applied_at
        )
        REFERENCES public.candidate_job_alignments (
            id,
            user_id,
            job_id,
            parse_id,
            ruleset_version,
            job_updated_at,
            candidate_applied_at
        )
        ON DELETE RESTRICT
);


-- ============================================================
-- 3. ACTIVE-SESSION IDEMPOTENCY
-- ============================================================
-- Only one tailoring session may be actively generating for a given
-- candidate, job, parse, and engine version at a time.

CREATE UNIQUE INDEX idx_unique_active_candidate_cv_tailoring
ON public.candidate_cv_tailoring_sessions (
    user_id,
    job_id,
    parse_id,
    alignment_id,
    tailoring_engine_version
)
WHERE status IN (
    'pending',
    'preparing_evidence',
    'generating'
);


-- ============================================================
-- 4. LOOKUP INDEXES
-- ============================================================

CREATE INDEX idx_candidate_cv_tailoring_user_id
ON public.candidate_cv_tailoring_sessions (user_id);

CREATE INDEX idx_candidate_cv_tailoring_job_id
ON public.candidate_cv_tailoring_sessions (job_id);

CREATE INDEX idx_candidate_cv_tailoring_user_job_created
ON public.candidate_cv_tailoring_sessions (user_id, job_id, created_at DESC);

CREATE INDEX idx_candidate_cv_tailoring_parse_id
ON public.candidate_cv_tailoring_sessions (parse_id);


-- ============================================================
-- 5. DATA INTEGRITY & SHAPE CONSTRAINTS
-- ============================================================

ALTER TABLE public.candidate_cv_tailoring_sessions

ADD CONSTRAINT check_tailoring_engine_version_nonblank
CHECK (
    btrim(tailoring_engine_version) <> ''
),

ADD CONSTRAINT check_source_alignment_ruleset_nonblank
CHECK (
    btrim(source_alignment_ruleset) <> ''
),

ADD CONSTRAINT check_tailoring_evidence_manifest_shape
CHECK (
    jsonb_typeof(evidence_manifest) = 'array'
),

ADD CONSTRAINT check_tailoring_suggestions_shape
CHECK (
    jsonb_typeof(suggestions) = 'array'
),

ADD CONSTRAINT check_tailoring_plan_shape
CHECK (
    tailoring_plan IS NULL
    OR jsonb_typeof(tailoring_plan) = 'object'
),

ADD CONSTRAINT check_tailoring_draft_data_shape
CHECK (
    draft_data IS NULL
    OR jsonb_typeof(draft_data) = 'object'
),

ADD CONSTRAINT check_tailoring_validation_results_shape
CHECK (
    validation_results IS NULL
    OR jsonb_typeof(validation_results) = 'object'
);


-- ============================================================
-- 6. LIFECYCLE CONSISTENCY CONSTRAINTS
-- ============================================================

ALTER TABLE public.candidate_cv_tailoring_sessions

ADD CONSTRAINT check_completed_tailoring_session
CHECK (
    (
        status = 'completed'
        AND completed_at IS NOT NULL
        AND tailoring_plan IS NOT NULL
        AND draft_data IS NOT NULL
        AND error_code IS NULL
    )
    OR
    status <> 'completed'
),

ADD CONSTRAINT check_failed_tailoring_session
CHECK (
    (
        status = 'failed'
        AND error_code IS NOT NULL
        AND btrim(error_code) <> ''
        AND completed_at IS NOT NULL
    )
    OR
    status <> 'failed'
),

ADD CONSTRAINT check_active_tailoring_session
CHECK (
    (
        status IN ('pending', 'preparing_evidence', 'generating')
        AND completed_at IS NULL
        AND error_code IS NULL
    )
    OR
    status NOT IN ('pending', 'preparing_evidence', 'generating')
),

ADD CONSTRAINT check_finalized_tailoring_status
CHECK (
    (
        tailoring_status = 'finalized'
        AND status = 'completed'
        AND finalized_at IS NOT NULL
        AND draft_data IS NOT NULL
    )
    OR
    (
        tailoring_status <> 'finalized'
        AND finalized_at IS NULL
    )
),

ADD CONSTRAINT check_reviewing_tailoring_status
CHECK (
    (
        tailoring_status = 'reviewing'
        AND status = 'completed'
    )
    OR
    tailoring_status <> 'reviewing'
);


-- ============================================================
-- 7. UPDATED_AT TRIGGER
-- ============================================================

CREATE TRIGGER set_candidate_cv_tailoring_sessions_updated_at
BEFORE UPDATE ON public.candidate_cv_tailoring_sessions
FOR EACH ROW
EXECUTE PROCEDURE public.set_current_timestamp_updated_at();


-- ============================================================
-- 8. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.candidate_cv_tailoring_sessions
ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 9. EXPLICIT LEAST-PRIVILEGE GRANTS
-- ============================================================
-- Strictly Candidate-Private.
-- Recruiters and internal admins have NO permissions on this table.

REVOKE ALL
ON TABLE public.candidate_cv_tailoring_sessions
FROM PUBLIC, anon, authenticated, service_role;

-- Authenticated candidates can read their own tailoring sessions only.
GRANT SELECT
ON TABLE public.candidate_cv_tailoring_sessions
TO authenticated;

-- Server backend service role manages tailoring execution and updates.
GRANT SELECT, INSERT, UPDATE
ON TABLE public.candidate_cv_tailoring_sessions
TO service_role;


-- ============================================================
-- 10. CANDIDATE OWN-ROW SELECT POLICY
-- ============================================================

CREATE POLICY "Candidates can view their own tailoring sessions"
ON public.candidate_cv_tailoring_sessions
FOR SELECT
TO authenticated
USING (
    auth.uid() = user_id
);

COMMIT;
