
-- Drop the overly permissive public policy
DROP POLICY IF EXISTS "Anyone can view doctors" ON public.doctors;

-- Public can only see verified, non-suspended doctors
CREATE POLICY "Public can view verified doctors"
ON public.doctors
FOR SELECT
TO public
USING (is_verified = true AND is_suspended = false);

-- Admins can view all doctors (including unverified)
CREATE POLICY "Admins can view all doctors"
ON public.doctors
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Doctors can view their own record
CREATE POLICY "Doctors can view own record"
ON public.doctors
FOR SELECT
TO authenticated
USING (profile_id = auth.uid());
