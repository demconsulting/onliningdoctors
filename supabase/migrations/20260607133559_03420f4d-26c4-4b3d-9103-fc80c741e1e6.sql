CREATE OR REPLACE FUNCTION public.log_audit_event_self(_action text, _table_name text, _details jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, details)
  VALUES (auth.uid(), _action, _table_name, auth.uid()::text, COALESCE(_details, '{}'::jsonb));
END;
$$;
GRANT EXECUTE ON FUNCTION public.log_audit_event_self(text, text, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.complete_doctor_signup(_license_number text, _title text, _country text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF _license_number IS NULL OR length(trim(_license_number)) = 0 THEN
    RAISE EXCEPTION 'HPCSA registration number is required';
  END IF;
  IF _country IS NULL OR length(trim(_country)) = 0 THEN
    RAISE EXCEPTION 'Country is required';
  END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_user AND role IN ('admin','super_admin','platform_admin','doctor')) THEN
    RAISE EXCEPTION 'Doctor account already exists';
  END IF;

  DELETE FROM public.user_roles WHERE user_id = v_user AND role = 'patient';
  INSERT INTO public.user_roles (user_id, role) VALUES (v_user, 'doctor')
    ON CONFLICT (user_id, role) DO NOTHING;

  UPDATE public.profiles SET country = COALESCE(NULLIF(country,''), _country) WHERE id = v_user;

  INSERT INTO public.doctors (profile_id, license_number, title, is_verified, is_available)
  VALUES (v_user, trim(_license_number), NULLIF(trim(_title),''), false, false)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, details)
  VALUES (v_user, 'doctor_signup_completed_via_google', 'doctors', v_user::text,
          jsonb_build_object('license_number', _license_number, 'country', _country, 'title', _title));
END;
$$;
GRANT EXECUTE ON FUNCTION public.complete_doctor_signup(text, text, text) TO authenticated;