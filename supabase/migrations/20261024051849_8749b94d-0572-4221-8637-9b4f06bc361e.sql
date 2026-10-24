ALTER POLICY practice_admins_insert ON public.practice_admins WITH CHECK (public.is_platform_admin(auth.uid()));
ALTER POLICY practice_admins_update ON public.practice_admins USING (public.is_platform_admin(auth.uid())) WITH CHECK (public.is_platform_admin(auth.uid()));
ALTER POLICY practice_admins_read ON public.practice_admins USING (public.is_platform_admin(auth.uid()) OR user_id=auth.uid());
DO $$
BEGIN
 IF EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='practice_admins' AND cmd IN ('INSERT','UPDATE') AND (coalesce(qual,'') LIKE '%is_practice_admin%' OR coalesce(with_check,'') LIKE '%is_practice_admin%')) THEN RAISE EXCEPTION 'Practice administrator delegation must require a platform admin'; END IF;
END $$;