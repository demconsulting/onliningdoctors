
DROP POLICY IF EXISTS "Public resolves any code" ON public.referral_codes;

CREATE POLICY "Users view their own handoffs"
ON public.ai_handoffs FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.ai_conversations c
  WHERE c.id = ai_handoffs.conversation_id AND c.user_id = auth.uid()
));

DROP VIEW IF EXISTS public.public_doctors;
CREATE VIEW public.public_doctors AS
SELECT d.id, d.profile_id, d.specialty_id, d.title, d.bio,
       d.experience_years, d.consultation_fee, d.rating, d.total_reviews,
       d.is_available, d.languages, d.education, d.hospital_affiliation,
       d.is_verified, d.practice_name, d.practice_logo_url,
       d.consultation_category_id,
       p.full_name, p.avatar_url, p.city, p.country
FROM public.doctors d
LEFT JOIN public.profiles p ON p.id = d.profile_id
WHERE d.is_verified = true AND d.is_suspended = false;

GRANT SELECT ON public.public_doctors TO anon, authenticated;
