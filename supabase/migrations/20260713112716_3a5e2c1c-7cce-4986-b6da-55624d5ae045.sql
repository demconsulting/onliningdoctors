
-- ============================================================
-- Slot reservations: prevents two patients booking the same slot
-- during the ~5-minute checkout window.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.slot_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 minutes'),
  released_at timestamptz,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_slot_reservations_doctor_active
  ON public.slot_reservations (doctor_id, start_at)
  WHERE released_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_slot_reservations_patient
  ON public.slot_reservations (patient_id)
  WHERE released_at IS NULL;

GRANT SELECT, INSERT, UPDATE ON public.slot_reservations TO authenticated;
GRANT ALL ON public.slot_reservations TO service_role;

ALTER TABLE public.slot_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients read their own reservations"
  ON public.slot_reservations FOR SELECT
  TO authenticated
  USING (patient_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Patients release their own reservations"
  ON public.slot_reservations FOR UPDATE
  TO authenticated
  USING (patient_id = auth.uid())
  WITH CHECK (patient_id = auth.uid());

-- Note: INSERT is done exclusively via the reserve_slot RPC (SECURITY DEFINER),
-- so no INSERT policy is exposed to clients.
CREATE POLICY "Block direct inserts"
  ON public.slot_reservations FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- ------------------------------------------------------------
-- Atomic slot reservation
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reserve_appointment_slot(
  _doctor_id uuid,
  _start timestamptz,
  _end timestamptz
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_id  uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;
  IF _start IS NULL OR _end IS NULL OR _end <= _start THEN
    RAISE EXCEPTION 'Invalid slot range';
  END IF;
  IF _start < now() THEN
    RAISE EXCEPTION 'Cannot reserve a slot in the past';
  END IF;

  -- Sweep expired reservations first
  UPDATE public.slot_reservations
     SET released_at = now()
   WHERE released_at IS NULL
     AND expires_at < now();

  -- Existing appointment / blocked-time conflict?
  IF public.check_appointment_conflict(_doctor_id, _start, _end) THEN
    RAISE EXCEPTION 'Slot no longer available' USING ERRCODE = '40001';
  END IF;

  -- Live reservation conflict?
  IF EXISTS (
    SELECT 1 FROM public.slot_reservations r
     WHERE r.doctor_id = _doctor_id
       AND r.released_at IS NULL
       AND r.expires_at > now()
       AND tstzrange(r.start_at, r.end_at, '[)') && tstzrange(_start, _end, '[)')
  ) THEN
    RAISE EXCEPTION 'Slot is being booked by another patient' USING ERRCODE = '40001';
  END IF;

  -- Release any prior active reservations by this patient (single in-flight booking)
  UPDATE public.slot_reservations
     SET released_at = now()
   WHERE patient_id = v_uid AND released_at IS NULL;

  INSERT INTO public.slot_reservations (doctor_id, patient_id, start_at, end_at)
  VALUES (_doctor_id, v_uid, _start, _end)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reserve_appointment_slot(uuid, timestamptz, timestamptz) TO authenticated;

-- ------------------------------------------------------------
-- Release reservation (called on cancel / drawer close)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.release_appointment_slot(_reservation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.slot_reservations
     SET released_at = now()
   WHERE id = _reservation_id
     AND (patient_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
     AND released_at IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.release_appointment_slot(uuid) TO authenticated;

-- ------------------------------------------------------------
-- Extend the existing conflict check to also honour active reservations
-- so booking inserts, availability queries and calendar all agree.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_appointment_conflict(
  _doctor_id uuid,
  _start timestamptz,
  _end timestamptz,
  _exclude_appt_id uuid DEFAULT NULL
) RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.doctor_id = _doctor_id
      AND a.status IN ('pending','confirmed','awaiting_payment')
      AND (_exclude_appt_id IS NULL OR a.id <> _exclude_appt_id)
      AND tstzrange(a.scheduled_at, COALESCE(a.end_time, a.scheduled_at + (COALESCE(a.duration_minutes,30) || ' minutes')::interval), '[)')
        && tstzrange(_start, _end, '[)')
  ) OR EXISTS (
    SELECT 1 FROM public.doctor_blocked_times b
    WHERE b.doctor_id = _doctor_id
      AND tstzrange(b.start_time, b.end_time, '[)') && tstzrange(_start, _end, '[)')
  ) OR EXISTS (
    SELECT 1 FROM public.slot_reservations r
    WHERE r.doctor_id = _doctor_id
      AND r.released_at IS NULL
      AND r.expires_at > now()
      AND r.patient_id <> COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
      AND tstzrange(r.start_at, r.end_at, '[)') && tstzrange(_start, _end, '[)')
  );
$$;
