-- Transactional regression checks: test assignments and roles are rolled back.
DO $$
DECLARE admin_uid uuid; target_uid uuid; p1 uuid; p2 uuid; previous_claims text;
BEGIN
  SELECT user_id INTO admin_uid FROM public.user_roles WHERE role IN ('admin','platform_admin','super_admin') LIMIT 1;
  SELECT p.id INTO target_uid FROM public.profiles p WHERE NOT EXISTS (SELECT 1 FROM public.practice_admins a WHERE a.user_id=p.id) AND NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id=p.id AND r.role IN ('admin','platform_admin','super_admin','practice_admin')) LIMIT 1;
  SELECT id INTO p1 FROM public.practices ORDER BY id LIMIT 1;
  SELECT id INTO p2 FROM public.practices WHERE id<>p1 ORDER BY id LIMIT 1;
  IF admin_uid IS NULL OR target_uid IS NULL OR p2 IS NULL THEN RAISE EXCEPTION 'Regression fixtures unavailable'; END IF;
  previous_claims := current_setting('request.jwt.claims',true);
  BEGIN
    PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',target_uid,'role','authenticated')::text,true);
    BEGIN
      PERFORM public.remove_group_practice_admin(p1,target_uid);
      RAISE EXCEPTION 'Non-admin removal was allowed';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',admin_uid,'role','authenticated')::text,true);
    INSERT INTO public.practice_admins(practice_id,user_id) VALUES(p1,target_uid),(p2,target_uid);
    PERFORM public.remove_group_practice_admin(p1,target_uid);
    IF EXISTS(SELECT 1 FROM public.practice_admins WHERE practice_id=p1 AND user_id=target_uid) THEN RAISE EXCEPTION 'Requested link not removed'; END IF;
    IF NOT EXISTS(SELECT 1 FROM public.practice_admins WHERE practice_id=p2 AND user_id=target_uid) THEN RAISE EXCEPTION 'Other practice link was removed'; END IF;
    IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=target_uid AND role='practice_admin') THEN RAISE EXCEPTION 'Role removed before final link'; END IF;
    PERFORM public.remove_group_practice_admin(p2,target_uid);
    IF EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=target_uid AND role='practice_admin') THEN RAISE EXCEPTION 'Final-link role cleanup failed'; END IF;
    RAISE EXCEPTION USING ERRCODE='PT001', MESSAGE='Rollback test fixtures';
  EXCEPTION WHEN SQLSTATE 'PT001' THEN NULL;
  END;
  PERFORM set_config('request.jwt.claims',coalesce(previous_claims,''),true);
  IF (SELECT column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='payments' AND column_name='currency') <> '''ZAR''::text' THEN RAISE EXCEPTION 'Payment default is not ZAR'; END IF;
  IF (SELECT column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='payout_requests' AND column_name='currency') <> '''ZAR''::text' THEN RAISE EXCEPTION 'Payout default is not ZAR'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid='public.public_doctors'::regclass AND 'security_invoker=true'=ANY(reloptions)) THEN RAISE EXCEPTION 'Directory view is not invoker'; END IF;
  IF EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='payment_gateway_credentials') THEN RAISE EXCEPTION 'Unconfirmed credential policies were added'; END IF;
  IF NOT EXISTS(SELECT 1 FROM storage.buckets WHERE id='group-practice-logos' AND public IS FALSE) THEN RAISE EXCEPTION 'Logo bucket is not private'; END IF;
END $$;