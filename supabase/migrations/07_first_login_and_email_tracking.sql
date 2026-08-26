-- Migration: 07_first_login_and_email_tracking.sql
-- Adds first_login flag to public.profiles table for first-time welcome email dispatch

-- 1. Add first_login column if it doesn't already exist
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_login BOOLEAN DEFAULT TRUE;

-- 2. Update handle_new_user trigger to initialize first_login to true
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, full_name, email, role, college_id, first_login)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'student'),
    COALESCE(new.raw_user_meta_data->>'college_id', 'STUDENT-' || upper(substring(new.id::text from 1 for 6))),
    TRUE
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    role = COALESCE(public.profiles.role, EXCLUDED.role),
    college_id = COALESCE(public.profiles.college_id, EXCLUDED.college_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
