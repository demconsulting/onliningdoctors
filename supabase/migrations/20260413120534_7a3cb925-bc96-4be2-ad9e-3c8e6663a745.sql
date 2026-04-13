
-- Allow doctors to manage their own availability
CREATE POLICY "Doctors can insert their own availability"
ON public.doctor_availability
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Doctors can delete their own availability"
ON public.doctor_availability
FOR DELETE
TO authenticated
USING (auth.uid() = doctor_id);
