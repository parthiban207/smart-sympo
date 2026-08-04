-- Migration: 04_events_location_and_guest_checkin.sql
-- Adds location/geofence columns to events, guest columns to attendance_logs,
-- and creates the checkin_attendee RPC function.

-- 1. Add location columns to events table
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS allowed_radius INT DEFAULT 200;

-- 2. Add guest columns to attendance_logs table
ALTER TABLE public.attendance_logs
  ADD COLUMN IF NOT EXISTS guest_name TEXT,
  ADD COLUMN IF NOT EXISTS is_guest BOOLEAN DEFAULT FALSE;

-- Allow nullable student_id for guest check-ins
ALTER TABLE public.attendance_logs
  ALTER COLUMN student_id DROP NOT NULL;

-- 3. Create checkin_attendee RPC function
-- Called by the frontend when scanning a guest's QR code
CREATE OR REPLACE FUNCTION checkin_attendee(
  p_student_id UUID DEFAULT NULL,
  p_event_id UUID DEFAULT NULL,
  p_guest_name TEXT DEFAULT NULL,
  p_hall_number TEXT DEFAULT 'Main Venue'
)
RETURNS JSON AS $$
DECLARE
  v_existing_count INT;
  v_log_id UUID;
BEGIN
  -- Check for duplicate check-in (same student + event, or same guest name + event)
  IF p_student_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_existing_count
    FROM public.attendance_logs
    WHERE student_id = p_student_id AND event_id = p_event_id;

    IF v_existing_count > 0 THEN
      RETURN json_build_object('success', false, 'message', 'Duplicate: Already checked in.');
    END IF;
  ELSIF p_guest_name IS NOT NULL THEN
    SELECT COUNT(*) INTO v_existing_count
    FROM public.attendance_logs
    WHERE guest_name = p_guest_name AND event_id = p_event_id AND is_guest = TRUE;

    IF v_existing_count > 0 THEN
      RETURN json_build_object('success', false, 'message', 'Duplicate: Guest already registered.');
    END IF;
  END IF;

  -- Insert the check-in record
  INSERT INTO public.attendance_logs (student_id, event_id, hall_number, guest_name, is_guest, status)
  VALUES (
    p_student_id,
    COALESCE(p_event_id, (SELECT id FROM public.events LIMIT 1)),
    p_hall_number,
    p_guest_name,
    (p_guest_name IS NOT NULL),
    'Checked-In'
  )
  RETURNING id INTO v_log_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Check-in recorded successfully!',
    'log_id', v_log_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Enable Realtime for attendance_logs if not already enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'attendance_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_logs;
  END IF;
END $$;

-- 5. RLS policy: Allow admins to insert events with location data
CREATE POLICY IF NOT EXISTS "admin_insert_events"
  ON public.events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 6. RLS policy: Allow authenticated users to insert guest attendance logs
CREATE POLICY IF NOT EXISTS "auth_insert_attendance"
  ON public.attendance_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
