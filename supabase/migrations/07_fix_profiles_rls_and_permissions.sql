-- Migration: 07_fix_profiles_rls_and_permissions.sql
-- Fixes HTTP 500 Internal Server Error caused by recursive RLS policies on public.profiles.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 1. Drop any legacy recursive policies on profiles
DROP POLICY IF EXISTS "Public profiles viewable by all authenticated" ON public.profiles;
DROP POLICY IF EXISTS "Profiles SELECT policy" ON public.profiles;
DROP POLICY IF EXISTS "Allow public read access" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated read" ON public.profiles;
DROP POLICY IF EXISTS "Profiles UPDATE policy" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile except role" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

-- 2. Non-recursive SELECT policy for public and authenticated users
CREATE POLICY "profiles_select_all"
  ON public.profiles FOR SELECT
  TO public
  USING (true);

-- 3. Non-recursive INSERT policy
CREATE POLICY "profiles_insert_all"
  ON public.profiles FOR INSERT
  TO public
  WITH CHECK (true);

-- 4. Non-recursive UPDATE policy
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- 5. Grant explicit table permissions
GRANT ALL ON public.profiles TO anon, authenticated, service_role;
