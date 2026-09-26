BEGIN;

-- ============================================================
-- Stage 4.4: QWERTY Talent Pool & Recruiter Access Architecture
-- Hardened Migration (00010) - DRAFT FOR MANUAL REVIEW
-- ============================================================

-- 1. Extend public.talent_pool_preferences
ALTER TABLE public.talent_pool_preferences
  ADD COLUMN allow_cv_access boolean DEFAULT false NOT NULL,
  ADD COLUMN withdrawn_at timestamptz;

-- 2. Consistency CHECK Constraint: CV access strictly requires recruitment visibility
ALTER TABLE public.talent_pool_preferences
  ADD CONSTRAINT chk_talent_pool_cv_access_consistency
  CHECK (NOT allow_cv_access OR is_visible_to_qwerty_recruitment = true);

-- 3. Active Consent Integrity CHECK Constraint:
-- Being visible to recruitment strictly requires non-withdrawn active consent and non-blank version
ALTER TABLE public.talent_pool_preferences
  ADD CONSTRAINT chk_talent_pool_active_consent
  CHECK (
    NOT is_visible_to_qwerty_recruitment
    OR (
      consent_given_at IS NOT NULL
      AND consent_version IS NOT NULL
      AND trim(consent_version) <> ''
      AND withdrawn_at IS NULL
    )
  );

-- 4. Enhanced Consent & Withdrawal Lifecycle Trigger (BEFORE INSERT OR UPDATE)
CREATE OR REPLACE FUNCTION public.handle_talent_pool_consent()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.is_visible_to_qwerty_recruitment = true THEN
      NEW.consent_given_at := CURRENT_TIMESTAMP;
      NEW.consent_version := 'talent-pool-v1';
      NEW.withdrawn_at := NULL;
    ELSE
      NEW.allow_cv_access := false;
      NEW.consent_given_at := NULL;
      NEW.consent_version := NULL;
      NEW.withdrawn_at := NULL;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Transition false -> true: record fresh consent, clear withdrawn_at
    IF (OLD.is_visible_to_qwerty_recruitment = false AND NEW.is_visible_to_qwerty_recruitment = true) THEN
      NEW.consent_given_at := CURRENT_TIMESTAMP;
      NEW.consent_version := 'talent-pool-v1';
      NEW.withdrawn_at := NULL;
    -- Transition true -> false: record withdrawal and revoke CV access
    ELSIF (OLD.is_visible_to_qwerty_recruitment = true AND NEW.is_visible_to_qwerty_recruitment = false) THEN
      NEW.withdrawn_at := CURRENT_TIMESTAMP;
      NEW.allow_cv_access := false;
    END IF;
  END IF;

  -- Defense in depth: at all times, if not currently visible to recruitment, allow_cv_access MUST be false
  IF NEW.is_visible_to_qwerty_recruitment = false THEN
    NEW.allow_cv_access := false;
  END IF;

  RETURN NEW;
END;
$$;

-- Secure function execution
REVOKE EXECUTE ON FUNCTION public.handle_talent_pool_consent() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_talent_pool_consent() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_talent_pool_consent() FROM authenticated;

-- Attach trigger for both INSERT and UPDATE
DROP TRIGGER IF EXISTS enforce_talent_pool_consent ON public.talent_pool_preferences;
CREATE TRIGGER enforce_talent_pool_consent
  BEFORE INSERT OR UPDATE ON public.talent_pool_preferences
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_talent_pool_consent();

-- 5. Normalize Privileges explicitly on public.talent_pool_preferences
REVOKE ALL ON public.talent_pool_preferences FROM PUBLIC, anon, authenticated, service_role;

-- service_role least privilege: SELECT, INSERT, UPDATE only (no DELETE)
GRANT SELECT, INSERT, UPDATE ON public.talent_pool_preferences TO service_role;

-- authenticated least privilege: SELECT own row (via RLS), UPDATE only candidate-controlled preference columns
GRANT SELECT ON public.talent_pool_preferences TO authenticated;
GRANT UPDATE (
  is_visible_to_qwerty_recruitment,
  allow_cv_access,
  availability_status,
  preferred_locations,
  remote_preference
) ON public.talent_pool_preferences TO authenticated;

-- 6. Create recruiter_access_audit_log (Fail loudly if schema drift exists)
CREATE TABLE public.recruiter_access_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  candidate_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  action text NOT NULL CHECK (action IN ('candidate_profile_viewed', 'candidate_cv_accessed')),
  object_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,

  CONSTRAINT metadata_is_object CHECK (jsonb_typeof(metadata) = 'object')
);

-- Indexes for deterministic audit queries and accountability
CREATE INDEX idx_recruiter_access_audit_recruiter 
  ON public.recruiter_access_audit_log(recruiter_id, created_at DESC);
CREATE INDEX idx_recruiter_access_audit_candidate 
  ON public.recruiter_access_audit_log(candidate_id, created_at DESC);
CREATE INDEX idx_recruiter_access_audit_action 
  ON public.recruiter_access_audit_log(action, created_at DESC);

-- 7. Row Level Security & Explicit Privilege Normalization for recruiter_access_audit_log
ALTER TABLE public.recruiter_access_audit_log ENABLE ROW LEVEL SECURITY;

-- Revoke all access from all roles
REVOKE ALL ON public.recruiter_access_audit_log FROM PUBLIC, anon, authenticated, service_role;

-- Only service_role can append and inspect audit records.
-- No UPDATE or DELETE privileges granted to guarantee audit immutability.
GRANT SELECT, INSERT ON public.recruiter_access_audit_log TO service_role;

COMMIT;
