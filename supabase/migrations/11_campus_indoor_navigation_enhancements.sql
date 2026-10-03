-- =============================================================
-- 11: Campus Indoor Navigation Enhancements
-- Adds office, toilet, exit location types, room_number,
-- department, description to campus_locations,
-- and background_image to campus_floors.
-- =============================================================

ALTER TABLE public.campus_locations DROP CONSTRAINT IF EXISTS campus_locations_location_type_check;
ALTER TABLE public.campus_locations ADD CONSTRAINT campus_locations_location_type_check 
  CHECK (location_type IN (
    'classroom', 'laboratory', 'office', 'department', 'seminar_hall', 
    'toilet', 'restroom', 'entrance', 'exit', 'corridor', 'stairs', 'lift', 'other'
  ));

ALTER TABLE public.campus_locations ADD COLUMN IF NOT EXISTS room_number TEXT;
ALTER TABLE public.campus_locations ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE public.campus_locations ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE public.campus_floors ADD COLUMN IF NOT EXISTS background_image TEXT;
