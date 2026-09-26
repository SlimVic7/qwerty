BEGIN;

-- ============================================================
-- QWERTY Stage 4.3
-- ATS Readiness & CV Intelligence
--
-- Migration:
-- 00009_stage4_3_ats_readiness.sql
-- ============================================================


-- ============================================================
-- 1. ENFORCE EXACT PARSE <-> CV <-> USER RELATIONSHIP
-- ============================================================
--
-- candidate_cv_parses already guarantees that cv_version_id belongs
-- to user_id through Stage 4.2.
--
-- This additional UNIQUE constraint allows assessments to reference
-- the exact parse + CV version + candidate combination.
--
-- Do NOT modify candidate_cv_versions here; Stage 4.2 already
-- established its required ownership constraints.
-- ============================================================

ALTER TABLE public.candidate_cv_parses
ADD CONSTRAINT cv_parses_id_cv_version_id_user_id_key
UNIQUE (id, cv_version_id, user_id);


-- ============================================================
-- 2. CREATE CANDIDATE CV ASSESSMENTS
-- ============================================================

CREATE TABLE public.candidate_cv_assessments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id uuid NOT NULL,
    cv_version_id uuid NOT NULL,
    parse_id uuid NOT NULL,

    -- Deterministic ATS rules engine lifecycle
    status text NOT NULL DEFAULT 'pending'
        CHECK (
            status IN (
                'pending',
                'processing_rules',
                'completed',
                'failed'
            )
        ),

    -- Gemini advisory recommendation lifecycle.
    -- This is intentionally separate from deterministic scoring.
    recommendation_status text NOT NULL DEFAULT 'not_started'
        CHECK (
            recommendation_status IN (
                'not_started',
                'processing',
                'completed',
                'failed'
            )
        ),

    -- Deterministic ruleset identity
    ruleset_version text,

    -- Deterministic ATS Readiness score
    score integer,
    max_score integer,

    -- Expected to be an array of deterministic component results
    component_results jsonb,

    -- Expected structure:
    -- {
    --   "strengths": [],
    --   "issues": [],
    --   "recommendations": []
    -- }
    recommendations jsonb,

    -- Advisory AI execution metadata only
    ai_provider text,
    ai_model text,

    -- Deterministic engine failure
    error_code text,

    -- Gemini recommendation failure
    recommendation_error_code text,

    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Timestamp for completion/failure of deterministic scoring
    completed_at timestamptz,

    -- ========================================================
    -- Authoritative ownership relationship
    -- ========================================================
    --
    -- This single composite FK guarantees:
    --
    -- assessment.parse_id
    -- assessment.cv_version_id
    -- assessment.user_id
    --
    -- all belong to the SAME candidate_cv_parses record.
    --
    -- Therefore:
    -- Candidate A cannot reference Candidate B's parse.
    -- CV v3 cannot reference a parse belonging to CV v2.
    -- ========================================================

    CONSTRAINT fk_assessment_cv_parse
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
        ON DELETE CASCADE
);


-- ============================================================
-- 3. ACTIVE-ASSESSMENT IDEMPOTENCY
-- ============================================================
--
-- Only one deterministic assessment may be actively processed
-- for a given parse at a time.
--
-- Completed historical assessments remain preserved.
-- ============================================================

CREATE UNIQUE INDEX idx_unique_active_assessment
ON public.candidate_cv_assessments (parse_id)
WHERE status IN (
    'pending',
    'processing_rules'
);


-- ============================================================
-- 4. LOOKUP INDEXES
-- ============================================================

CREATE INDEX idx_candidate_cv_assessments_user_id
ON public.candidate_cv_assessments (user_id);

CREATE INDEX idx_candidate_cv_assessments_cv_version_id
ON public.candidate_cv_assessments (cv_version_id);

CREATE INDEX idx_candidate_cv_assessments_parse_id
ON public.candidate_cv_assessments (parse_id);

CREATE INDEX idx_candidate_cv_assessments_created_at
ON public.candidate_cv_assessments (created_at DESC);


-- ============================================================
-- 5. SCORE / DATA-SHAPE INTEGRITY
-- ============================================================

ALTER TABLE public.candidate_cv_assessments

