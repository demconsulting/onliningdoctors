
-- 1) doctor_blocked_times: remove public read, expose safe view
DROP POLICY IF EXISTS "Anyone can view blocked times" ON public.doctor_blocked_times;

CREATE POLICY "Authenticated users can view blocked times (slot picking)"
ON public.doctor_blocked_times
FOR SELECT
TO authenticated
USING (true);

CREATE OR REPLACE VIEW public.doctor_blocked_times_public
WITH (security_invoker = false) AS
SELECT id, doctor_id, start_time, end_time, block_type
FROM public.doctor_blocked_times;

GRANT SELECT ON public.doctor_blocked_times_public TO anon, authenticated;

-- 2) patient_medical_info: bound doctor access to recent/active appointments
DROP POLICY IF EXISTS "Doctors can view medical info for their active patients" ON public.patient_medical_info;

CREATE POLICY "Doctors can view medical info for current patients"
ON public.patient_medical_info
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.patient_id = patient_medical_info.patient_id
      AND a.doctor_id = auth.uid()
      AND (
        (a.status = 'confirmed' AND a.scheduled_at >= now() - interval '1 day')
        OR (a.status = 'completed' AND a.scheduled_at >= now() - interval '90 days')
      )
  )
);

-- 3) reviews: remove anon access to patient_id, expose safe view
DROP POLICY IF EXISTS "Anyone can view approved visible reviews" ON public.reviews;

CREATE POLICY "Authenticated can view approved visible reviews"
ON public.reviews
FOR SELECT
TO authenticated
USING (is_visible = true AND moderation_status = 'approved');

CREATE OR REPLACE VIEW public.public_reviews
WITH (security_invoker = false) AS
SELECT id, doctor_id, appointment_id, rating, comment,
       doctor_clear_helpful, doctor_professional, would_recommend,
       created_at
FROM public.reviews
WHERE is_visible = true AND moderation_status = 'approved';

GRANT SELECT ON public.public_reviews TO anon, authenticated;
