
-- 1) doctor_medical_aids: replace overly broad authenticated SELECT
DROP POLICY IF EXISTS "Authenticated can view active medical aids" ON public.doctor_medical_aids;

CREATE POLICY "Related users view active medical aids"
ON public.doctor_medical_aids
FOR SELECT
TO authenticated
USING (
  is_active = true
  AND (
    doctor_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.doctor_id = doctor_medical_aids.doctor_id
        AND a.patient_id = auth.uid()
        AND a.status IN ('pending','confirmed','completed','awaiting_payment')
        AND a.scheduled_at >= now() - interval '90 days'
    )
  )
);

-- 2) profiles: restrict appointment-party cross-access to recent confirmed/completed
DROP POLICY IF EXISTS "Appointment parties can view each other profiles" ON public.profiles;

CREATE POLICY "Appointment parties can view each other profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE (
            (a.doctor_id = auth.uid() AND a.patient_id = profiles.id)
         OR (a.patient_id = auth.uid() AND a.doctor_id = profiles.id)
          )
      AND a.status IN ('confirmed','completed')
      AND a.scheduled_at >= now() - interval '90 days'
  )
);
