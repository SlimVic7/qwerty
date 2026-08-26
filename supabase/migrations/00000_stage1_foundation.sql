-- Stage 1.4 Baseline: Auth, Profiles, Roles, Talent Pool

-- 1. Reusable Timestamp Trigger
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

-- Revoke execute on timestamp function from public
REVOKE EXECUTE ON FUNCTION public.set_current_timestamp_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_current_timestamp_updated_at() FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_current_timestamp_updated_at() FROM authenticated;

-- 2. Profiles Table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text,
  last_name text,
  display_name text,
  phone text,
  country text,
  city text,
  professional_headline text,
  avatar_url text,
  profile_status text DEFAULT 'draft' NOT NULL CHECK (profile_status IN ('draft', 'published', 'archived')),
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Attach updated_at trigger
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_current_timestamp_updated_at();

-- 3. User Roles Table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('candidate', 'recruiter', 'editor', 'admin', 'super_admin')),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  UNIQUE(user_id, role)
);

-- 4. Talent Pool Preferences
CREATE TABLE public.talent_pool_preferences (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_visible_to_qwerty_recruitment boolean DEFAULT false NOT NULL,
  consent_given_at timestamptz,
  consent_version text,
  availability_status text,
  preferred_locations text[],
  remote_preference text,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Attach updated_at trigger
CREATE TRIGGER set_talent_pool_preferences_updated_at
  BEFORE UPDATE ON public.talent_pool_preferences
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_current_timestamp_updated_at();

-- Consent Timestamp Integrity Trigger
CREATE OR REPLACE FUNCTION public.handle_talent_pool_consent()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  -- Automatically record consent when visibility flips to true
  IF (OLD.is_visible_to_qwerty_recruitment = false AND NEW.is_visible_to_qwerty_recruitment = true) THEN
    NEW.consent_given_at = CURRENT_TIMESTAMP;
    NEW.consent_version = '1.0'; -- Stage 1.4 baseline version
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_talent_pool_consent() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_talent_pool_consent() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_talent_pool_consent() FROM authenticated;

CREATE TRIGGER enforce_talent_pool_consent
  BEFORE UPDATE ON public.talent_pool_preferences
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_talent_pool_consent();

-- 5. Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.talent_pool_preferences ENABLE ROW LEVEL SECURITY;

-- 6. Grants
-- Revoke default public schema grants to ensure an absolute clean slate
REVOKE ALL ON public.profiles FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.user_roles FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.talent_pool_preferences FROM PUBLIC, anon, authenticated;

-- Least Privilege Grants for authenticated users (Column-Level UPDATE)
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (first_name, last_name, display_name, phone, country, city, professional_headline, avatar_url) 
  ON public.profiles TO authenticated;

GRANT SELECT ON public.user_roles TO authenticated;
-- (No UPDATE/INSERT/DELETE grants for user_roles)

GRANT SELECT ON public.talent_pool_preferences TO authenticated;
GRANT UPDATE (is_visible_to_qwerty_recruitment, availability_status, preferred_locations, remote_preference) 
  ON public.talent_pool_preferences TO authenticated;

-- 7. RLS Policies

-- Profiles
CREATE POLICY "Candidate can read own profile" 
  ON public.profiles FOR SELECT 
  TO authenticated 
  USING (auth.uid() = id);

CREATE POLICY "Candidate can update own profile" 
  ON public.profiles FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- User Roles
CREATE POLICY "User can read own roles" 
  ON public.user_roles FOR SELECT 
  TO authenticated 
  USING (auth.uid() = user_id);
-- Mutation restricted to trusted backend / secret key operations

-- Talent Pool Preferences
CREATE POLICY "Candidate can read own talent pool preferences" 
  ON public.talent_pool_preferences FOR SELECT 
  TO authenticated 
  USING (auth.uid() = user_id);

CREATE POLICY "Candidate can update own talent pool preferences" 
  ON public.talent_pool_preferences FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- 8. New User Provisioning Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = ''
AS $$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  
  -- Insert default candidate role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'candidate');

  -- Insert default talent pool preference
  INSERT INTO public.talent_pool_preferences (user_id, is_visible_to_qwerty_recruitment)
  VALUES (NEW.id, false);

  RETURN NEW;
END;
$$;

-- Restrict execution privileges
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;

-- Bind trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
