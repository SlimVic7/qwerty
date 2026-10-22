-- ============================================================
-- Migration: 00015_stage6_2_job_ops_source_attribution.sql
-- Stage: 6.2 External Apply + Job Source Attribution
-- Status: PENDING MANUAL PREFLIGHT REVIEW — DO NOT RUN AUTOMATICALLY
--
-- Purpose:
--   Update authoritative atomic job management RPCs (ops_update_job,
--   ops_create_job) to permit and persist Stage 6.2 source attribution
--   fields:
--     - source_type
--     - source_published_at
--     - source_last_verified_at
--
-- Security Controls:
--   - Strict explicit allowlist preserved (arbitrary keys rejected)
--   - Role checks preserved (editor draft-only, admin lifecycle)
--   - Status constraints and row-level locking (FOR UPDATE) preserved
--   - Audit logging preserved in public.job_audit_log
--   - URL and taxonomy integrity preserved
-- ============================================================

BEGIN;

-- 1. Update public.ops_update_job
CREATE OR REPLACE FUNCTION public.ops_update_job(
  p_job_id uuid,
  p_actor_id uuid,
  p_updates jsonb
) RETURNS public.jobs
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_job public.jobs;
  v_is_editor boolean;
  v_is_admin boolean;
  v_key text;
  v_allowed_keys text[] := ARRAY[
    'title', 'company_name', 'company_logo_url', 'location_text', 'country', 'city',
    'workplace_type', 'employment_type', 'experience_level', 'description',
    'responsibilities', 'requirements', 'preferred_qualifications', 'benefits',
    'salary_min', 'salary_max', 'salary_currency', 'salary_period',
    'application_url', 'application_email', 'source_name', 'source_url',
    'source_type', 'source_published_at', 'source_last_verified_at',
    'application_deadline'
  ];
