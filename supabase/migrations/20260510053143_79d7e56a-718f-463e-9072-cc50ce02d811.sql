
-- 1. Extend appointments table
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS appointment_type text NOT NULL DEFAULT 'online',
  ADD COLUMN IF NOT EXISTS patient_name text,
  ADD COLUMN IF NOT EXISTS patient_phone text,
  ADD COLUMN IF NOT EXISTS patient_email text,
  ADD COLUMN IF NOT EXISTS end_time timestamptz,
  ADD COLUMN IF NOT EXISTS created_by uuid;

-- Allow offline walk-ins without a patient account
ALTER TABLE public.appointments ALTER COLUMN patient_id DROP NOT NULL;

-- Type check
DO $$ BEGIN
  ALTER TABLE public.appointments
    ADD CONSTRAINT appointments_appointment_type_check
    CHECK (appointment_type IN ('online','offline'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- For offline rows we need either a patient_id OR a patient_name
DO $$ BEGIN
  ALTER TABLE public.appointments
    ADD CONSTRAINT appointments_patient_identity_check
    CHECK (
      appointment_type = 'online' AND patient_id IS NOT NULL
      OR appointment_type = 'offline' AND (patient_id IS NOT NULL OR (patient_name IS NOT NULL AND length(trim(patient_name)) > 0))
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_appointments_doctor_scheduled
  ON public.appointments (doctor_id, scheduled_at);

-- 2. doctor_blocked_times
CREATE TABLE IF NOT EXISTS public.doctor_blocked_times (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL,
  practice_id uuid,
  block_type text NOT NULL DEFAULT 'unavailable'
    CHECK (block_type IN ('break','lunch','leave','unavailable','other')),
  reason text,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_blocked_times_doctor_range
  ON public.doctor_blocked_times (doctor_id, start_time, end_time);

ALTER TABLE public.doctor_blocked_times ENABLE ROW LEVEL SECURITY;

-- Public can view blocked times (needed by patient booking UI)
DROP POLICY IF EXISTS "Anyone can view blocked times" ON public.doctor_blocked_times;
CREATE POLICY "Anyone can view blocked times" ON public.doctor_blocked_times
  FOR SELECT TO public USING (true);

-- Doctor manages own blocks
DROP POLICY IF EXISTS "Doctors manage own blocked times" ON public.doctor_blocked_times;
CREATE POLICY "Doctors manage own blocked times" ON public.doctor_blocked_times
  FOR ALL TO authenticated
  USING (doctor_id = auth.uid())
  WITH CHECK (doctor_id = auth.uid());

-- Practice managers + receptionists manage blocks for practice doctors
DROP POLICY IF EXISTS "Practice staff manage blocked times" ON public.doctor_blocked_times;
CREATE POLICY "Practice staff manage blocked times" ON public.doctor_blocked_times
  FOR ALL TO authenticated
  USING (
    practice_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.practice_members pm
      WHERE pm.practice_id = doctor_blocked_times.practice_id
        AND pm.user_id = auth.uid()
        AND pm.status = 'active'
        AND pm.role IN ('owner','practice_admin','receptionist')
    )
  )
  WITH CHECK (
    practice_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.practice_members pm
      WHERE pm.practice_id = doctor_blocked_times.practice_id
        AND pm.user_id = auth.uid()
        AND pm.status = 'active'
        AND pm.role IN ('owner','practice_admin','receptionist')
    )
  );

-- Admin view
DROP POLICY IF EXISTS "Admins view all blocked times" ON public.doctor_blocked_times;
CREATE POLICY "Admins view all blocked times" ON public.doctor_blocked_times
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. Practice staff can manage appointments for their doctors
DROP POLICY IF EXISTS "Practice staff view practice appointments" ON public.appointments;
CREATE POLICY "Practice staff view practice appointments" ON public.appointments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.doctors d
      JOIN public.practice_members pm ON pm.practice_id = d.practice_id
      WHERE d.profile_id = appointments.doctor_id
        AND pm.user_id = auth.uid()
        AND pm.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Practice staff insert practice appointments" ON public.appointments;
CREATE POLICY "Practice staff insert practice appointments" ON public.appointments
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.doctors d
      JOIN public.practice_members pm ON pm.practice_id = d.practice_id
      WHERE d.profile_id = appointments.doctor_id
        AND pm.user_id = auth.uid()
        AND pm.status = 'active'
        AND pm.role IN ('owner','practice_admin','receptionist','doctor')
    )
  );

DROP POLICY IF EXISTS "Practice staff update practice appointments" ON public.appointments;
CREATE POLICY "Practice staff update practice appointments" ON public.appointments
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.doctors d
      JOIN public.practice_members pm ON pm.practice_id = d.practice_id
      WHERE d.profile_id = appointments.doctor_id
        AND pm.user_id = auth.uid()
        AND pm.status = 'active'
        AND pm.role IN ('owner','practice_admin','receptionist','doctor')
    )
  );

-- 4. Conflict check function
CREATE OR REPLACE FUNCTION public.check_appointment_conflict(
  _doctor_id uuid,
  _start timestamptz,
  _end timestamptz,
  _exclude_appt_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
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
  );
$$;
