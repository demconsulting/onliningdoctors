-- Grant anon access to public doctors view
GRANT SELECT ON public.public_doctors TO anon, authenticated;

-- Allow anonymous users to read profile rows that belong to verified, non-suspended doctors.
-- This is required so the public_doctors view (security_invoker) can return full_name/avatar_url
-- to logged-out visitors browsing the Find Doctors page.
CREATE POLICY "Anon can view verified doctor profiles"
ON public.profiles
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.doctors d
    WHERE d.profile_id = profiles.id
      AND d.is_verified = true
      AND d.is_suspended = false
  )
);