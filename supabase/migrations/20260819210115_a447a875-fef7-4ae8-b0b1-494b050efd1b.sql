CREATE OR REPLACE FUNCTION public.guard_profile_privileged_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL
     OR has_role(uid, 'admin'::app_role)
     OR has_role(uid, 'super_admin'::app_role)
     OR has_role(uid, 'platform_admin'::app_role) THEN
    RETURN NEW;
  END IF;

  NEW.id := OLD.id;
  NEW.is_suspended := OLD.is_suspended;
  NEW.suspension_reason := OLD.suspension_reason;
  NEW.account_status := OLD.account_status;
  NEW.status := OLD.status;
  NEW.business_unit := OLD.business_unit;
  NEW.test_user := OLD.test_user;
  NEW.demo_user := OLD.demo_user;
  NEW.environment := OLD.environment;
  NEW.created_by := OLD.created_by;
  NEW.last_login_at := OLD.last_login_at;
  NEW.email := OLD.email;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_profile_privileged_fields ON public.profiles;
CREATE TRIGGER guard_profile_privileged_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_privileged_fields();

CREATE OR REPLACE FUNCTION public.guard_doctor_privileged_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL
     OR has_role(uid, 'admin'::app_role)
     OR has_role(uid, 'super_admin'::app_role)
     OR has_role(uid, 'platform_admin'::app_role) THEN
    RETURN NEW;
  END IF;

  NEW.profile_id := OLD.profile_id;
  NEW.is_verified := OLD.is_verified;
  NEW.is_suspended := OLD.is_suspended;
  NEW.suspension_reason := OLD.suspension_reason;
  NEW.rating := OLD.rating;
  NEW.total_reviews := OLD.total_reviews;
  NEW.is_founding_doctor := OLD.is_founding_doctor;
  NEW.founding_status := OLD.founding_status;
  NEW.founding_doctor_since := OLD.founding_doctor_since;
  NEW.founding_expiry := OLD.founding_expiry;
  NEW.founding_pricing_plan_id := OLD.founding_pricing_plan_id;
  NEW.founding_locked := OLD.founding_locked;
  NEW.founding_tier := OLD.founding_tier;
  NEW.founding_sequence := OLD.founding_sequence;
  NEW.fee_settings_id := OLD.fee_settings_id;
  NEW.assigned_business_developer := OLD.assigned_business_developer;
  NEW.recruitment_source := OLD.recruitment_source;
  IF OLD.license_number IS NOT NULL THEN
    NEW.license_number := OLD.license_number;
  END IF;
  RETURN NEW;
END;
$$;