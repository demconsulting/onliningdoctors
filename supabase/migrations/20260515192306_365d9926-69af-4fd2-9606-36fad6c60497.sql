
-- 1) doctor_blocked_times: explicitly deny anon by revoking grants
REVOKE SELECT ON public.doctor_blocked_times FROM anon;

-- 2) founding_doctor_program: remove public SELECT policy; expose stats only via RPC
DROP POLICY IF EXISTS "Anyone can view founding program" ON public.founding_doctor_program;
REVOKE SELECT ON public.founding_doctor_program FROM anon;
-- Authenticated users (e.g., admin UI) keep access via existing admin policy.

-- 3) doctors table: limit anon column exposure via the public_doctors view
DROP POLICY IF EXISTS "Public can view verified doctors" ON public.doctors;

-- Authenticated users can still browse verified doctors (booking flow needs this)
CREATE POLICY "Authenticated can view verified doctors"
  ON public.doctors
  FOR SELECT
  TO authenticated
  USING (is_verified = true AND is_suspended = false);

-- Ensure anon cannot SELECT the base table directly
REVOKE SELECT ON public.doctors FROM anon;

-- Make public_doctors view bypass RLS using its owner so anon can still read safe columns
ALTER VIEW public.public_doctors SET (security_invoker = false);
GRANT SELECT ON public.public_doctors TO anon, authenticated;

-- 4) avatars bucket: allow users to delete their own avatar
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
CREATE POLICY "Users can delete own avatar"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );
