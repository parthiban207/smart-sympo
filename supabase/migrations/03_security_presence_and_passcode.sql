-- Migration: Security, Presence, 5-Admin Limit, Passcode Verification & Account Deletion

-- 1. Add username and pass_code columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pass_code TEXT DEFAULT '1234';

-- 2. Admin Limit Function & Trigger (Max 5 Admins)
CREATE OR REPLACE FUNCTION public.check_admin_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_admin_count INT;
BEGIN
  IF NEW.role = 'admin' AND (OLD IS NULL OR OLD.role IS DISTINCT FROM 'admin') THEN
    SELECT COUNT(*) INTO v_admin_count FROM public.profiles WHERE role = 'admin' AND id <> NEW.id;
    IF v_admin_count >= 5 THEN
      RAISE EXCEPTION 'Maximum limit of 5 Admins reached.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_check_admin_limit ON public.profiles;
CREATE TRIGGER trg_check_admin_limit
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.check_admin_limit();

-- 3. Update handle_new_user function to sync metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_username TEXT;
  v_full_name TEXT;
  v_role TEXT;
  v_pass_code TEXT;
BEGIN
  v_full_name := COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1));
  v_username := COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1));
  v_role := COALESCE(new.raw_user_meta_data->>'role', 'student');
  v_pass_code := COALESCE(new.raw_user_meta_data->>'pass_code', '1234');

  INSERT INTO public.profiles (id, full_name, name, username, email, role, college_id, pass_code)
  VALUES (
    new.id,
    v_full_name,
    v_full_name,
    v_username,
    new.email,
    v_role,
    COALESCE(new.raw_user_meta_data->>'college_id', 'COL-' || upper(substring(new.id::text from 1 for 6))),
    v_pass_code
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    name = EXCLUDED.name,
    username = EXCLUDED.username,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    pass_code = COALESCE(EXCLUDED.pass_code, public.profiles.pass_code);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Passcode Verification RPC Function
CREATE OR REPLACE FUNCTION public.verify_student_pass_code(p_student_id UUID, p_pass_code TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_match BOOLEAN;
BEGIN
  SELECT (pass_code = p_pass_code) INTO v_match
  FROM public.profiles
  WHERE id = p_student_id;
  RETURN COALESCE(v_match, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Delete Account RPC Function
CREATE OR REPLACE FUNCTION public.delete_user_account(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM public.profiles WHERE id = p_user_id;
  DELETE FROM auth.users WHERE id = p_user_id;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
