BEGIN;

-- ============================================================
-- QWERTY Stage 5.1
-- Candidate Job Alignment Foundation
--
-- Migration:
-- 00011_stage5_1_job_alignment.sql
--
-- DO NOT EXECUTE AUTOMATICALLY.
-- PENDING MANUAL REVIEW.
-- ============================================================


-- ============================================================
-- 1. CREATE CANDIDATE JOB ALIGNMENTS TABLE
-- ============================================================

CREATE TABLE public.candidate_job_alignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id uuid NOT NULL,
    cv_version_id uuid NOT NULL,
    parse_id uuid NOT NULL,
    job_id uuid NOT NULL,

    -- Job snapshot at time of analysis (for drift detection)
    job_updated_at timestamptz NOT NULL,
    job_title text NOT NULL,
    company_name text NOT NULL,

    -- Candidate profile snapshot at time of analysis (for drift detection)
    candidate_applied_at timestamptz NOT NULL,

    -- Deterministic alignment rules engine lifecycle
    status text NOT NULL DEFAULT 'pending'
        CHECK (
            status IN (
                'pending',
                'processing_rules',
                'completed',
                'failed'
            )
        ),

    -- Gemini advisory plain-language explanation lifecycle
    explanation_status text NOT NULL DEFAULT 'not_started'
        CHECK (
            explanation_status IN (
                'not_started',
                'processing',
                'completed',
                'failed'
            )
        ),

    -- Deterministic ruleset identity
    ruleset_version text NOT NULL,

    -- Normalized deterministic alignment score (0-100)
    score integer,
    max_score integer NOT NULL DEFAULT 100,

    -- Raw component points and applicability denominator
    raw_score numeric,
    raw_max_score numeric,

    -- Deterministic component breakdown
    -- [
    --   { "id": "required_criteria", "score": 40, "max_score": 45, "status": "pass", "weight": 45, ... },
    --   { "id": "preferred_qualifications", "score": 10, "max_score": 15, "status": "pass", "weight": 15, ... },
    --   { "id": "experience_level", "score": 25, "max_score": 25, "status": "pass", "weight": 25, ... },
    --   { "id": "responsibilities", "score": 10, "max_score": 15, "status": "pass", "weight": 15, ... }
    -- ]
    component_results jsonb,

    -- Detailed criteria-level alignment with candidate evidence
    -- [
    --   {
    --     "criterion": "CISA Certification",
    --     "category": "required",
    --     "status": "matched",
    --     "candidate_evidence": "Certified Information Systems Auditor (CISA)",
    --     "source_type": "certifications"
    --   },
    --   ...
    -- ]
    criteria_breakdown jsonb,

    -- Advisory Gemini explanation (plain language advice only)
    -- {
    --   "summary": "...",
    --   "strengths": [...],
    --   "gaps": [...],
    --   "recommendations": [...],
    --   "suggested_interview_prep": [...]
    -- }
    explanation jsonb,

    -- Advisory AI execution metadata
    ai_provider text,
    ai_model text,

    -- Error tracking
    error_code text,
    explanation_error_code text,

    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at timestamptz,

    -- ========================================================
    -- Authoritative ownership and integrity relationships
    -- ========================================================

    -- Enforces that parse_id, cv_version_id, and user_id all belong
    -- to the exact same candidate_cv_parses record.
    CONSTRAINT fk_alignment_cv_parse
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

    -- Enforces that job_id references an existing canonical job.
    CONSTRAINT fk_alignment_job
        FOREIGN KEY (job_id)
        REFERENCES public.jobs (id)
        ON DELETE RESTRICT
);


-- ============================================================
-- 2. ACTIVE-ALIGNMENT IDEMPOTENCY
-- ============================================================
--
-- Only one deterministic alignment may be actively processed
-- for a given candidate, job, parse, and ruleset version at a time.
--
-- Historical completed alignments remain permanently preserved.
-- ============================================================

CREATE UNIQUE INDEX idx_unique_active_candidate_job_alignment
ON public.candidate_job_alignments (
    user_id,
    job_id,
    parse_id,
    ruleset_version
)
WHERE status IN (
    'pending',
    'processing_rules'
);


-- ============================================================
-- 3. LOOKUP INDEXES
-- ============================================================

CREATE INDEX idx_candidate_job_alignments_user_id
ON public.candidate_job_alignments (user_id);

CREATE INDEX idx_candidate_job_alignments_job_id
ON public.candidate_job_alignments (job_id);

CREATE INDEX idx_candidate_job_alignments_user_job_created
ON public.candidate_job_alignments (user_id, job_id, created_at DESC);

CREATE INDEX idx_candidate_job_alignments_parse_id
ON public.candidate_job_alignments (parse_id);


