DROP POLICY IF EXISTS "Authenticated can view doctor profile basics" ON public.profiles;

CREATE POLICY "Public can view verified doctor profile basics"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.doctors
    WHERE doctors.profile_id = profiles.id
      AND doctors.is_verified = true
      AND doctors.is_suspended = false
  )
);