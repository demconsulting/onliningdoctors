CREATE OR REPLACE FUNCTION public.enforce_founding_doctor_cap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  cnt integer;
  cap integer := 5;
  plan_id uuid;
BEGIN
  IF NEW.is_founding_doctor IS TRUE
     AND (TG_OP = 'INSERT' OR COALESCE(OLD.is_founding_doctor, false) = false) THEN
    SELECT count(*) INTO cnt FROM public.doctors
      WHERE is_founding_doctor IS TRUE AND id IS DISTINCT FROM NEW.id;
    IF cnt >= cap THEN
      RAISE EXCEPTION 'Founding Doctor limit reached (% of % slots assigned)', cnt, cap
        USING ERRCODE = 'check_violation';
    END IF;

    SELECT id INTO plan_id FROM public.platform_fee_settings
      WHERE is_founding_plan IS TRUE AND is_active IS TRUE
      ORDER BY created_at LIMIT 1;

    NEW.founding_doctor_since := COALESCE(NEW.founding_doctor_since, now());
    NEW.founding_sequence := COALESCE(NEW.founding_sequence, cnt + 1);
    NEW.founding_tier := COALESCE(NEW.founding_tier, 'pioneer');
    NEW.founding_status := 'active';
    NEW.founding_locked := true;
    NEW.founding_pricing_plan_id := COALESCE(NEW.founding_pricing_plan_id, plan_id);
  ELSIF TG_OP = 'UPDATE'
        AND NEW.is_founding_doctor IS DISTINCT FROM true
        AND OLD.is_founding_doctor IS TRUE THEN
    NEW.founding_pricing_plan_id := NULL;
    NEW.founding_locked := false;
    NEW.founding_status := 'inactive';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_founding_doctor_cap() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_founding_doctor_cap() TO service_role;

DROP TRIGGER IF EXISTS trg_enforce_founding_doctor_cap ON public.doctors;
CREATE TRIGGER trg_enforce_founding_doctor_cap
BEFORE INSERT OR UPDATE OF is_founding_doctor ON public.doctors
FOR EACH ROW EXECUTE FUNCTION public.enforce_founding_doctor_cap();

CREATE OR REPLACE FUNCTION public.founding_doctor_slots()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    'cap', 5,
    'used', (SELECT count(*) FROM public.doctors WHERE is_founding_doctor IS TRUE),
    'remaining', GREATEST(5 - (SELECT count(*) FROM public.doctors WHERE is_founding_doctor IS TRUE), 0)
  );
$$;

REVOKE EXECUTE ON FUNCTION public.founding_doctor_slots() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.founding_doctor_slots() TO authenticated, service_role;