
-- Revert view to security_invoker so it does not trip the SECURITY DEFINER VIEW linter
ALTER VIEW public.public_doctors SET (security_invoker = true);

-- Re-allow anon to read verified doctors via the view, but restrict columns at the table grant level
CREATE POLICY "Anon can view verified doctors (safe cols)"
  ON public.doctors
  FOR SELECT
  TO anon
  USING (is_verified = true AND is_suspended = false);

-- Revoke broad SELECT from anon, then grant only safe columns
REVOKE SELECT ON public.doctors FROM anon;
GRANT SELECT (
  id, profile_id, specialty_id, title, bio, experience_years,
  consultation_fee, rating, total_reviews, is_available, is_verified,
  is_suspended, languages, education, hospital_affiliation,
  practice_name, practice_logo_url, consultation_category_id,
  created_at, updated_at
) ON public.doctors TO anon;
