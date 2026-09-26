-- Stage 3.1: Bulk Job Intake Foundation

BEGIN;

CREATE TABLE public.job_import_batches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    created_by uuid
        REFERENCES public.profiles(id)
        ON DELETE SET NULL,

    source_type text NOT NULL DEFAULT 'paste',

    raw_text text NOT NULL
        CHECK (length(trim(raw_text)) > 0),

    status text NOT NULL DEFAULT 'received'
        CHECK (
            status IN (
                'received',
                'processing',
                'review',
                'completed',
                'failed'
            )
        ),

    total_detected integer NOT NULL DEFAULT 0
        CHECK (total_detected >= 0),

    ready_count integer NOT NULL DEFAULT 0
        CHECK (ready_count >= 0),

    review_count integer NOT NULL DEFAULT 0
        CHECK (review_count >= 0),

    duplicate_count integer NOT NULL DEFAULT 0
        CHECK (duplicate_count >= 0),

    failed_count integer NOT NULL DEFAULT 0
        CHECK (failed_count >= 0),

    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.job_import_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    batch_id uuid NOT NULL
        REFERENCES public.job_import_batches(id)
        ON DELETE CASCADE,

    sequence_number integer NOT NULL
        CHECK (sequence_number > 0),

    raw_text text NOT NULL
        CHECK (length(trim(raw_text)) > 0),

    extracted_data jsonb NOT NULL DEFAULT '{}'::jsonb
        CHECK (jsonb_typeof(extracted_data) = 'object'),

    normalized_data jsonb NOT NULL DEFAULT '{}'::jsonb
        CHECK (jsonb_typeof(normalized_data) = 'object'),

    validation_issues jsonb NOT NULL DEFAULT '[]'::jsonb
        CHECK (jsonb_typeof(validation_issues) = 'array'),

    confidence_score numeric
        CHECK (
            confidence_score IS NULL
            OR (
                confidence_score >= 0
                AND confidence_score <= 1
            )
        ),

    duplicate_of_job_id uuid
        REFERENCES public.jobs(id)
        ON DELETE SET NULL,

    review_status text NOT NULL DEFAULT 'pending'
        CHECK (
            review_status IN (
                'pending',
                'ready',
                'needs_review',
                'duplicate',
                'rejected',
                'approved',
                'imported'
            )
        ),

    created_job_id uuid
        REFERENCES public.jobs(id)
        ON DELETE SET NULL,

    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT job_import_items_batch_sequence_unique
        UNIQUE (batch_id, sequence_number),

    CONSTRAINT imported_item_requires_job
        CHECK (
            review_status <> 'imported'
            OR created_job_id IS NOT NULL
        )
);

-- Reuse approved Stage 1 updated_at function.
CREATE TRIGGER set_job_import_batches_updated_at
    BEFORE UPDATE ON public.job_import_batches
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER set_job_import_items_updated_at
    BEFORE UPDATE ON public.job_import_items
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- Indexes.
CREATE INDEX idx_job_import_batches_status_created
    ON public.job_import_batches(status, created_at DESC);

CREATE INDEX idx_job_import_batches_created_by
    ON public.job_import_batches(created_by);

CREATE INDEX idx_job_import_items_batch_status
    ON public.job_import_items(batch_id, review_status);

CREATE INDEX idx_job_import_items_duplicate_job
    ON public.job_import_items(duplicate_of_job_id)
    WHERE duplicate_of_job_id IS NOT NULL;

CREATE INDEX idx_job_import_items_created_job
    ON public.job_import_items(created_job_id)
    WHERE created_job_id IS NOT NULL;

-- RLS.
ALTER TABLE public.job_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_import_items ENABLE ROW LEVEL SECURITY;

-- Deterministic least privilege.
REVOKE ALL ON public.job_import_batches
FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON public.job_import_items
FROM PUBLIC, anon, authenticated, service_role;

-- Browser clients only receive SELECT.
GRANT SELECT ON public.job_import_batches
TO authenticated;

GRANT SELECT ON public.job_import_items
TO authenticated;

-- Server operations.
GRANT USAGE ON SCHEMA public TO service_role;

GRANT SELECT, INSERT, UPDATE
ON public.job_import_batches
TO service_role;

GRANT SELECT, INSERT, UPDATE
ON public.job_import_items
TO service_role;

-- Authorized QWERTY Ops users may read staging data.
CREATE POLICY "Ops can view import batches"
    ON public.job_import_batches
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
              AND ur.role IN (
                  'editor',
                  'admin',
                  'super_admin'
              )
        )
    );

CREATE POLICY "Ops can view import items"
    ON public.job_import_items
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
              AND ur.role IN (
                  'editor',
                  'admin',
                  'super_admin'
              )
        )
    );

COMMIT;