CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, country)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
          COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
          NULLIF(NEW.raw_user_meta_data->>'country', ''))
  ON CONFLICT (id) DO NOTHING;

  IF NEW.raw_user_meta_data->>'signup_as_doctor' = 'true' THEN
    -- Doctor applicants get an unverified doctors row only; the doctor role
    -- is granted when an admin verifies them (sync_doctor_role_on_verify).
    IF NOT EXISTS (SELECT 1 FROM public.doctors WHERE profile_id = NEW.id) THEN
      INSERT INTO public.doctors (profile_id, license_number, title, is_verified, is_available)
      VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'license_number', ''),
              COALESCE(NEW.raw_user_meta_data->>'title', ''), false, false);
    END IF;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'patient')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.complete_doctor_signup(_license_number text, _title text, _country text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF _license_number IS NULL OR length(trim(_license_number)) = 0 THEN
    RAISE EXCEPTION 'HPCSA registration number is required';
  END IF;
  IF _country IS NULL OR length(trim(_country)) = 0 THEN RAISE EXCEPTION 'Country is required'; END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_user AND role IN ('admin','super_admin','platform_admin','doctor'))
     OR EXISTS (SELECT 1 FROM public.doctors WHERE profile_id = v_user) THEN
    RAISE EXCEPTION 'Doctor account already exists';
  END IF;

  DELETE FROM public.user_roles WHERE user_id = v_user AND role = 'patient';
  UPDATE public.profiles SET country = COALESCE(NULLIF(country,''), _country) WHERE id = v_user;

  INSERT INTO public.doctors (profile_id, license_number, title, is_verified, is_available)
  VALUES (v_user, trim(_license_number), NULLIF(trim(_title),''), false, false)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, details)
  VALUES (v_user, 'doctor_signup_completed_via_google', 'doctors', v_user::text,
          jsonb_build_object('license_number', _license_number, 'country', _country, 'title', _title));
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_doctor_role_on_verify()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.is_verified THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.profile_id, 'doctor')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSIF TG_OP = 'UPDATE' AND OLD.is_verified AND NOT NEW.is_verified THEN
    DELETE FROM public.user_roles WHERE user_id = NEW.profile_id AND role = 'doctor';
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.sync_doctor_role_on_verify() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_sync_doctor_role_on_verify ON public.doctors;
CREATE TRIGGER trg_sync_doctor_role_on_verify
AFTER INSERT OR UPDATE OF is_verified ON public.doctors
FOR EACH ROW EXECUTE FUNCTION public.sync_doctor_role_on_verify();

-- Backfill: verified doctors keep the role; unverified applicants lose it until approved
INSERT INTO public.user_roles (user_id, role)
SELECT profile_id, 'doctor' FROM public.doctors WHERE is_verified
ON CONFLICT (user_id, role) DO NOTHING;
DELETE FROM public.user_roles ur USING public.doctors d
WHERE ur.user_id = d.profile_id AND ur.role = 'doctor' AND NOT d.is_verified;