BEGIN
  IF p_updates IS NULL
     OR jsonb_typeof(p_updates) <> 'object'
     OR p_updates = '{}'::jsonb THEN
    RAISE EXCEPTION 'Updates must be a non-empty JSON object';
  END IF;

  FOR v_key IN SELECT jsonb_object_keys(p_updates) LOOP
    IF NOT (v_key = ANY(v_allowed_keys)) THEN
      RAISE EXCEPTION 'Invalid update field: %', v_key;
    END IF;
  END LOOP;

  -- Validate source_type if present
  IF p_updates ? 'source_type' THEN
    IF p_updates->>'source_type' IS NULL
       OR NOT (
           p_updates->>'source_type' IN (
               'external_company',
               'external_job_board',
               'external_social',
               'external_recruiter',
               'qwerty_direct',
               'other_external'
           )
       ) THEN
      RAISE EXCEPTION
          'Invalid source_type: %',
          p_updates->>'source_type';
    END IF;
  END IF;

  -- Prevent required fields from being null or blank if present in updates
  IF p_updates ? 'title' AND (p_updates->>'title' IS NULL OR trim(p_updates->>'title') = '') THEN
    RAISE EXCEPTION 'title cannot be null or blank';
  END IF;
  IF p_updates ? 'company_name' AND (p_updates->>'company_name' IS NULL OR trim(p_updates->>'company_name') = '') THEN
    RAISE EXCEPTION 'company_name cannot be null or blank';
  END IF;
  IF p_updates ? 'description' AND (p_updates->>'description' IS NULL OR trim(p_updates->>'description') = '') THEN
    RAISE EXCEPTION 'description cannot be null or blank';
  END IF;

  -- Verify roles
  SELECT 
    EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = p_actor_id AND role = 'editor'),
    EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = p_actor_id AND role IN ('admin', 'super_admin'))
  INTO v_is_editor, v_is_admin;

  IF NOT (v_is_editor OR v_is_admin) THEN
    RAISE EXCEPTION 'Insufficient permissions to update job';
  END IF;

  -- Lock job
  SELECT * INTO v_job FROM public.jobs WHERE id = p_job_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job not found';
  END IF;

  -- Enforce lifecycle update rules
  IF v_job.status = 'archived' THEN
    RAISE EXCEPTION 'Archived jobs cannot be edited';
  END IF;

  IF v_is_editor AND NOT v_is_admin AND v_job.status <> 'draft' THEN
    RAISE EXCEPTION 'Editors can only modify draft jobs';
  END IF;

  UPDATE public.jobs SET
    title = CASE WHEN p_updates ? 'title' THEN p_updates->>'title' ELSE title END,
    company_name = CASE WHEN p_updates ? 'company_name' THEN p_updates->>'company_name' ELSE company_name END,
    company_logo_url = CASE WHEN p_updates ? 'company_logo_url' THEN p_updates->>'company_logo_url' ELSE company_logo_url END,
    location_text = CASE WHEN p_updates ? 'location_text' THEN p_updates->>'location_text' ELSE location_text END,
    country = CASE WHEN p_updates ? 'country' THEN p_updates->>'country' ELSE country END,
    city = CASE WHEN p_updates ? 'city' THEN p_updates->>'city' ELSE city END,
    workplace_type = CASE WHEN p_updates ? 'workplace_type' THEN p_updates->>'workplace_type' ELSE workplace_type END,
    employment_type = CASE WHEN p_updates ? 'employment_type' THEN p_updates->>'employment_type' ELSE employment_type END,
    experience_level = CASE WHEN p_updates ? 'experience_level' THEN p_updates->>'experience_level' ELSE experience_level END,
    description = CASE WHEN p_updates ? 'description' THEN p_updates->>'description' ELSE description END,
    responsibilities = CASE WHEN p_updates ? 'responsibilities' THEN p_updates->>'responsibilities' ELSE responsibilities END,
    requirements = CASE WHEN p_updates ? 'requirements' THEN p_updates->>'requirements' ELSE requirements END,
    preferred_qualifications = CASE WHEN p_updates ? 'preferred_qualifications' THEN p_updates->>'preferred_qualifications' ELSE preferred_qualifications END,
    benefits = CASE WHEN p_updates ? 'benefits' THEN p_updates->>'benefits' ELSE benefits END,
    salary_min = CASE WHEN p_updates ? 'salary_min' THEN (p_updates->>'salary_min')::numeric ELSE salary_min END,
    salary_max = CASE WHEN p_updates ? 'salary_max' THEN (p_updates->>'salary_max')::numeric ELSE salary_max END,
    salary_currency = CASE WHEN p_updates ? 'salary_currency' THEN p_updates->>'salary_currency' ELSE salary_currency END,
    salary_period = CASE WHEN p_updates ? 'salary_period' THEN p_updates->>'salary_period' ELSE salary_period END,
    application_url = CASE WHEN p_updates ? 'application_url' THEN p_updates->>'application_url' ELSE application_url END,
    application_email = CASE WHEN p_updates ? 'application_email' THEN p_updates->>'application_email' ELSE application_email END,
    source_name = CASE WHEN p_updates ? 'source_name' THEN p_updates->>'source_name' ELSE source_name END,
    source_url = CASE WHEN p_updates ? 'source_url' THEN p_updates->>'source_url' ELSE source_url END,
    source_type = CASE WHEN p_updates ? 'source_type' THEN p_updates->>'source_type' ELSE source_type END,
    source_published_at = CASE WHEN p_updates ? 'source_published_at' THEN (p_updates->>'source_published_at')::timestamptz ELSE source_published_at END,
    source_last_verified_at = CASE WHEN p_updates ? 'source_last_verified_at' THEN (p_updates->>'source_last_verified_at')::timestamptz ELSE source_last_verified_at END,
    application_deadline = CASE WHEN p_updates ? 'application_deadline' THEN (p_updates->>'application_deadline')::timestamptz ELSE application_deadline END,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = p_job_id
  RETURNING * INTO v_job;

  INSERT INTO public.job_audit_log (job_id, actor_id, action, previous_status, new_status, metadata)
  VALUES (v_job.id, p_actor_id, 'updated', v_job.status, v_job.status, jsonb_build_object('fields_updated', (SELECT jsonb_agg(k) FROM jsonb_object_keys(p_updates) k)));

  RETURN v_job;
END;
$$;

