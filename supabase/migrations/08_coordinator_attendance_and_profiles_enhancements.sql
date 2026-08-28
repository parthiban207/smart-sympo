-- Migration: 08_coordinator_attendance_and_profiles_enhancements.sql
-- Ensures checked_in_at column on registrations and roll_no, college columns on profiles

-- 1. Ensure registrations has checked_in_at column and synchronizes with attended_at
ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ DEFAULT NULL;

-- Backfill checked_in_at from attended_at if null
UPDATE public.registrations
SET checked_in_at = attended_at
WHERE checked_in_at IS NULL AND attended_at IS NOT NULL;

-- 2. Ensure profiles has roll_no and college columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS roll_no TEXT,
  ADD COLUMN IF NOT EXISTS college TEXT;

-- Backfill roll_no from college_id if null
UPDATE public.profiles
SET roll_no = college_id
WHERE roll_no IS NULL AND college_id IS NOT NULL;

-- 3. Enable Realtime on registrations and attendance_logs if not already enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'registrations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.registrations;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'attendance_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_logs;
  END IF;
END $$;
