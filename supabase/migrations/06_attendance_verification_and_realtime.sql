-- Migration: 06_attendance_verification_and_realtime.sql
-- Adds attended, attended_at, scanned_by columns to registrations table
-- Enables Realtime on registrations
-- Creates verify_and_checkin_registration atomic RPC function

-- 1. Add attended status columns to registrations table
ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS attended BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS attended_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS scanned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS email_status TEXT DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pass_token TEXT DEFAULT NULL;

-- 2. Enable Realtime publication for public.registrations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'registrations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.registrations;
  END IF;
END $$;

-- 3. Atomic QR Pass Verification and Check-in RPC Function
CREATE OR REPLACE FUNCTION public.verify_and_checkin_registration(
  p_registration_id UUID DEFAULT NULL,
  p_student_id UUID DEFAULT NULL,
  p_event_id UUID DEFAULT NULL,
  p_coordinator_id UUID DEFAULT NULL,
  p_hall_number TEXT DEFAULT 'Main Venue'
)
RETURNS JSON AS $$
DECLARE
  v_reg RECORD;
  v_student RECORD;
  v_event RECORD;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- 1. Locate registration record
  IF p_registration_id IS NOT NULL THEN
    SELECT * INTO v_reg FROM public.registrations WHERE id = p_registration_id;
  ELSIF p_student_id IS NOT NULL AND p_event_id IS NOT NULL THEN
    SELECT * INTO v_reg FROM public.registrations WHERE student_id = p_student_id AND event_id = p_event_id;
  ELSIF p_student_id IS NOT NULL THEN
    SELECT * INTO v_reg FROM public.registrations WHERE student_id = p_student_id ORDER BY registered_at DESC LIMIT 1;
  ELSE
    RETURN json_build_object(
      'success', false,
      'status', 'INVALID_PAYLOAD',
      'message', '❌ Invalid QR Code! No registration found.'
    );
  END IF;

  -- 2. If no registration found
  IF v_reg.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'status', 'NOT_REGISTERED',
      'message', '❌ Invalid QR Code! No registration found.'
    );
  END IF;

  -- 3. Fetch Student profile & Event details
  SELECT id, COALESCE(full_name, name, 'Attendee') AS name, email, college_id, COALESCE(college_name, college, 'Main Campus') AS college_name, phone
  INTO v_student
  FROM public.profiles WHERE id = v_reg.student_id;

  SELECT id, title, category, hall_number
  INTO v_event
  FROM public.events WHERE id = v_reg.event_id;

  -- 4. Check if already checked in / attended
  IF v_reg.attended = TRUE THEN
    RETURN json_build_object(
      'success', false,
      'status', 'ALREADY_CHECKED_IN',
      'is_duplicate', true,
      'message', '⚠️ Already Checked-In at ' || to_char(COALESCE(v_reg.attended_at, v_now), 'YYYY-MM-DD HH24:MI:SS'),
      'attended_at', v_reg.attended_at,
      'registration_id', v_reg.id,
      'student', json_build_object(
        'id', v_reg.student_id,
        'name', COALESCE(v_student.name, 'Student Attendee'),
        'college', COALESCE(v_student.college_name, 'Main College'),
        'college_id', COALESCE(v_student.college_id, 'N/A'),
        'email', v_student.email
      ),
      'event', json_build_object(
        'id', v_reg.event_id,
        'title', COALESCE(v_event.title, 'Symposium Event'),
        'hall_number', COALESCE(p_hall_number, v_event.hall_number, 'Main Venue')
      )
    );
  END IF;

  -- 5. Mark registration as attended
  UPDATE public.registrations
  SET
    attended = TRUE,
    attended_at = v_now,
    scanned_by = p_coordinator_id
  WHERE id = v_reg.id;

  -- 6. Insert attendance log
  INSERT INTO public.attendance_logs (student_id, event_id, hall_number, check_in_time, status)
  VALUES (
    v_reg.student_id,
    v_reg.event_id,
    COALESCE(p_hall_number, v_event.hall_number, 'Main Venue'),
    v_now,
    'Checked-In'
  );

  -- 7. Return verified response
  RETURN json_build_object(
    'success', true,
    'status', 'VERIFIED',
    'message', '✓ Attendance Verified Successfully',
    'attended_at', v_now,
    'registration_id', v_reg.id,
    'student', json_build_object(
      'id', v_reg.student_id,
      'name', COALESCE(v_student.name, 'Student Attendee'),
      'college', COALESCE(v_student.college_name, 'Main College'),
      'college_id', COALESCE(v_student.college_id, 'N/A'),
      'email', v_student.email
    ),
    'event', json_build_object(
      'id', v_reg.event_id,
      'title', COALESCE(v_event.title, 'Symposium Event'),
      'hall_number', COALESCE(p_hall_number, v_event.hall_number, 'Main Venue'),
      'category', v_event.category
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Ensure RLS policies for registrations
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Registrations select policy" ON public.registrations;
CREATE POLICY "Registrations select policy"
  ON public.registrations FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Registrations insert policy" ON public.registrations;
CREATE POLICY "Registrations insert policy"
  ON public.registrations FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Registrations update policy" ON public.registrations;
CREATE POLICY "Registrations update policy"
  ON public.registrations FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
