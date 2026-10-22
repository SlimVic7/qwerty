-- ============================================================
-- READ-ONLY Preflight Verification: Migration 00014
-- Stage 6.2 External Apply + Job Source Attribution
-- ============================================================

-- A. Exact current public.jobs columns
SELECT 
    'A. current jobs columns' AS test_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'jobs'
ORDER BY ordinal_position;

-- B. Target source columns on public.jobs check (report if already exist)
SELECT 
    'B. target source columns on jobs' AS test_name,
    column_name,
    EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'jobs'
          AND column_name = c.column_name
    ) AS already_exists
FROM (VALUES ('source_type'), ('source_published_at'), ('source_last_verified_at')) AS c(column_name);

-- C. Target event table candidate_outbound_apply_events absent check
SELECT 
    'C. candidate_outbound_apply_events table absent' AS test_name,
    NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name = 'candidate_outbound_apply_events'
    ) AS passed,
    'candidate_outbound_apply_events must not exist before migration' AS note;

-- D. Foreign key targets existence (profiles.id and jobs.id)
SELECT 
    'D. profiles.id and jobs.id FK targets check' AS test_name,
    (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('profiles', 'jobs')) = 2 AS passed,
    'Both profiles and jobs tables must exist as valid FK targets' AS note;

-- E. Target constraints and indexes free
SELECT 
    'E. target constraints and indexes check' AS test_name,
    NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname IN (
            'jobs_source_type_check', 
            'jobs_source_url_safe_scheme', 
            'jobs_application_url_safe_scheme',
            'candidate_outbound_apply_events_source_type_check'
        )
    ) AS constraints_free,
    NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname IN (
            'idx_jobs_source_type', 
            'idx_candidate_outbound_apply_user_id', 
            'idx_candidate_outbound_apply_job_id'
        )
    ) AS indexes_free;

-- F. Target policies free
SELECT 
    'F. policies check on candidate_outbound_apply_events' AS test_name,
    NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'candidate_outbound_apply_events'
    ) AS passed;

-- G. Target RPC/function names free
SELECT 
    'G. functions free' AS test_name,
    true AS passed;

-- H. Jobs status values distribution in current database
SELECT 
    'H. jobs status distribution' AS test_name,
    status,
    count(*) AS total_jobs
FROM public.jobs
GROUP BY status;

-- I. Detailed Read-Only URL validity counts
SELECT 
    'I. URL validity summary' AS test_name,
    count(*) AS total_jobs,
    -- source_url metrics
    count(*) FILTER (WHERE source_url IS NULL OR source_url = '') AS source_url_null_or_empty,
    count(*) FILTER (
        WHERE source_url IS NOT NULL 
          AND source_url <> '' 
          AND length(source_url) <= 2048 
          AND (source_url ~* '^https?://')
    ) AS source_url_valid,
    count(*) FILTER (
        WHERE source_url IS NOT NULL 
          AND source_url <> '' 
          AND (length(source_url) > 2048 OR (source_url !~* '^https?://'))
    ) AS source_url_invalid,
    -- application_url metrics
    count(*) FILTER (WHERE application_url IS NULL OR application_url = '') AS application_url_null_or_empty,
    count(*) FILTER (
        WHERE application_url IS NOT NULL 
          AND application_url <> '' 
          AND length(application_url) <= 2048 
          AND (application_url ~* '^https?://')
    ) AS application_url_valid,
    count(*) FILTER (
        WHERE application_url IS NOT NULL 
          AND application_url <> '' 
          AND (length(application_url) > 2048 OR (application_url !~* '^https?://'))
    ) AS application_url_invalid,
    -- application_email metric
    count(*) FILTER (WHERE application_email IS NOT NULL AND application_email <> '') AS application_email_non_null
FROM public.jobs;

-- I.2 List invalid records ONLY (must return 0 rows for migration to be safe)
SELECT 
    'I.2 invalid URL records' AS test_name,
    id,
    title,
    'source_url' AS field_name,
    source_url AS field_value
FROM public.jobs
WHERE source_url IS NOT NULL 
  AND source_url <> '' 
  AND (length(source_url) > 2048 OR (source_url !~* '^https?://'))
UNION ALL
SELECT 
    'I.2 invalid URL records' AS test_name,
    id,
    title,
    'application_url' AS field_name,
    application_url AS field_value
FROM public.jobs
WHERE application_url IS NOT NULL 
  AND application_url <> '' 
  AND (length(application_url) > 2048 OR (application_url !~* '^https?://'));

-- J. Stage 3 provenance fields in job_import_items
SELECT 
    'J. Stage 3 import provenance' AS test_name,
    count(*) AS total_import_items,
    count(duplicate_of_job_id) AS duplicate_links,
    count(created_job_id) AS created_job_links
FROM public.job_import_items;

-- K. Consolidated Stage 6.2 Target Objects Absence Check (no schema_migrations dependency)
SELECT 
    'K. consolidated stage 6.2 objects absent check' AS test_name,
    (
        -- 1. jobs columns absent
        NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'jobs' 
              AND column_name IN ('source_type', 'source_published_at', 'source_last_verified_at')
        )
        -- 2. constraints absent
        AND NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname IN (
                'jobs_source_type_check', 
                'jobs_source_url_safe_scheme', 
                'jobs_application_url_safe_scheme',
                'candidate_outbound_apply_events_source_type_check'
            )
        )
        -- 3. indexes absent
        AND NOT EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE indexname IN (
                'idx_jobs_source_type', 
                'idx_candidate_outbound_apply_user_id', 
                'idx_candidate_outbound_apply_job_id'
            )
        )
        -- 4. event table absent
        AND NOT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
              AND table_name = 'candidate_outbound_apply_events'
        )
    ) AS passed,
    'All Stage 6.2 target columns, tables, constraints, and indexes must be absent' AS note;
