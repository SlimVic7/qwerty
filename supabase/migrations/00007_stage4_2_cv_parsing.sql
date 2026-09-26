BEGIN;

-- Stage 4.2: CV Parsing & Structured Profile Extraction

-- ============================================================
-- 1. ENFORCE CV OWNER / PARSE OWNER CONSISTENCY
-- ============================================================

ALTER TABLE public.candidate_cv_versions
ADD CONSTRAINT candidate_cv_versions_id_user_id_key
UNIQUE (id, user_id);


-- ============================================================
-- 2. CREATE CV PARSE TABLE
-- ============================================================

CREATE TABLE public.candidate_cv_parses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    cv_version_id uuid NOT NULL,
    user_id uuid NOT NULL,

    status text NOT NULL
        CHECK (
            status IN (
                'pending',
                'extracting_text',
                'processing',
                'completed',
                'needs_review',
                'failed'
            )
        ),

    parser_version text,
    ai_provider text,
    ai_model text,

    raw_text_hash text,

    -- Raw Gemini structured output
    extracted_data jsonb,

    -- Candidate-confirmed/corrected structured output
    reviewed_data jsonb,

    validation_issues jsonb NOT NULL DEFAULT '[]'::jsonb,

    error_code text,

    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,

    completed_at timestamptz,
    reviewed_at timestamptz,
    applied_at timestamptz,

    -- ========================================================
    -- Ownership integrity
    -- ========================================================

    CONSTRAINT candidate_cv_parse_owner_fk
        FOREIGN KEY (cv_version_id, user_id)
        REFERENCES public.candidate_cv_versions(id, user_id)
        ON DELETE CASCADE,

    -- ========================================================
    -- JSON integrity
    -- ========================================================

    CONSTRAINT cv_parse_extracted_data_shape
        CHECK (
            extracted_data IS NULL
            OR jsonb_typeof(extracted_data) = 'object'
        ),

    CONSTRAINT cv_parse_reviewed_data_shape
        CHECK (
            reviewed_data IS NULL
            OR jsonb_typeof(reviewed_data) = 'object'
        ),

    CONSTRAINT cv_parse_validation_issues_shape
        CHECK (
            jsonb_typeof(validation_issues) = 'array'
        ),

    -- reviewed_data and reviewed_at must travel together
    CONSTRAINT cv_parse_review_consistency
        CHECK (
            (reviewed_data IS NULL AND reviewed_at IS NULL)
            OR
            (reviewed_data IS NOT NULL AND reviewed_at IS NOT NULL)
        ),

    -- ========================================================
    -- Parse lifecycle integrity
    -- ========================================================

    CONSTRAINT cv_parse_status_consistency
        CHECK (
            (
                status IN ('completed', 'needs_review')
                AND completed_at IS NOT NULL
                AND error_code IS NULL
                AND extracted_data IS NOT NULL
            )
            OR
            (
                status = 'failed'
                AND completed_at IS NOT NULL
                AND error_code IS NOT NULL
                AND btrim(error_code) <> ''
            )
            OR
            (
                status IN ('pending', 'extracting_text', 'processing')
                AND completed_at IS NULL
                AND applied_at IS NULL
            )
        ),

    -- Applying to authoritative candidate profile requires
    -- reviewed/confirmed candidate data.
    CONSTRAINT cv_parse_apply_consistency
        CHECK (
            applied_at IS NULL
            OR (
                status = 'completed'
                AND reviewed_data IS NOT NULL
                AND reviewed_at IS NOT NULL
            )
        )
);


-- ============================================================
-- 3. INDEXES
-- ============================================================

CREATE INDEX idx_candidate_cv_parses_cv_version_id
ON public.candidate_cv_parses(cv_version_id);

CREATE INDEX idx_candidate_cv_parses_user_id
ON public.candidate_cv_parses(user_id);


-- Only one active AI parse may exist for a CV version at a time.
CREATE UNIQUE INDEX idx_single_active_parse_per_cv
ON public.candidate_cv_parses(cv_version_id)
WHERE status IN (
    'pending',
    'extracting_text',
    'processing'
);


-- ============================================================
-- 4. UPDATED_AT TRIGGER
-- ============================================================

CREATE TRIGGER set_candidate_cv_parses_updated_at
BEFORE UPDATE ON public.candidate_cv_parses
FOR EACH ROW
EXECUTE PROCEDURE public.set_current_timestamp_updated_at();


-- ============================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.candidate_cv_parses
ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Candidate can read own cv parses"
ON public.candidate_cv_parses
FOR SELECT
TO authenticated
USING (
    auth.uid() = user_id
);


-- ============================================================
-- 6. EXPLICIT LEAST-PRIVILEGE GRANTS
-- ============================================================

REVOKE ALL ON TABLE public.candidate_cv_parses
FROM PUBLIC, anon, authenticated, service_role;

-- Browser may only read its own rows via RLS.
GRANT SELECT
ON TABLE public.candidate_cv_parses
TO authenticated;

-- Backend controls parse creation and lifecycle.
GRANT SELECT, INSERT, UPDATE
ON TABLE public.candidate_cv_parses
TO service_role;

-- No normal DELETE privilege.
-- Parse history is retained.

COMMIT;