-- ============================================================
-- 4. SCORE / DATA-SHAPE INTEGRITY
-- ============================================================

ALTER TABLE public.candidate_job_alignments

ADD CONSTRAINT check_alignment_score_nonnegative
CHECK (
    score IS NULL
    OR score >= 0
),

ADD CONSTRAINT check_alignment_max_score_is_100
CHECK (
    max_score = 100
),

ADD CONSTRAINT check_alignment_score_bounds
CHECK (
    score IS NULL
    OR score <= max_score
),

ADD CONSTRAINT check_alignment_raw_score_nonnegative
CHECK (
    raw_score IS NULL
    OR raw_score >= 0
),

ADD CONSTRAINT check_alignment_raw_max_score_positive
CHECK (
    raw_max_score IS NULL
    OR raw_max_score > 0
),

ADD CONSTRAINT check_alignment_raw_score_bounds
CHECK (
    raw_score IS NULL
    OR raw_max_score IS NULL
    OR raw_score <= raw_max_score
),

ADD CONSTRAINT check_alignment_ruleset_version_nonblank
CHECK (
    btrim(ruleset_version) <> ''
),

ADD CONSTRAINT check_alignment_component_results_type
CHECK (
    component_results IS NULL
    OR jsonb_typeof(component_results) = 'array'
),

ADD CONSTRAINT check_alignment_criteria_breakdown_type
CHECK (
    criteria_breakdown IS NULL
    OR jsonb_typeof(criteria_breakdown) = 'array'
),

ADD CONSTRAINT check_alignment_explanation_type
CHECK (
    explanation IS NULL
    OR jsonb_typeof(explanation) = 'object'
);


-- ============================================================
-- 5. DETERMINISTIC ALIGNMENT LIFECYCLE CONSISTENCY
-- ============================================================

ALTER TABLE public.candidate_job_alignments

ADD CONSTRAINT check_completed_deterministic_alignment
CHECK (
    (
        status = 'completed'
        AND score IS NOT NULL
        AND max_score IS NOT NULL
        AND raw_score IS NOT NULL
        AND raw_max_score IS NOT NULL
        AND component_results IS NOT NULL
        AND criteria_breakdown IS NOT NULL
        AND ruleset_version IS NOT NULL
        AND btrim(ruleset_version) <> ''
        AND completed_at IS NOT NULL
        AND error_code IS NULL
    )
    OR
    status <> 'completed'
),

ADD CONSTRAINT check_failed_deterministic_alignment
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

ADD CONSTRAINT check_active_deterministic_alignment
CHECK (
    (
        status IN ('pending', 'processing_rules')
        AND completed_at IS NULL
        AND error_code IS NULL
    )
    OR
    status NOT IN ('pending', 'processing_rules')
);


-- ============================================================
-- 6. GEMINI EXPLANATION LIFECYCLE CONSISTENCY
-- ============================================================

ALTER TABLE public.candidate_job_alignments

ADD CONSTRAINT check_explanation_state_consistency
CHECK (
    (
        explanation_status = 'not_started'
        AND explanation IS NULL
        AND explanation_error_code IS NULL
    )
    OR
    (
        explanation_status = 'processing'
        AND explanation IS NULL
        AND explanation_error_code IS NULL
    )
    OR
    (
        explanation_status = 'completed'
        AND explanation IS NOT NULL
        AND jsonb_typeof(explanation) = 'object'
        AND explanation_error_code IS NULL
    )
    OR
    (
        explanation_status = 'failed'
        AND explanation IS NULL
        AND explanation_error_code IS NOT NULL
        AND btrim(explanation_error_code) <> ''
    )
),

ADD CONSTRAINT check_explanation_requires_completed_alignment
CHECK (
    explanation_status = 'not_started'
    OR status = 'completed'
);


-- ============================================================
-- 7. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.candidate_job_alignments
ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 8. EXPLICIT LEAST-PRIVILEGE GRANTS
-- ============================================================
--
-- Strictly Candidate-Private.
-- Recruiters have NO permissions on this table.
-- ============================================================

REVOKE ALL
ON TABLE public.candidate_job_alignments
FROM PUBLIC, anon, authenticated, service_role;

-- Authenticated candidates can read their own alignment results only.
GRANT SELECT
ON TABLE public.candidate_job_alignments
TO authenticated;

-- Server backend service role manages alignment execution.
GRANT SELECT, INSERT, UPDATE
ON TABLE public.candidate_job_alignments
TO service_role;


-- ============================================================
-- 9. CANDIDATE OWN-ROW SELECT POLICY
-- ============================================================

CREATE POLICY "Candidates can view their own job alignments"
ON public.candidate_job_alignments
FOR SELECT
TO authenticated
USING (
    auth.uid() = user_id
);

COMMIT;
