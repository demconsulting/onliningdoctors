CREATE OR REPLACE FUNCTION public.is_practice_admin(_user_id uuid, _practice_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT auth.uid() IS NOT NULL
 AND (_user_id = auth.uid() OR public.is_platform_admin(auth.uid()))
 AND public.has_role(_user_id, 'practice_admin')
 AND EXISTS(SELECT 1 FROM public.practice_admins WHERE user_id=_user_id AND practice_id=_practice_id)
$$;
CREATE OR REPLACE FUNCTION public.group_practice_directory()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE='42501'; END IF;
 RETURN jsonb_build_object(
 'practices',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'name',practice_name,'bhf_practice_number',bhf_number,'practice_type',practice_type,'city',city,'province',province,'logo_url',logo_url)),'[]'::jsonb) FROM public.practices WHERE is_active),
 'members',(SELECT coalesce(jsonb_agg(jsonb_build_object('practice_id',m.practice_id,'doctor_id',m.doctor_id,'member_role',m.member_role,'hpcsa_number',d.license_number,'individual_bhf_number',d.bhf_number)),'[]'::jsonb) FROM public.practice_members m JOIN public.practices p ON p.id=m.practice_id JOIN public.doctors d ON d.id=m.doctor_id JOIN public.profiles pr ON pr.id=d.profile_id WHERE m.is_active AND p.is_active AND d.is_verified AND pr.status='active'));
END $$;
CREATE OR REPLACE FUNCTION public.group_practice_members(_practice_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(public.is_platform_admin(auth.uid()) OR public.is_practice_admin(auth.uid(),_practice_id),false) THEN RAISE EXCEPTION 'Practice access denied' USING ERRCODE='42501'; END IF;
 RETURN (SELECT coalesce(jsonb_agg(jsonb_build_object('id',m.id,'doctor_id',d.id,'full_name',p.full_name,'email',m.email,'member_role',m.member_role,'is_active',m.is_active,'hpcsa_number',d.license_number,'individual_bhf_number',d.bhf_number,'physical_practice_address',d.physical_practice_address)),'[]'::jsonb) FROM public.practice_members m JOIN public.doctors d ON d.id=m.doctor_id JOIN public.profiles p ON p.id=d.profile_id WHERE m.practice_id=_practice_id);
END $$;
CREATE OR REPLACE FUNCTION public.add_group_practice_doctor(_practice_id uuid, _email text, _member_role public.group_member_role)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d public.doctors%ROWTYPE; p public.profiles%ROWTYPE; result uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(public.is_platform_admin(auth.uid()) OR public.is_practice_admin(auth.uid(),_practice_id),false) THEN RAISE EXCEPTION 'Practice access denied' USING ERRCODE='42501'; END IF;
 SELECT * INTO p FROM public.profiles WHERE lower(email)=lower(trim(_email));
 IF NOT FOUND THEN RAISE EXCEPTION 'No existing doctor found for that email'; END IF;
 SELECT * INTO d FROM public.doctors WHERE profile_id=p.id;
 IF NOT FOUND THEN RAISE EXCEPTION 'No existing doctor found for that email'; END IF;
 INSERT INTO public.practice_members(practice_id,user_id,doctor_id,full_name,email,role,hpcsa_number,individual_bhf_number,status,member_role)
 VALUES(_practice_id,p.id,d.id,p.full_name,p.email,'doctor',d.license_number,d.bhf_number,'active',_member_role)
 ON CONFLICT(practice_id,email) DO UPDATE SET doctor_id=EXCLUDED.doctor_id,member_role=EXCLUDED.member_role,status='active' RETURNING id INTO result;
 RETURN result;
END $$;
CREATE OR REPLACE FUNCTION public.assign_group_practice_admin(_practice_id uuid, _email text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(public.is_platform_admin(auth.uid()),false) THEN RAISE EXCEPTION 'Admin access required' USING ERRCODE='42501'; END IF;
 SELECT id INTO uid FROM public.profiles WHERE lower(email)=lower(trim(_email));
 IF uid IS NULL THEN RAISE EXCEPTION 'No account found for that email'; END IF;
 INSERT INTO public.practice_admins(practice_id,user_id) VALUES(_practice_id,uid) ON CONFLICT(practice_id,user_id) DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION public.is_practice_admin(uuid,uuid),public.group_practice_directory(),public.group_practice_members(uuid),public.add_group_practice_doctor(uuid,text,public.group_member_role),public.assign_group_practice_admin(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.is_practice_admin(uuid,uuid),public.group_practice_directory(),public.group_practice_members(uuid),public.add_group_practice_doctor(uuid,text,public.group_member_role),public.assign_group_practice_admin(uuid,text) TO authenticated,service_role;
DO $$
DECLARE previous_claims text := current_setting('request.jwt.claims',true); previous_sub text := current_setting('request.jwt.claim.sub',true); test_uid uuid := gen_random_uuid(); test_practice uuid := gen_random_uuid();
BEGIN
 PERFORM set_config('request.jwt.claims','{}',true); PERFORM set_config('request.jwt.claim.sub','',true);
 IF public.is_practice_admin(test_uid,test_practice) THEN RAISE EXCEPTION 'Anonymous helper access regression'; END IF;
 BEGIN PERFORM public.group_practice_directory(); RAISE EXCEPTION 'Anonymous directory access regression'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.group_practice_members(test_practice); RAISE EXCEPTION 'Anonymous members access regression'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.add_group_practice_doctor(test_practice,'security-test@example.invalid','associate'); RAISE EXCEPTION 'Anonymous doctor assignment regression'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.assign_group_practice_admin(test_practice,'security-test@example.invalid'); RAISE EXCEPTION 'Anonymous admin assignment regression'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',test_uid)::text,true); PERFORM set_config('request.jwt.claim.sub',test_uid::text,true);
 BEGIN PERFORM public.group_practice_members(test_practice); RAISE EXCEPTION 'Unassigned members access regression'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.add_group_practice_doctor(test_practice,'security-test@example.invalid','associate'); RAISE EXCEPTION 'Unassigned doctor assignment regression'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.assign_group_practice_admin(test_practice,'security-test@example.invalid'); RAISE EXCEPTION 'Non-admin assignment regression'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 PERFORM set_config('request.jwt.claims',coalesce(previous_claims,''),true); PERFORM set_config('request.jwt.claim.sub',coalesce(previous_sub,''),true);
END $$;