DROP POLICY IF EXISTS "Anyone can view active medical aids" ON public.doctor_medical_aids;
CREATE POLICY "Authenticated can view active medical aids"
ON public.doctor_medical_aids
FOR SELECT
TO authenticated
USING (is_active = true);