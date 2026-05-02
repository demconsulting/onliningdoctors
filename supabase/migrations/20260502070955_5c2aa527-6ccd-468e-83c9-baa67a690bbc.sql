
-- 1. SITE CONTENT: drop the overly-broad authenticated SELECT policy
DROP POLICY IF EXISTS "Authenticated can view all site content" ON public.site_content;
-- The remaining policies already cover access:
--   * "Public can view non-sensitive site content" -> excludes paystack_config for everyone non-admin
--   * "Admins can manage site content" -> admins retain full access

-- 2. DOCTORS: restrict the public policy to a safe subset via column grants.
-- The "Public can view verified doctors" policy returns whole rows, but we
-- restrict what columns the anon role can actually read using GRANTs.
REVOKE SELECT ON public.doctors FROM anon;
GRANT SELECT (
  id, profile_id, specialty_id, consultation_category_id,
  title, bio, experience_years, consultation_fee, rating, total_reviews,
  is_available, is_verified, is_suspended, languages, education,
  hospital_affiliation, practice_name, practice_logo_url,
  created_at, updated_at
) ON public.doctors TO anon;

-- Authenticated users (doctors viewing self, patients booking) still need
-- broader column access; their RLS policies gate row visibility appropriately.
GRANT SELECT ON public.doctors TO authenticated;

-- 3. REVIEWS: restrict anonymous column access so patient_id is not exposed
REVOKE SELECT ON public.reviews FROM anon;
GRANT SELECT (
  id, doctor_id, appointment_id, rating, comment,
  is_visible, moderation_status, doctor_clear_helpful,
  doctor_professional, would_recommend, created_at, updated_at
) ON public.reviews TO anon;
GRANT SELECT ON public.reviews TO authenticated;

-- 4. PRESCRIPTION-ASSETS storage bucket: add explicit UPDATE policy for doctors
DROP POLICY IF EXISTS "Doctors can update own prescription assets" ON storage.objects;
CREATE POLICY "Doctors can update own prescription assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'prescription-assets'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'prescription-assets'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
