
-- Add is_verified column to doctors for admin approval
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false;

-- Update handle_new_user to support doctor signup via metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );

  -- Check if signing up as doctor
  IF NEW.raw_user_meta_data->>'signup_as_doctor' = 'true' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'doctor');
    INSERT INTO public.doctors (profile_id, license_number, title, is_verified, is_available)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'license_number', ''),
      COALESCE(NEW.raw_user_meta_data->>'title', ''),
      false,
      false
    );
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'patient');
  END IF;

  RETURN NEW;
END;
$$;
