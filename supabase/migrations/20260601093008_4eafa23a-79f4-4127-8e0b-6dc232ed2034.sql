CREATE OR REPLACE FUNCTION public.prevent_doctor_suspension_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Allow when invoked from within another trigger (e.g. handle_founding_application_change),
  -- which is itself SECURITY DEFINER and only writes safe, server-controlled values.
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    IF NEW.is_suspended IS DISTINCT FROM OLD.is_suspended
       OR NEW.suspension_reason IS DISTINCT FROM OLD.suspension_reason
       OR NEW.is_verified IS DISTINCT FROM OLD.is_verified
       OR NEW.is_founding_doctor IS DISTINCT FROM OLD.is_founding_doctor
       OR NEW.founding_status IS DISTINCT FROM OLD.founding_status
       OR NEW.founding_pricing_plan_id IS DISTINCT FROM OLD.founding_pricing_plan_id
       OR NEW.founding_locked IS DISTINCT FROM OLD.founding_locked
       OR NEW.founding_doctor_since IS DISTINCT FROM OLD.founding_doctor_since
       OR NEW.founding_expiry IS DISTINCT FROM OLD.founding_expiry THEN
      RAISE EXCEPTION 'Only admins can modify verification, suspension, or founding doctor fields';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;