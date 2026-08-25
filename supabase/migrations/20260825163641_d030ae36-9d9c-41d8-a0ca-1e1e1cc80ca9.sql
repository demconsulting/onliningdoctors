CREATE OR REPLACE FUNCTION public.guard_appointment_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  admin_actor boolean;
  doctor_actor boolean;
  staff_actor boolean;
  patient_actor boolean;
BEGIN
  IF uid IS NULL THEN
    RETURN NEW;
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

    IF OLD.patient_id IS NOT NULL THEN
      NEW.patient_name := OLD.patient_name;
      NEW.patient_phone := OLD.patient_phone;
      NEW.patient_email := OLD.patient_email;
      NEW.reason := OLD.reason;
    END IF;

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
$function$;

DROP POLICY IF EXISTS "Patients can view notes for their appointments" ON public.consultation_notes;
DROP POLICY IF EXISTS "Linked dependent can view own consultation notes" ON public.consultation_notes;

CREATE OR REPLACE FUNCTION public.get_consultation_summary(_appointment_id uuid)
RETURNS TABLE (appointment_id uuid, summary text, updated_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT cn.appointment_id, cn.summary, cn.updated_at
  FROM public.consultation_notes cn
  JOIN public.appointments a ON a.id = cn.appointment_id
  WHERE cn.appointment_id = _appointment_id
    AND (
      a.patient_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.dependents d
        WHERE d.id = cn.dependent_id
          AND d.linked_user_id = auth.uid()
          AND d.consent_accepted_at IS NOT NULL
      )
      OR EXISTS (
        SELECT 1 FROM public.dependents d
        WHERE d.id = a.dependent_id AND d.guardian_id = auth.uid()
      )
    );
$$;

REVOKE ALL ON FUNCTION public.get_consultation_summary(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_consultation_summary(uuid) TO authenticated;