-- 2. Drop legacy 25-argument ops_create_job and recreate with defaults for source fields
DROP FUNCTION IF EXISTS public.ops_create_job(
  uuid, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, numeric, numeric, text, text, text, text, text, text, timestamptz
);

CREATE OR REPLACE FUNCTION public.ops_create_job(
  p_actor_id uuid,
  p_slug text,
  p_title text,
  p_company_name text,
  p_company_logo_url text,
  p_location_text text,
  p_country text,
  p_city text,
  p_workplace_type text,
  p_employment_type text,
  p_experience_level text,
  p_description text,
  p_responsibilities text,
  p_requirements text,
  p_preferred_qualifications text,
  p_benefits text,
  p_salary_min numeric,
  p_salary_max numeric,
  p_salary_currency text,
  p_salary_period text,
  p_application_url text,
  p_application_email text,
  p_source_name text,
  p_source_url text,
  p_application_deadline timestamptz,
  p_source_type text DEFAULT 'other_external',
  p_source_published_at timestamptz DEFAULT NULL,
  p_source_last_verified_at timestamptz DEFAULT NULL
) RETURNS public.jobs
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_job public.jobs;
  v_has_role boolean;
BEGIN
  -- Check roles (editor, admin, super_admin)
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = p_actor_id 
    AND role IN ('editor', 'admin', 'super_admin')
  ) INTO v_has_role;

  IF NOT v_has_role THEN
    RAISE EXCEPTION 'Insufficient permissions to create job';
  END IF;

  IF p_source_type IS NOT NULL AND NOT (p_source_type IN ('external_company', 'external_job_board', 'external_social', 'external_recruiter', 'qwerty_direct', 'other_external')) THEN
    RAISE EXCEPTION 'Invalid source_type: %', p_source_type;
  END IF;

  INSERT INTO public.jobs (
    slug, title, company_name, company_logo_url, location_text, country, city,
    workplace_type, employment_type, experience_level, description, responsibilities,
    requirements, preferred_qualifications, benefits, salary_min, salary_max,
    salary_currency, salary_period, application_url, application_email,
    source_name, source_url, source_type, source_published_at, source_last_verified_at,
    application_deadline, status, featured, published_at, created_by
  ) VALUES (
    p_slug, p_title, p_company_name, p_company_logo_url, p_location_text, p_country, p_city,
    COALESCE(p_workplace_type, 'unspecified'), COALESCE(p_employment_type, 'unspecified'),
    p_experience_level, p_description, p_responsibilities,
    p_requirements, p_preferred_qualifications, p_benefits, p_salary_min, p_salary_max,
    p_salary_currency, p_salary_period, p_application_url, p_application_email,
    p_source_name, p_source_url, COALESCE(p_source_type, 'other_external'),
    p_source_published_at, p_source_last_verified_at,
    p_application_deadline, 'draft', false, NULL, p_actor_id
  ) RETURNING * INTO v_job;

  INSERT INTO public.job_audit_log (job_id, actor_id, action, previous_status, new_status, metadata)
  VALUES (v_job.id, p_actor_id, 'created', NULL, 'draft', jsonb_build_object('title', p_title, 'source_type', v_job.source_type));

  RETURN v_job;
END;
$$;

-- 3. Grants and execution permissions (Signature-Specific)
REVOKE EXECUTE
ON FUNCTION public.ops_update_job(uuid, uuid, jsonb)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
ON FUNCTION public.ops_update_job(uuid, uuid, jsonb)
TO service_role;

REVOKE EXECUTE
ON FUNCTION public.ops_create_job(
  uuid,
  text, text, text, text, text, text, text, text, text,
  text, text, text, text, text, text,
  numeric, numeric,
  text, text, text, text, text, text,
  timestamptz,
  text,
  timestamptz,
  timestamptz
)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
ON FUNCTION public.ops_create_job(
  uuid,
  text, text, text, text, text, text, text, text, text,
  text, text, text, text, text, text,
  numeric, numeric,
  text, text, text, text, text, text,
  timestamptz,
  text,
  timestamptz,
  timestamptz
)
TO service_role;

COMMIT;
