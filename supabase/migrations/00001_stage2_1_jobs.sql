-- Stage 2.1: Public Jobs Foundation

BEGIN;

CREATE TABLE public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  company_name text NOT NULL,

  company_logo_url text,

  location_text text,
  country text,
  city text,

  workplace_type text NOT NULL DEFAULT 'unspecified'
    CHECK (
      workplace_type IN (
        'onsite',
        'hybrid',
        'remote',
        'unspecified'
      )
    ),

  employment_type text NOT NULL DEFAULT 'unspecified'
    CHECK (
      employment_type IN (
        'full_time',
        'part_time',
        'contract',
        'internship',
        'temporary',
        'volunteer',
        'unspecified'
      )
    ),

  experience_level text,

  description text NOT NULL,
  responsibilities text,
  requirements text,
  preferred_qualifications text,
  benefits text,

  salary_min numeric
    CHECK (
      salary_min IS NULL
      OR salary_min >= 0
    ),

  salary_max numeric
    CHECK (
      salary_max IS NULL
      OR salary_max >= 0
    ),

  salary_currency text,
  salary_period text,

  application_url text,
  application_email text,

  source_name text,
  source_url text,

  application_deadline timestamptz,

  status text NOT NULL DEFAULT 'draft'
    CHECK (
      status IN (
        'draft',
        'published',
        'closed',
        'archived'
      )
    ),

  featured boolean NOT NULL DEFAULT false,

  published_at timestamptz,

  created_by uuid
    REFERENCES public.profiles(id)
    ON DELETE SET NULL,

  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT jobs_salary_range_valid
    CHECK (
      salary_min IS NULL
      OR salary_max IS NULL
      OR salary_min <= salary_max
    ),

  CONSTRAINT jobs_published_at_required
    CHECK (
      status <> 'published'
      OR published_at IS NOT NULL
    )
);

-- Reuse the approved Stage 1 timestamp trigger function.
CREATE TRIGGER set_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- Indexes for public job retrieval and filtering.
CREATE INDEX idx_jobs_status_published_at
  ON public.jobs(status, published_at DESC);

CREATE INDEX idx_jobs_company_name
  ON public.jobs(company_name);

CREATE INDEX idx_jobs_country
  ON public.jobs(country);

CREATE INDEX idx_jobs_city
  ON public.jobs(city);

CREATE INDEX idx_jobs_employment_type
  ON public.jobs(employment_type);

CREATE INDEX idx_jobs_workplace_type
  ON public.jobs(workplace_type);

CREATE INDEX idx_jobs_featured_published
  ON public.jobs(published_at DESC)
  WHERE featured = true
    AND status = 'published';

-- Row Level Security.
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Least privilege.
REVOKE ALL ON public.jobs
FROM PUBLIC, anon, authenticated;

-- Public users may read jobs only.
GRANT SELECT ON public.jobs
TO anon, authenticated;

-- RLS still determines which rows can actually be read.
CREATE POLICY "Public can view published jobs"
  ON public.jobs
  FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

COMMIT;
