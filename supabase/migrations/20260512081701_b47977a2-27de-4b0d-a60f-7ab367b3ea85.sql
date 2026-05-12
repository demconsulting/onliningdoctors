
-- 1. platform_fee_settings: restrict to admins + doctors only
DROP POLICY IF EXISTS "Authenticated can view active fee settings" ON public.platform_fee_settings;

CREATE POLICY "Admins and doctors can view active fee settings"
ON public.platform_fee_settings
FOR SELECT
TO authenticated
USING (
  is_active = true
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'doctor'::app_role)
  )
);

-- 2. doctor_blocked_times: tighten reads. Drop any broad authenticated SELECT, keep owner/admin only.
-- Public slot picker uses get_doctor_blocked_slots() RPC which omits 'reason'.
DROP POLICY IF EXISTS "Authenticated can view blocked times" ON public.doctor_blocked_times;
DROP POLICY IF EXISTS "Anyone can view blocked times" ON public.doctor_blocked_times;
DROP POLICY IF EXISTS "Public can view blocked times" ON public.doctor_blocked_times;

-- 3. Avatars bucket: explicit public SELECT policy (bucket is intentionally public for doctor photos)
DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;
CREATE POLICY "Public can view avatars"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- 4. reviews UPDATE: add WITH CHECK to prevent reassigning doctor_id / appointment_id / patient_id
DROP POLICY IF EXISTS "Patients can update own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Patients can update their own reviews" ON public.reviews;

CREATE POLICY "Patients can update own reviews"
ON public.reviews
FOR UPDATE
TO authenticated
USING (patient_id = auth.uid())
WITH CHECK (
  patient_id = auth.uid()
  AND doctor_id = (
    SELECT a.doctor_id FROM public.appointments a
    WHERE a.id = appointment_id AND a.patient_id = auth.uid()
  )
);
