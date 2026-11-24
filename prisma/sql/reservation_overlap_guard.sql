-- Apply with: npx prisma db execute --file prisma/sql/reservation_overlap_guard.sql
-- The default matches availability/config.js today. Keep both settings aligned
-- until the application reads this setting as well.
CREATE TABLE IF NOT EXISTS reservation_settings (
  id smallint PRIMARY KEY CHECK (id = 1),
  buffer_minutes integer NOT NULL CHECK (buffer_minutes >= 0)
);

INSERT INTO reservation_settings (id, buffer_minutes)
VALUES (1, 0)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION prevent_reservation_overlap()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_buffer integer;
BEGIN
  IF NEW.status NOT IN ('PENDING_PAYMENT', 'CONFIRMED') THEN
    RETURN NEW;
  END IF;

  -- Serialize writes per room, including the empty-result case.
  PERFORM 1 FROM rooms WHERE id = NEW.room_id FOR UPDATE;

  SELECT buffer_minutes INTO v_buffer
  FROM reservation_settings WHERE id = 1;
  v_buffer := COALESCE(v_buffer, 0);

  IF EXISTS (
    SELECT 1
    FROM reservations r
    WHERE r.room_id = NEW.room_id
      AND r.status IN ('PENDING_PAYMENT', 'CONFIRMED')
      AND r.id IS DISTINCT FROM NEW.id
      AND r.start_at < NEW.end_at + make_interval(mins => v_buffer)
      AND r.end_at + make_interval(mins => v_buffer) > NEW.start_at
  ) THEN
    RAISE EXCEPTION 'This room is already booked for the selected time slot.'
      USING ERRCODE = '23P01', CONSTRAINT = 'reservations_no_buffered_overlap';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reservations_overlap_guard ON reservations;
CREATE TRIGGER reservations_overlap_guard
BEFORE INSERT OR UPDATE OF room_id, start_at, end_at, status ON reservations
FOR EACH ROW EXECUTE FUNCTION prevent_reservation_overlap();
