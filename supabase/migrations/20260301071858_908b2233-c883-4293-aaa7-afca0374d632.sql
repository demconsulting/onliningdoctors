
-- Allow admins to update any doctor record (for verification)
CREATE POLICY "Admins can update doctors"
ON public.doctors
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to view all profiles (needed for admin user management)
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));
