
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Anyone can view doctor availability" ON public.doctor_availability;
DROP POLICY IF EXISTS "Doctors can manage own availability" ON public.doctor_availability;

-- Recreate as PERMISSIVE policies
CREATE POLICY "Anyone can view doctor availability"
ON public.doctor_availability
FOR SELECT
TO public
USING (true);

CREATE POLICY "Doctors can manage own availability"
ON public.doctor_availability
FOR ALL
TO authenticated
USING (doctor_id = auth.uid())
WITH CHECK (doctor_id = auth.uid());
