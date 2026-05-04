CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, country)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    NULLIF(NEW.raw_user_meta_data->>'country', '')
  )
  ON CONFLICT (id) DO NOTHING;

  -- Check if signing up as doctor
  IF NEW.raw_user_meta_data->>'signup_as_doctor' = 'true' THEN
    -- Guard: prevent duplicate doctor role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'doctor')
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Guard: prevent duplicate doctor profile for same auth user
    IF NOT EXISTS (
      SELECT 1 FROM public.doctors WHERE profile_id = NEW.id
    ) THEN
      INSERT INTO public.doctors (profile_id, license_number, title, is_verified, is_available)
      VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'license_number', ''),
        COALESCE(NEW.raw_user_meta_data->>'title', ''),
        false,
        false
      );
    END IF;
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'patient')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;