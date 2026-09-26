BEGIN;

-- Stage 4.1: Candidate Profile & CV Storage Foundation (Hardened)

-- 1. Extend public.profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS professional_summary text,
ADD COLUMN IF NOT EXISTS years_experience integer,
ADD COLUMN IF NOT EXISTS linkedin_url text,
ADD COLUMN IF NOT EXISTS portfolio_url text,
ADD COLUMN IF NOT EXISTS github_url text;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_years_experience_check CHECK (years_experience IS NULL OR years_experience >= 0);

-- 2. Create candidate_cv_versions table
CREATE TABLE public.candidate_cv_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    storage_path text NOT NULL,
    original_filename text NOT NULL,
    mime_type text NOT NULL,
    file_size_bytes bigint NOT NULL,
    version_number integer NOT NULL,
    is_current boolean NOT NULL DEFAULT true,
    uploaded_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
    replaced_at timestamptz,
    deleted_at timestamptz,
    
    CONSTRAINT cv_version_unique UNIQUE (user_id, version_number),
    CONSTRAINT cv_storage_path_unique UNIQUE (storage_path),
    CONSTRAINT cv_version_positive CHECK (version_number > 0),
    CONSTRAINT cv_size_valid CHECK (file_size_bytes > 0 AND file_size_bytes <= 5242880),
    CONSTRAINT cv_mime_valid CHECK (mime_type IN (
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )),
    CONSTRAINT cv_storage_path_not_blank CHECK (trim(storage_path) <> ''),

    CONSTRAINT cv_original_filename_not_blank CHECK (trim(original_filename) <> ''),

    CONSTRAINT cv_storage_path_matches_user CHECK (
      storage_path LIKE user_id::text || '/%'
      ),

    CONSTRAINT cv_deleted_not_current CHECK (
    (deleted_at IS NOT NULL AND is_current = false)
    OR (deleted_at IS NULL)
    )
);

-- Partial unique index to enforce only one active/current CV per candidate
CREATE UNIQUE INDEX candidate_cv_current_idx ON public.candidate_cv_versions (user_id) WHERE is_current = true;

-- 3. RLS and Explicit Privileges for candidate_cv_versions
ALTER TABLE public.candidate_cv_versions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.candidate_cv_versions FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.candidate_cv_versions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.candidate_cv_versions TO service_role;
-- No DELETE granted; physical deletion requires manual admin/privacy workflow.

CREATE POLICY "Candidates can read own CV versions"
ON public.candidate_cv_versions
FOR SELECT
TO authenticated
USING (user_id = auth.uid() AND deleted_at IS NULL);

-- 4. Storage Bucket Setup
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'candidate-cvs', 
    'candidate-cvs', 
    false, 
    5242880, -- 5MB limit
    ARRAY['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']::text[]
)
ON CONFLICT (id) DO UPDATE SET 
    public = false, 
    file_size_limit = 5242880, 
    allowed_mime_types = ARRAY['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']::text[];

-- 5. Storage RLS Policies
-- NO DIRECT AUTHENTICATED SELECT POLICY. Access is granted exclusively via server signed-urls and service_role.

-- 6. Atomic Versioning RPC
CREATE OR REPLACE FUNCTION public.candidate_add_cv_version(
  p_user_id uuid,
  p_storage_path text,
  p_original_filename text,
  p_mime_type text,
  p_file_size_bytes bigint
)
RETURNS public.candidate_cv_versions
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_next_version integer;
  v_new_cv public.candidate_cv_versions;
BEGIN
  -- Defense in depth: validate storage namespace
  IF p_storage_path NOT LIKE p_user_id::text || '/%' THEN
    RAISE EXCEPTION 'INVALID_STORAGE_PATH';
  END IF;

  -- Lock the candidate's profile row to serialize ALL versioning attempts (including the first one)
  PERFORM 1 FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PROFILE_NOT_FOUND';
  END IF;

  -- Determine next version
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_next_version
  FROM public.candidate_cv_versions
  WHERE user_id = p_user_id;

  -- Mark previous current CV as non-current
  UPDATE public.candidate_cv_versions
  SET is_current = false, replaced_at = CURRENT_TIMESTAMP
  WHERE user_id = p_user_id AND is_current = true;

  -- Insert new CV
  INSERT INTO public.candidate_cv_versions (
    user_id, storage_path, original_filename, mime_type, file_size_bytes, version_number, is_current, deleted_at
  ) VALUES (
    p_user_id, p_storage_path, p_original_filename, p_mime_type, p_file_size_bytes, v_next_version, true, NULL
  )
  RETURNING * INTO v_new_cv;

  RETURN v_new_cv;
END;
$$;

-- Harden RPC privileges
REVOKE ALL ON FUNCTION public.candidate_add_cv_version(uuid, text, text, text, bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.candidate_add_cv_version(uuid, text, text, text, bigint) TO service_role;

COMMIT;
