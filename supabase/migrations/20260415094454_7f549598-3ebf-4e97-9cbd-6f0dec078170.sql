-- Drop the old policy and recreate with awaiting_payment included
DROP POLICY IF EXISTS "Patients can cancel own appointments" ON public.appointments;

CREATE POLICY "Patients can cancel own appointments"
ON public.appointments
FOR UPDATE
USING (
  patient_id = auth.uid()
  AND status IN ('pending', 'confirmed', 'awaiting_payment')
);