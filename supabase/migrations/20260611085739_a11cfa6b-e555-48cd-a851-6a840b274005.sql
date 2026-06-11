ALTER VIEW public.public_doctors SET (security_invoker = true);

CREATE POLICY "Doctors can view reviews about themselves"
ON public.reviews
FOR SELECT
TO authenticated
USING (doctor_id = auth.uid());