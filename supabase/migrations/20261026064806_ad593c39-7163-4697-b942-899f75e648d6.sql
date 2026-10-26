DROP FUNCTION public.list_public_doctors();
CREATE FUNCTION public.list_public_doctors()
RETURNS TABLE(id uuid, profile_id uuid, specialty_id uuid, title text, bio text, experience_years integer, consultation_fee numeric, rating numeric, total_reviews integer, is_available boolean, languages text[], education text, hospital_affiliation text, is_verified boolean, practice_name text, practice_logo_url text, consultation_category_id uuid, full_name text, avatar_url text, city text, suburb text, country text, specialty jsonb, consultation_category jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
SELECT d.id,d.profile_id,d.specialty_id,d.title,d.bio,d.experience_years,d.consultation_fee,d.rating,d.total_reviews,d.is_available,d.languages,d.education,d.hospital_affiliation,d.is_verified,d.practice_name,d.practice_logo_url,d.consultation_category_id,p.full_name,p.avatar_url,p.city,p.suburb,p.country,CASE WHEN s.id IS NULL THEN NULL ELSE jsonb_build_object('name',s.name,'icon',s.icon) END,CASE WHEN c.id IS NULL THEN NULL ELSE jsonb_build_object('id',c.id,'name',c.name,'description',c.description,'min_price',c.min_price,'max_price',c.max_price) END
FROM public.doctors d LEFT JOIN public.profiles p ON p.id=d.profile_id LEFT JOIN public.specialties s ON s.id=d.specialty_id LEFT JOIN public.consultation_categories c ON c.id=d.consultation_category_id
WHERE d.is_verified IS TRUE AND d.is_suspended IS FALSE;
$$;
REVOKE ALL ON FUNCTION public.list_public_doctors() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.list_public_doctors() TO anon,authenticated,service_role;
COMMENT ON FUNCTION public.list_public_doctors() IS 'Intentional signed-out directory exception: verified unsuspended doctors and allowlisted public fields only; no banking, contact email, identity documents or patient data.';
COMMENT ON FUNCTION public.list_group_practice_admins(uuid) IS 'Intentional authenticated RPC; explicit platform-admin check before accessing assignment names/emails, scoped to the requested practice.';
COMMENT ON FUNCTION public.remove_group_practice_admin(uuid,uuid) IS 'Intentional authenticated RPC; explicit platform-admin check, exact assignment deletion, last-link role cleanup, per-user transaction lock; legacy cash/payout relationships untouched.';