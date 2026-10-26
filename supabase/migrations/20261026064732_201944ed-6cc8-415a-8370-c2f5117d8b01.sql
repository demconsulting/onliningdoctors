ALTER TABLE public.payments ALTER COLUMN currency SET DEFAULT 'ZAR';
ALTER TABLE public.payout_requests ALTER COLUMN currency SET DEFAULT 'ZAR';
ALTER VIEW public.public_doctors SET (security_invoker = true);

CREATE OR REPLACE FUNCTION public.list_public_doctors()
RETURNS TABLE(id uuid, profile_id uuid, specialty_id uuid, title text, bio text, experience_years integer, consultation_fee numeric, rating numeric, total_reviews integer, is_available boolean, languages text[], education text, hospital_affiliation text, is_verified boolean, practice_name text, practice_logo_url text, consultation_category_id uuid, full_name text, avatar_url text, city text, suburb text, country text, specialty jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
SELECT d.id,d.profile_id,d.specialty_id,d.title,d.bio,d.experience_years,d.consultation_fee,d.rating,d.total_reviews,d.is_available,d.languages,d.education,d.hospital_affiliation,d.is_verified,d.practice_name,d.practice_logo_url,d.consultation_category_id,p.full_name,p.avatar_url,p.city,p.suburb,p.country,CASE WHEN s.id IS NULL THEN NULL ELSE jsonb_build_object('name',s.name,'icon',s.icon) END
FROM public.doctors d LEFT JOIN public.profiles p ON p.id=d.profile_id LEFT JOIN public.specialties s ON s.id=d.specialty_id
WHERE d.is_verified IS TRUE AND d.is_suspended IS FALSE;
$$;
REVOKE ALL ON FUNCTION public.list_public_doctors() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_public_doctors() TO anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.list_group_practice_admins(_practice_id uuid)
RETURNS TABLE(id uuid,user_id uuid,full_name text,email text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$ BEGIN
IF auth.uid() IS NULL OR NOT coalesce(public.is_platform_admin(auth.uid()),false) THEN RAISE EXCEPTION 'Admin access required' USING ERRCODE='42501'; END IF;
RETURN QUERY SELECT a.id,a.user_id,p.full_name,p.email FROM public.practice_admins a JOIN public.profiles p ON p.id=a.user_id WHERE a.practice_id=_practice_id ORDER BY p.full_name;
END $$;
REVOKE ALL ON FUNCTION public.list_group_practice_admins(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.list_group_practice_admins(uuid) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.remove_group_practice_admin(_practice_id uuid,_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ BEGIN
IF auth.uid() IS NULL OR NOT coalesce(public.is_platform_admin(auth.uid()),false) THEN RAISE EXCEPTION 'Admin access required' USING ERRCODE='42501'; END IF;
PERFORM pg_advisory_xact_lock(hashtextextended(_user_id::text,0));
IF NOT EXISTS(SELECT 1 FROM public.practice_admins WHERE practice_id=_practice_id AND user_id=_user_id) THEN RAISE EXCEPTION 'Administrator assignment not found'; END IF;
DELETE FROM public.practice_admins WHERE practice_id=_practice_id AND user_id=_user_id;
DELETE FROM public.user_roles WHERE user_id=_user_id AND role='practice_admin' AND NOT EXISTS(SELECT 1 FROM public.practice_admins WHERE user_id=_user_id);
END $$;
REVOKE ALL ON FUNCTION public.remove_group_practice_admin(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.remove_group_practice_admin(uuid,uuid) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.assign_group_practice_admin(_practice_id uuid,_email text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ DECLARE uid uuid; BEGIN
IF auth.uid() IS NULL OR NOT coalesce(public.is_platform_admin(auth.uid()),false) THEN RAISE EXCEPTION 'Admin access required' USING ERRCODE='42501'; END IF;
SELECT id INTO uid FROM public.profiles WHERE lower(email)=lower(trim(_email));
IF uid IS NULL THEN RAISE EXCEPTION 'No account found for that email'; END IF;
PERFORM pg_advisory_xact_lock(hashtextextended(uid::text,0));
INSERT INTO public.practice_admins(practice_id,user_id) VALUES(_practice_id,uid) ON CONFLICT(practice_id,user_id) DO NOTHING;
END $$;

ALTER POLICY group_practice_logo_read ON storage.objects TO authenticated USING (bucket_id='group-practice-logos');

DO $$ DECLARE f record; BEGIN
FOR f IN SELECT p.oid,p.oid::regprocedure AS signature,p.proname,has_function_privilege('authenticated',p.oid,'EXECUTE') AS auth_access,has_function_privilege('service_role',p.oid,'EXECUTE') AS service_access FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prosecdef LOOP
IF f.auth_access THEN EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated',f.signature); END IF;
IF f.service_access THEN EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',f.signature); END IF;
EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon',f.signature);
IF f.proname IN ('list_public_doctors','list_public_doctor_availability','get_public_reviews','check_doctor_identity_available','get_founding_slots') THEN EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon',f.signature); END IF;
END LOOP;
END $$;