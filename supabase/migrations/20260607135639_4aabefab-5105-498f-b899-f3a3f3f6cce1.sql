
-- 1) DOCTORS: remove broad SELECT exposure of sensitive fields
DROP POLICY IF EXISTS "Anon can view verified doctors (safe cols)" ON public.doctors;
DROP POLICY IF EXISTS "Authenticated can view verified doctors" ON public.doctors;

-- 2) PROFILES: remove anon read of full doctor PII
DROP POLICY IF EXISTS "Anon can view verified doctor profiles" ON public.profiles;

-- 3) Ensure the safe public_doctors view is reachable by the client
GRANT SELECT ON public.public_doctors TO anon, authenticated;

-- 4) REVIEWS: allow public to read approved, visible reviews
DROP POLICY IF EXISTS "Public can view approved reviews" ON public.reviews;
CREATE POLICY "Public can view approved reviews"
  ON public.reviews
  FOR SELECT
  TO anon, authenticated
  USING (is_visible = true AND moderation_status = 'approved');

-- 5) FOUNDING DOCTOR PROGRAM: allow authenticated users to read config
DROP POLICY IF EXISTS "Authenticated can view founding program" ON public.founding_doctor_program;
CREATE POLICY "Authenticated can view founding program"
  ON public.founding_doctor_program
  FOR SELECT
  TO authenticated
  USING (true);

GRANT SELECT ON public.founding_doctor_program TO authenticated;

-- 6) EXPENSE CATEGORIES: allow authenticated users to read categories
DROP POLICY IF EXISTS "Authenticated can view expense categories" ON public.expense_categories;
CREATE POLICY "Authenticated can view expense categories"
  ON public.expense_categories
  FOR SELECT
  TO authenticated
  USING (true);

GRANT SELECT ON public.expense_categories TO authenticated;
