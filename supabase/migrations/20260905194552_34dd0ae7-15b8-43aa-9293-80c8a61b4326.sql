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
  NEW.practice_id := OLD.practice_id;
  NEW.practice_approval_status := OLD.practice_approval_status;
  NEW.is_practice_owner := OLD.is_practice_owner;
  NEW.paystack_subaccount_code := OLD.paystack_subaccount_code;
  NEW.is_payout_verified := OLD.is_payout_verified;
  IF OLD.license_number IS NOT NULL THEN
    NEW.license_number := OLD.license_number;
  END IF;
  RETURN NEW;
END;
$$;