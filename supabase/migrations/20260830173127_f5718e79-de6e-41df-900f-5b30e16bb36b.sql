
-- 1) Column-level protection for identity fields on profiles
REVOKE SELECT ON public.profiles FROM authenticated, anon;

GRANT SELECT (
  id, full_name, avatar_url, phone, date_of_birth, gender, address, city, country,
  created_at, updated_at, state, is_suspended, suspension_reason, account_status,
  test_user, demo_user, environment, id_country_code, phone_verified, business_unit,
  email, status, created_by, last_login_at
) ON public.profiles TO authenticated;

GRANT UPDATE (
  full_name, avatar_url, phone, date_of_birth, gender, address, city, country, state,
  updated_at, id_number, id_type, id_country_code, id_number_hash, phone_verified,
  is_suspended, suspension_reason, account_status, test_user, demo_user, environment,
  email, status, last_login_at, business_unit
) ON public.profiles TO authenticated;

GRANT ALL ON public.profiles TO service_role;

-- Self-service read of own identity document details
CREATE OR REPLACE FUNCTION public.get_my_identity()
RETURNS TABLE (id_type text, id_number text, id_country_code text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.id_type, p.id_number, p.id_country_code
  FROM public.profiles p
  WHERE p.id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.get_my_identity() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_identity() TO authenticated;

-- 2) Referral click recording without code enumeration
DROP POLICY IF EXISTS "Anyone records a click for a valid code" ON public.referral_clicks;

CREATE OR REPLACE FUNCTION public.record_referral_click(
  _code text,
  _user_agent text DEFAULT NULL,
  _referer text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF _code IS NULL OR length(_code) < 4 OR length(_code) > 32 THEN
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM public.referral_codes rc WHERE rc.code = upper(_code)) THEN
    INSERT INTO public.referral_clicks (code, user_agent, referer)
    VALUES (upper(_code), left(coalesce(_user_agent, ''), 500), left(_referer, 500));
  END IF;

  RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.record_referral_click(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_referral_click(text, text, text) TO anon, authenticated;
REVOKE INSERT ON public.referral_clicks FROM anon, authenticated;
GRANT ALL ON public.referral_clicks TO service_role;
