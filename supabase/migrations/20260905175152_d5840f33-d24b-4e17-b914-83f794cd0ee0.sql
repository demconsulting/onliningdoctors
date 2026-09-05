ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suburb TEXT;

DROP VIEW IF EXISTS public.public_doctors;

CREATE VIEW public.public_doctors AS
SELECT
    d.id,
    d.profile_id,
    d.specialty_id,
    d.title,
    d.bio,
    d.experience_years,
    d.consultation_fee,
    d.rating,
    d.total_reviews,
    d.is_available,
    d.languages,
    d.education,
    d.hospital_affiliation,
    d.is_verified,
    d.practice_name,
    d.practice_logo_url,
    d.consultation_category_id,
    p.full_name,
    p.avatar_url,
    p.city,
    p.suburb,
    p.country
FROM public.doctors d
LEFT JOIN public.profiles p ON p.id = d.profile_id
WHERE d.is_verified = true AND d.is_suspended = false;

COMMENT ON COLUMN public.profiles.suburb IS 'Suburb or local area used for location-based doctor search';