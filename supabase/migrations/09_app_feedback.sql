-- agent-notes: { ctx: "App feedback table allowing students to submit application feedback to administrators", deps: [], state: "active", last: "antigravity@2026-09-30" }

CREATE TABLE IF NOT EXISTS public.app_feedback (
    id TEXT PRIMARY KEY,
    student_id TEXT,
    student_name TEXT NOT NULL,
    student_email TEXT NOT NULL,
    roll_no TEXT,
    college TEXT,
    department TEXT,
    category TEXT DEFAULT 'general',
    rating INTEGER DEFAULT 5,
    title TEXT,
    message TEXT NOT NULL,
    priority TEXT DEFAULT 'normal',
    status TEXT DEFAULT 'new',
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.app_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all users to submit feedback" ON public.app_feedback;
CREATE POLICY "Allow all users to submit feedback"
ON public.app_feedback
FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow read feedback" ON public.app_feedback;
CREATE POLICY "Allow read feedback"
ON public.app_feedback
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Allow update feedback" ON public.app_feedback;
CREATE POLICY "Allow update feedback"
ON public.app_feedback
FOR UPDATE
USING (true);

DROP POLICY IF EXISTS "Allow delete feedback" ON public.app_feedback;
CREATE POLICY "Allow delete feedback"
ON public.app_feedback
FOR DELETE
USING (true);