ADD CONSTRAINT check_score_nonnegative
CHECK (
    score IS NULL
    OR score >= 0
),

ADD CONSTRAINT check_max_score_positive
CHECK (
    max_score IS NULL
    OR max_score > 0
),

ADD CONSTRAINT check_score_bounds
CHECK (
    score IS NULL
    OR max_score IS NULL
    OR score <= max_score
),

ADD CONSTRAINT check_ruleset_version_nonblank
CHECK (
    ruleset_version IS NULL
    OR btrim(ruleset_version) <> ''
),

ADD CONSTRAINT check_component_results_type
CHECK (
    component_results IS NULL
    OR jsonb_typeof(component_results) = 'array'
),

ADD CONSTRAINT check_recommendations_type
CHECK (
    recommendations IS NULL
    OR jsonb_typeof(recommendations) = 'object'
);


-- ============================================================
-- 6. DETERMINISTIC ASSESSMENT LIFECYCLE CONSISTENCY
-- ============================================================

ALTER TABLE public.candidate_cv_assessments

-- A completed deterministic assessment must contain a complete,
-- valid deterministic result and must not carry a rules-engine error.
ADD CONSTRAINT check_completed_deterministic
CHECK (
    (
        status = 'completed'
        AND score IS NOT NULL
        AND max_score IS NOT NULL
        AND component_results IS NOT NULL
        AND ruleset_version IS NOT NULL
        AND btrim(ruleset_version) <> ''
        AND completed_at IS NOT NULL
        AND error_code IS NULL
    )
    OR
    status <> 'completed'
),

-- A failed deterministic assessment must contain a meaningful
-- failure code and completion timestamp.
ADD CONSTRAINT check_failed_deterministic
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

-- Active deterministic processing states may not appear completed.
ADD CONSTRAINT check_active_deterministic
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
-- 7. GEMINI RECOMMENDATION LIFECYCLE CONSISTENCY
-- ============================================================
--
-- Gemini recommendations are optional enrichment.
--
-- A valid deterministic score must remain available even if
-- Gemini recommendation generation fails.
-- ============================================================

ALTER TABLE public.candidate_cv_assessments

ADD CONSTRAINT check_recommendation_state_consistency
CHECK (
    (
        recommendation_status = 'not_started'
        AND recommendations IS NULL
        AND recommendation_error_code IS NULL
    )
    OR
    (
        recommendation_status = 'processing'
        AND recommendations IS NULL
        AND recommendation_error_code IS NULL
    )
    OR
    (
        recommendation_status = 'completed'
        AND recommendations IS NOT NULL
        AND jsonb_typeof(recommendations) = 'object'
        AND recommendation_error_code IS NULL
    )
    OR
    (
        recommendation_status = 'failed'
        AND recommendations IS NULL
        AND recommendation_error_code IS NOT NULL
        AND btrim(recommendation_error_code) <> ''
    )
),

-- Recommendation processing may begin only after deterministic
-- ATS scoring has successfully completed.
--
-- A failed deterministic assessment therefore cannot proceed
-- into Gemini recommendation processing.
ADD CONSTRAINT check_recommendation_requires_completed_assessment
CHECK (
    recommendation_status = 'not_started'
    OR status = 'completed'
);


-- ============================================================
-- 8. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.candidate_cv_assessments
ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 9. EXPLICIT LEAST-PRIVILEGE GRANTS
-- ============================================================

REVOKE ALL
ON TABLE public.candidate_cv_assessments
FROM PUBLIC, anon, authenticated, service_role;


-- Candidate browser:
-- read-only access, further restricted by RLS.
GRANT SELECT
ON TABLE public.candidate_cv_assessments
TO authenticated;


-- Server backend:
-- may create and update assessments.
-- No DELETE is granted for normal application operation.
GRANT SELECT, INSERT, UPDATE
ON TABLE public.candidate_cv_assessments
TO service_role;


-- ============================================================
-- 10. CANDIDATE OWN-ROW SELECT POLICY
-- ============================================================

CREATE POLICY "Users can view their own assessments"
ON public.candidate_cv_assessments
FOR SELECT
TO authenticated
USING (
    auth.uid() = user_id
);


COMMIT;