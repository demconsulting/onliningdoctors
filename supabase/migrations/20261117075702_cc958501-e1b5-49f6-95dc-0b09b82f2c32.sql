CREATE OR REPLACE FUNCTION public.get_current_consultation_history(_appointment_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  actor uuid := auth.uid();
  current_appointment public.appointments%ROWTYPE;
  access_end timestamptz;
  clinical_profile jsonb;
  history jsonb;
BEGIN
  IF actor IS NULL OR NOT public.has_role(actor, 'doctor'::public.app_role)
     OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = actor AND p.status = 'active') THEN
    RAISE EXCEPTION 'Medical history is only available to the treating doctor during the current consultation.' USING ERRCODE = '42501';
  END IF;

  SELECT a.* INTO current_appointment
  FROM public.appointments a
  WHERE a.id = _appointment_id
    AND EXISTS (
      SELECT 1 FROM public.doctors d
      WHERE d.profile_id = actor AND d.is_verified = true
        AND (a.doctor_id = actor OR a.doctor_id = d.id)
    )
  FOR SHARE OF a;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Medical history is only available to the treating doctor during the current consultation.' USING ERRCODE = '42501';
  END IF;

  access_end := coalesce(current_appointment.end_time,
    current_appointment.scheduled_at + make_interval(mins => coalesce(current_appointment.duration_minutes, 30))) + interval '30 minutes';
  IF current_appointment.status <> 'confirmed'
     OR now() < current_appointment.scheduled_at - interval '15 minutes'
     OR now() >= access_end THEN
    RAISE EXCEPTION 'Medical history is only available to the treating doctor during the current consultation.' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.medical_audit_logs(actor_id, action_type, target_patient_id, record_type)
  VALUES (actor, 'READ', current_appointment.patient_id,
    CASE WHEN current_appointment.dependent_id IS NULL THEN 'CONSULTATION_HISTORY'
      ELSE 'DEPENDENT_CONSULTATION_HISTORY:' || current_appointment.dependent_id::text END);

  IF current_appointment.dependent_id IS NULL THEN
    SELECT jsonb_build_object(
      'full_name', p.full_name, 'date_of_birth', p.date_of_birth, 'gender', p.gender,
      'blood_type', m.blood_type, 'allergies', m.allergies,
      'chronic_conditions', m.chronic_conditions, 'current_medications', m.current_medications)
    INTO clinical_profile
    FROM public.profiles p
    LEFT JOIN public.patient_medical_info m ON m.patient_id = p.id
    WHERE p.id = current_appointment.patient_id;
  ELSE
    SELECT jsonb_build_object(
      'full_name', d.full_name, 'date_of_birth', d.date_of_birth, 'gender', d.gender,
      'allergies', d.allergies, 'chronic_conditions', d.chronic_conditions, 'medical_notes', d.medical_notes)
    INTO clinical_profile
    FROM public.dependents d
    WHERE d.id = current_appointment.dependent_id AND d.guardian_id = current_appointment.patient_id;
  END IF;

  SELECT coalesce(jsonb_agg(records.entry ORDER BY records.scheduled_at DESC, records.id DESC), '[]'::jsonb)
  INTO history
  FROM (
    SELECT a.id, a.scheduled_at, jsonb_build_object(
      'appointment_id', a.id,
      'scheduled_at', a.scheduled_at,
      'doctor_name', p.full_name,
      'reason', a.reason,
      'notes', coalesce(nullif(btrim(cn.content), ''), nullif(btrim(a.notes), '')),
      'summary', nullif(btrim(cn.summary), ''),
      'prescriptions', coalesce((
        SELECT jsonb_agg(jsonb_build_object(
          'id', rx.id, 'diagnosis', rx.diagnosis, 'clinical_notes', rx.clinical_notes,
          'medications', rx.medications, 'pharmacy_notes', rx.pharmacy_notes,
          'warnings', rx.warnings, 'allergies_noted', rx.allergies_noted,
          'follow_up_date', rx.follow_up_date, 'status', rx.status,
          'cancellation_reason', rx.cancellation_reason
        ) ORDER BY rx.created_at)
        FROM public.prescriptions rx WHERE rx.appointment_id = a.id
      ), '[]'::jsonb)
    ) AS entry
    FROM public.appointments a
    LEFT JOIN public.consultation_notes cn ON cn.appointment_id = a.id
    LEFT JOIN public.doctors d ON d.id = a.doctor_id OR d.profile_id = a.doctor_id
    LEFT JOIN public.profiles p ON p.id = coalesce(d.profile_id, a.doctor_id)
    WHERE a.patient_id = current_appointment.patient_id
      AND a.dependent_id IS NOT DISTINCT FROM current_appointment.dependent_id
      AND a.id <> current_appointment.id
      AND a.scheduled_at < current_appointment.scheduled_at
      AND a.scheduled_at < now()
      AND (a.status = 'completed' OR (a.status = 'confirmed' AND
        coalesce(a.end_time, a.scheduled_at + make_interval(mins => coalesce(a.duration_minutes, 30))) <= now()))
  ) records;

  RETURN jsonb_build_object(
    'appointment_id', current_appointment.id,
    'dependent_id', current_appointment.dependent_id,
    'access_expires_at', access_end,
    'profile', clinical_profile,
    'consultations', history
  );
END;
$function$;
REVOKE ALL ON FUNCTION public.get_current_consultation_history(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_current_consultation_history(uuid) TO authenticated;
COMMENT ON FUNCTION public.get_current_consultation_history(uuid) IS 'Audited, allowlisted clinical history for the verified treating doctor only during a confirmed consultation window; no direct-table policy expansion.';