
-- Prescriptions table
CREATE TABLE public.prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL REFERENCES public.profiles(id),
  patient_id uuid NOT NULL REFERENCES public.profiles(id),
  diagnosis text,
  medications jsonb NOT NULL DEFAULT '[]'::jsonb,
  pharmacy_notes text,
  refill_count integer DEFAULT 0,
  follow_up_date date,
  warnings text,
  allergies_noted text,
  doctor_logo_url text,
  doctor_signature_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;

-- Doctors can insert prescriptions for their appointments
CREATE POLICY "Doctors can create prescriptions"
ON public.prescriptions FOR INSERT TO authenticated
WITH CHECK (
  doctor_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM appointments a
    WHERE a.id = prescriptions.appointment_id
    AND a.doctor_id = auth.uid()
    AND a.status IN ('confirmed', 'completed')
  )
);

-- Doctors can update own prescriptions
CREATE POLICY "Doctors can update own prescriptions"
ON public.prescriptions FOR UPDATE TO authenticated
USING (doctor_id = auth.uid());

-- Doctors can view own prescriptions
CREATE POLICY "Doctors can view own prescriptions"
ON public.prescriptions FOR SELECT TO authenticated
USING (doctor_id = auth.uid());

-- Patients can view prescriptions for their appointments
CREATE POLICY "Patients can view own prescriptions"
ON public.prescriptions FOR SELECT TO authenticated
USING (patient_id = auth.uid());

-- Admins can view all
CREATE POLICY "Admins can view all prescriptions"
ON public.prescriptions FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Updated at trigger
CREATE TRIGGER update_prescriptions_updated_at
  BEFORE UPDATE ON public.prescriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
