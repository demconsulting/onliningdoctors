
-- 1. Is doctor available right now?
CREATE OR REPLACE FUNCTION public.is_doctor_available_now(_doctor uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH d AS (
    SELECT is_verified, is_suspended, is_available
    FROM public.doctors WHERE profile_id = _doctor
  )
  SELECT
    COALESCE((SELECT is_verified FROM d), false)
    AND NOT COALESCE((SELECT is_suspended FROM d), false)
    AND COALESCE((SELECT is_available FROM d), false)
    AND EXISTS (
      SELECT 1 FROM public.doctor_availability a
      WHERE a.doctor_id = _doctor
        AND a.is_available = true
        AND a.day_of_week = EXTRACT(DOW FROM (now() AT TIME ZONE 'UTC'))::int
        AND (now() AT TIME ZONE 'UTC')::time >= a.start_time
        AND (now() AT TIME ZONE 'UTC')::time <  a.end_time
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.doctor_blocked_times b
      WHERE b.doctor_id = _doctor
        AND now() >= b.start_time AND now() < b.end_time
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.appointments ap
      WHERE ap.doctor_id = _doctor
        AND ap.status IN ('pending','confirmed','awaiting_payment')
        AND now() >= ap.scheduled_at
        AND now() <  COALESCE(ap.end_time, ap.scheduled_at + (COALESCE(ap.duration_minutes,30)||' minutes')::interval)
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_doctor_available_now(uuid) TO anon, authenticated;

-- 2. Next available slot
CREATE OR REPLACE FUNCTION public.get_doctor_next_available_slot(_doctor uuid)
RETURNS timestamptz
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_verified boolean; v_suspended boolean;
  v_slot timestamptz;
  v_day_offset int;
  v_avail record;
  v_candidate timestamptz;
  v_slot_minutes int;
  v_end timestamptz;
BEGIN
  SELECT is_verified, is_suspended INTO v_verified, v_suspended
  FROM public.doctors WHERE profile_id = _doctor;
  IF NOT COALESCE(v_verified,false) OR COALESCE(v_suspended,false) THEN
    RETURN NULL;
  END IF;

  FOR v_day_offset IN 0..14 LOOP
    FOR v_avail IN
      SELECT start_time, end_time, COALESCE(slot_duration_minutes,30) AS slot_minutes
      FROM public.doctor_availability
      WHERE doctor_id = _doctor
        AND is_available = true
        AND day_of_week = EXTRACT(DOW FROM (now() AT TIME ZONE 'UTC')::date + v_day_offset)::int
      ORDER BY start_time
    LOOP
      v_slot_minutes := v_avail.slot_minutes;
      v_candidate := (((now() AT TIME ZONE 'UTC')::date + v_day_offset) + v_avail.start_time) AT TIME ZONE 'UTC';
      v_end       := (((now() AT TIME ZONE 'UTC')::date + v_day_offset) + v_avail.end_time)   AT TIME ZONE 'UTC';

      WHILE v_candidate + (v_slot_minutes||' minutes')::interval <= v_end LOOP
        IF v_candidate > now()
           AND NOT EXISTS (
             SELECT 1 FROM public.doctor_blocked_times b
             WHERE b.doctor_id = _doctor
               AND tstzrange(b.start_time, b.end_time, '[)')
                && tstzrange(v_candidate, v_candidate + (v_slot_minutes||' minutes')::interval, '[)')
           )
           AND NOT EXISTS (
             SELECT 1 FROM public.appointments ap
             WHERE ap.doctor_id = _doctor
               AND ap.status IN ('pending','confirmed','awaiting_payment')
               AND tstzrange(ap.scheduled_at,
                             COALESCE(ap.end_time, ap.scheduled_at + (COALESCE(ap.duration_minutes,30)||' minutes')::interval),
                             '[)')
                && tstzrange(v_candidate, v_candidate + (v_slot_minutes||' minutes')::interval, '[)')
           )
        THEN
          RETURN v_candidate;
        END IF;
        v_candidate := v_candidate + (v_slot_minutes||' minutes')::interval;
      END LOOP;
    END LOOP;
  END LOOP;
  RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_doctor_next_available_slot(uuid) TO anon, authenticated;

-- 3. Bulk listing for /doctors page
CREATE OR REPLACE FUNCTION public.list_public_doctor_availability()
RETURNS TABLE(doctor_id uuid, is_available_now boolean, next_available_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d.profile_id,
         public.is_doctor_available_now(d.profile_id),
         public.get_doctor_next_available_slot(d.profile_id)
  FROM public.doctors d
  WHERE d.is_verified = true AND d.is_suspended = false;
$$;

GRANT EXECUTE ON FUNCTION public.list_public_doctor_availability() TO anon, authenticated;
