BEGIN;

-- Genuinely missing required schema object:
-- service_role requires SELECT and UPDATE on public.profiles to execute 
-- the candidate_add_cv_version RPC (which uses SECURITY INVOKER), and to
-- update the candidate's profile from the backend API.
GRANT SELECT ON public.profiles TO service_role;

GRANT UPDATE (
  first_name,
  last_name,
  display_name,
  phone,
  country,
  city,
  professional_headline,
  avatar_url,
  professional_summary,
  years_experience,
  linkedin_url,
  portfolio_url,
  github_url
) ON public.profiles TO service_role;

COMMIT;
