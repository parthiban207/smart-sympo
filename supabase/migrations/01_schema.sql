-- 1. PROFILES TABLE (Extends Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  role TEXT CHECK (role IN ('student', 'coordinator', 'admin')) DEFAULT 'student',
  college_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT CHECK (category IN ('Technical', 'Non-Technical')) NOT NULL,
  hall_number TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  max_capacity INT DEFAULT 100,
  status TEXT CHECK (status IN ('Scheduled', 'In Progress', 'Delayed', 'Completed')) DEFAULT 'Scheduled',
  delay_minutes INT DEFAULT 0
);

-- 3. REGISTRATIONS TABLE
CREATE TABLE IF NOT EXISTS public.registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, event_id)
);

-- 4. ATTENDANCE LOGS TABLE
CREATE TABLE IF NOT EXISTS public.attendance_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  hall_number TEXT NOT NULL,
  check_in_time TIMESTAMPTZ DEFAULT NOW(),
  status TEXT CHECK (status IN ('Checked-In', 'Checked-Out')) DEFAULT 'Checked-In'
);

-- Enable Realtime publication on public.events
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;

-- 5. ATOMIC CLASH-DETECTION REGISTRATION FUNCTION
CREATE OR REPLACE FUNCTION register_for_event(p_student_id UUID, p_event_id UUID)
RETURNS JSON AS $$
DECLARE
  v_new_start TIMESTAMPTZ;
  v_new_end TIMESTAMPTZ;
  v_conflict_count INT;
BEGIN
  SELECT start_time, end_time INTO v_new_start, v_new_end 
  FROM public.events WHERE id = p_event_id;

  SELECT COUNT(*) INTO v_conflict_count
  FROM public.registrations r
  JOIN public.events e ON r.event_id = e.id
  WHERE r.student_id = p_student_id
    AND (v_new_start, v_new_end) OVERLAPS (e.start_time, e.end_time);

  IF v_conflict_count > 0 THEN
    RAISE EXCEPTION 'Schedule Conflict: You are already registered for another event during this time slot.';
  END IF;

  INSERT INTO public.registrations (student_id, event_id) 
  VALUES (p_student_id, p_event_id);
    
  RETURN json_build_object('success', true, 'message', 'Registered successfully!');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
