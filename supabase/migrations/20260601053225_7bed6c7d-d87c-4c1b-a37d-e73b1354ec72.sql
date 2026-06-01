-- 1) profiles: drop overly broad public-readable policy and add tight cross-party policy
DROP POLICY IF EXISTS "Public can view verified doctor profile basics" ON public.profiles;

CREATE POLICY "Appointment parties can view each other profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE (a.doctor_id = auth.uid() AND a.patient_id = profiles.id)
       OR (a.patient_id = auth.uid() AND a.doctor_id = profiles.id)
  )
);

-- 2) platform_settings: impersonators get read-only; only true admins write
DROP POLICY IF EXISTS "Admins manage platform settings" ON public.platform_settings;

CREATE POLICY "Admins manage platform settings"
ON public.platform_settings
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Impersonators can view platform settings"
ON public.platform_settings
FOR SELECT
TO authenticated
USING (can_impersonate(auth.uid()));