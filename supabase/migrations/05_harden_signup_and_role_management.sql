-- Migration: 05_harden_signup_and_role_management.sql
-- Hardens signup so all self-signups default strictly to 'student',
-- fixes RLS recursion 500 errors using SECURITY DEFINER functions,
-- and adds RPC/RLS for admin-only user role management with 5-admin limit.

-- 1. SECURITY DEFINER helper function to safely check role without RLS recursion
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE((SELECT role = 'admin' FROM public.profiles WHERE id = auth.uid()), FALSE);
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 2. Update handle_new_user trigger function on auth.users to ALWAYS force role = 'student'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_username TEXT;
  v_full_name TEXT;
  v_pass_code TEXT;
BEGIN
  v_full_name := COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1));
  v_username := COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1));
  v_pass_code := COALESCE(new.raw_user_meta_data->>'pass_code', '2005');

  -- ALWAYS force role = 'student' on self-registration, ignoring any client metadata
  INSERT INTO public.profiles (id, full_name, name, username, email, role, college_id, pass_code)
  VALUES (
    new.id,
    v_full_name,
    v_full_name,
    v_username,
    new.email,
    'student',
    COALESCE(new.raw_user_meta_data->>'college_id', 'COL-' || upper(substring(new.id::text from 1 for 6))),
    v_pass_code
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    name = EXCLUDED.name,
    username = EXCLUDED.username,
    email = EXCLUDED.email,
    role = COALESCE(public.profiles.role, 'student'),
    pass_code = COALESCE(EXCLUDED.pass_code, public.profiles.pass_code);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create RPC function update_user_role for Admin Panel role promotion/demotion
CREATE OR REPLACE FUNCTION public.update_user_role(p_target_user_id UUID, p_new_role TEXT)
RETURNS JSON AS $$
DECLARE
  v_caller_role TEXT;
  v_admin_count INT;
BEGIN
  -- Verify caller is authenticated and holds the 'admin' role
  v_caller_role := public.get_my_role();
  
  IF v_caller_role IS NULL OR v_caller_role <> 'admin' THEN
    RETURN json_build_object('success', false, 'message', 'Access Denied: Only administrators can modify user roles.');
  END IF;

  IF p_new_role NOT IN ('student', 'coordinator', 'admin') THEN
    RETURN json_build_object('success', false, 'message', 'Invalid role specified.');
  END IF;

  -- Enforce 5 Admin limit when promoting to admin
  IF p_new_role = 'admin' THEN
    SELECT COUNT(*) INTO v_admin_count FROM public.profiles WHERE role = 'admin' AND id <> p_target_user_id;
    IF v_admin_count >= 5 THEN
      RETURN json_build_object('success', false, 'message', 'Maximum limit of 5 Admins reached. Cannot promote user to Admin.');
    END IF;
  END IF;

  -- Perform role update
  UPDATE public.profiles
  SET role = p_new_role
  WHERE id = p_target_user_id;

  RETURN json_build_object('success', true, 'message', 'User role updated successfully!');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Clean non-recursive RLS Security Policies for public.profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles viewable by all authenticated" ON public.profiles;
DROP POLICY IF EXISTS "Profiles SELECT policy" ON public.profiles;
CREATE POLICY "Profiles SELECT policy"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can update own profile except role" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles UPDATE policy" ON public.profiles;

CREATE POLICY "Profiles UPDATE policy"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid() OR public.is_admin())
  WITH CHECK (id = auth.uid() OR public.is_admin());
