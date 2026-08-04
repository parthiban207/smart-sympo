-- Migration 05: Event Capacity Auto-Lock Trigger & Function
-- Prevents over-booking beyond max_capacity / max_seats for an event

CREATE OR REPLACE FUNCTION check_event_capacity_before_registration()
RETURNS TRIGGER AS $$
DECLARE
  v_max_capacity INT;
  v_current_count INT;
BEGIN
  -- Fetch max capacity from events table
  SELECT COALESCE(max_capacity, max_seats, 100) INTO v_max_capacity
  FROM events
  WHERE id = NEW.event_id;

  -- Count existing registrations for target event
  SELECT COUNT(*) INTO v_current_count
  FROM registrations
  WHERE event_id = NEW.event_id;

  -- Abort if capacity reached
  IF v_current_count >= v_max_capacity THEN
    RAISE EXCEPTION 'Registration Failed: Event capacity reached.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if already exists and recreate
DROP TRIGGER IF EXISTS trigger_check_event_capacity ON registrations;

CREATE TRIGGER trigger_check_event_capacity
BEFORE INSERT ON registrations
FOR EACH ROW
EXECUTE FUNCTION check_event_capacity_before_registration();
