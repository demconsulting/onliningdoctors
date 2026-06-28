
-- Drop the overly broad doctor SELECT policy
DROP POLICY IF EXISTS "Doctors view only their assigned fee settings" ON public.platform_fee_settings;

-- RPC: return the effective fee plan for the calling doctor (founding -> override -> default)
CREATE OR REPLACE FUNCTION public.get_my_fee_settings()
RETURNS public.platform_fee_settings
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_doc RECORD;
  v_override_id uuid;
  v_row public.platform_fee_settings;
BEGIN
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT fee_settings_id, founding_pricing_plan_id, founding_locked, is_founding_doctor
    INTO v_doc
  FROM public.doctors
  WHERE profile_id = v_uid;

  IF v_doc IS NULL THEN
    RETURN NULL;
  END IF;

  IF v_doc.is_founding_doctor AND v_doc.founding_locked AND v_doc.founding_pricing_plan_id IS NOT NULL THEN
    v_override_id := v_doc.founding_pricing_plan_id;
  ELSE
    v_override_id := v_doc.fee_settings_id;
  END IF;

  IF v_override_id IS NOT NULL THEN
    SELECT * INTO v_row FROM public.platform_fee_settings
     WHERE id = v_override_id AND is_active = true;
    IF FOUND THEN RETURN v_row; END IF;
  END IF;

  SELECT * INTO v_row FROM public.platform_fee_settings
   WHERE is_default = true AND is_active = true
   LIMIT 1;
  RETURN v_row;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_fee_settings() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_fee_settings() TO authenticated;

-- RPC: summary of a specific plan the caller is assigned to (founding card)
CREATE OR REPLACE FUNCTION public.get_fee_plan_summary(_plan_id uuid)
RETURNS TABLE(name text, platform_fee_percent numeric, is_default boolean)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_allowed boolean := false;
BEGIN
  IF v_uid IS NULL OR _plan_id IS NULL THEN
    RETURN;
  END IF;

  -- Allow if it's the default active plan, OR caller is assigned to it
  SELECT EXISTS (
    SELECT 1 FROM public.platform_fee_settings p
     WHERE p.id = _plan_id AND p.is_default = true AND p.is_active = true
  ) OR EXISTS (
    SELECT 1 FROM public.doctors d
     WHERE d.profile_id = v_uid
       AND (d.fee_settings_id = _plan_id OR d.founding_pricing_plan_id = _plan_id)
  ) INTO v_allowed;

  IF NOT v_allowed THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT p.name, p.platform_fee_percent, p.is_default
      FROM public.platform_fee_settings p
     WHERE p.id = _plan_id AND p.is_active = true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_fee_plan_summary(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_fee_plan_summary(uuid) TO authenticated;

-- Allow doctors to discover only the default plan's headline percent (for compare display)
CREATE OR REPLACE FUNCTION public.get_default_platform_fee_percent()
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT platform_fee_percent FROM public.platform_fee_settings
   WHERE is_default = true AND is_active = true LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.get_default_platform_fee_percent() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_default_platform_fee_percent() TO authenticated;
