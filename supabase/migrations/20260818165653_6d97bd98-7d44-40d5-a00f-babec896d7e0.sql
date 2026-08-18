
-- 1. Appointment column guard
CREATE OR REPLACE FUNCTION public.guard_appointment_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  admin_actor boolean;
  doctor_actor boolean;
  staff_actor boolean;
  patient_actor boolean;
BEGIN
  IF uid IS NULL THEN
    RETURN NEW; -- service role / edge functions
  END IF;

  admin_actor := has_role(uid, 'admin'::app_role)
              OR has_role(uid, 'super_admin'::app_role)
              OR has_role(uid, 'platform_admin'::app_role);
  IF admin_actor THEN
    RETURN NEW;
  END IF;

  doctor_actor := (OLD.doctor_id = uid) OR EXISTS (
    SELECT 1 FROM public.doctors d
    WHERE d.profile_id = uid AND (d.profile_id = OLD.doctor_id OR d.id = OLD.doctor_id)
  );

  staff_actor := EXISTS (
    SELECT 1 FROM public.doctors d
    JOIN public.practice_members pm ON pm.practice_id = d.practice_id
    WHERE (d.profile_id = OLD.doctor_id OR d.id = OLD.doctor_id)
      AND pm.user_id = uid AND pm.status = 'active'::practice_member_status
  );

  patient_actor := (OLD.patient_id = uid) OR EXISTS (
    SELECT 1 FROM public.dependents dp
    WHERE dp.id = OLD.dependent_id AND (dp.guardian_id = uid OR dp.linked_user_id = uid)
  );

  IF doctor_actor OR staff_actor THEN
    -- Identity and pricing fields are immutable for clinicians
    NEW.id := OLD.id;
    NEW.patient_id := OLD.patient_id;
    NEW.doctor_id := OLD.doctor_id;
    NEW.dependent_id := OLD.dependent_id;
    NEW.pricing_tier_id := OLD.pricing_tier_id;
    NEW.pricing_tier_type := OLD.pricing_tier_type;
    NEW.payment_method_type := OLD.payment_method_type;
    NEW.medical_aid_request_id := OLD.medical_aid_request_id;
    NEW.created_by := OLD.created_by;
    NEW.created_at := OLD.created_at;
    RETURN NEW;
  END IF;

  IF patient_actor THEN
    IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'cancelled' THEN
      RAISE EXCEPTION 'Patients may only cancel their appointments';
    END IF;
    NEW.id := OLD.id;
    NEW.patient_id := OLD.patient_id;
    NEW.doctor_id := OLD.doctor_id;
    NEW.dependent_id := OLD.dependent_id;
    NEW.pricing_tier_id := OLD.pricing_tier_id;
    NEW.pricing_tier_type := OLD.pricing_tier_type;
    NEW.payment_method_type := OLD.payment_method_type;
    NEW.medical_aid_request_id := OLD.medical_aid_request_id;
    NEW.scheduled_at := OLD.scheduled_at;
    NEW.end_time := OLD.end_time;
    NEW.duration_minutes := OLD.duration_minutes;
    NEW.appointment_type := OLD.appointment_type;
    NEW.notes := OLD.notes;
    NEW.created_by := OLD.created_by;
    NEW.created_at := OLD.created_at;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_appointment_update ON public.appointments;
CREATE TRIGGER guard_appointment_update
BEFORE UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.guard_appointment_update();

-- Patient update policy: only cancellations
DROP POLICY IF EXISTS "Patients can cancel own appointments" ON public.appointments;
CREATE POLICY "Patients can cancel own appointments"
ON public.appointments FOR UPDATE TO authenticated
USING (patient_id = auth.uid() AND status = ANY (ARRAY['pending','confirmed','awaiting_payment']))
WITH CHECK (patient_id = auth.uid() AND status = ANY (ARRAY['pending','confirmed','awaiting_payment','cancelled']));

DROP POLICY IF EXISTS "Doctors can update appointment status" ON public.appointments;
CREATE POLICY "Doctors can update appointment status"
ON public.appointments FOR UPDATE TO authenticated
USING (doctor_id = auth.uid())
WITH CHECK (doctor_id = auth.uid());

-- 2. Doctor privileged-column guard
CREATE OR REPLACE FUNCTION public.guard_doctor_privileged_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_doctor_privileged_fields ON public.doctors;
CREATE TRIGGER guard_doctor_privileged_fields
BEFORE UPDATE ON public.doctors
FOR EACH ROW EXECUTE FUNCTION public.guard_doctor_privileged_fields();

-- 3. Medical aid request guard
CREATE OR REPLACE FUNCTION public.guard_medical_aid_request_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL
     OR has_role(uid, 'admin'::app_role)
     OR has_role(uid, 'super_admin'::app_role)
     OR has_role(uid, 'platform_admin'::app_role)
     OR OLD.doctor_id = uid THEN
    RETURN NEW;
  END IF;

  IF OLD.patient_id = uid THEN
    IF OLD.status IS DISTINCT FROM 'pending' THEN
      RAISE EXCEPTION 'This medical aid request can no longer be edited';
    END IF;
    NEW.id := OLD.id;
    NEW.patient_id := OLD.patient_id;
    NEW.doctor_id := OLD.doctor_id;
    NEW.status := OLD.status;
    NEW.approved_rate := OLD.approved_rate;
    NEW.copayment_amount := OLD.copayment_amount;
    NEW.doctor_notes := OLD.doctor_notes;
    NEW.appointment_id := OLD.appointment_id;
    NEW.created_at := OLD.created_at;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_medical_aid_request_update ON public.medical_aid_requests;
CREATE TRIGGER guard_medical_aid_request_update
BEFORE UPDATE ON public.medical_aid_requests
FOR EACH ROW EXECUTE FUNCTION public.guard_medical_aid_request_update();

DROP POLICY IF EXISTS "Patients update own pending requests" ON public.medical_aid_requests;
CREATE POLICY "Patients update own pending requests"
ON public.medical_aid_requests FOR UPDATE TO authenticated
USING (patient_id = auth.uid() AND status = 'pending')
WITH CHECK (patient_id = auth.uid() AND status = 'pending');
