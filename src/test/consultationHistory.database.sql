-- Executed through the migration tool: fixtures and audit entries are rolled back.
DO $tests$
DECLARE
  treating_doctor uuid;
  previous_doctor uuid;
  patient uuid;
  another_patient uuid;
  current_id uuid := gen_random_uuid();
  previous_id uuid := gen_random_uuid();
  legacy_id uuid := gen_random_uuid();
  future_id uuid := gen_random_uuid();
  dependent_a uuid := gen_random_uuid();
  dependent_b uuid := gen_random_uuid();
  dependent_current uuid := gen_random_uuid();
  dependent_previous uuid := gen_random_uuid();
  result jsonb;
  audit_count bigint;
  old_claims text := current_setting('request.jwt.claims', true);
  state text;
  state_id uuid;
BEGIN
  SELECT d.profile_id INTO treating_doctor FROM public.doctors d
  JOIN public.profiles p ON p.id=d.profile_id
  JOIN public.user_roles r ON r.user_id=d.profile_id AND r.role='doctor'
  WHERE d.is_verified AND p.status='active'
    AND NOT EXISTS(SELECT 1 FROM public.user_roles privileged WHERE privileged.user_id=d.profile_id AND privileged.role IN('admin','super_admin','platform_admin'))
  ORDER BY d.id LIMIT 1;
  SELECT d.profile_id INTO previous_doctor FROM public.doctors d
  JOIN public.profiles p ON p.id=d.profile_id
  JOIN public.user_roles r ON r.user_id=d.profile_id AND r.role='doctor'
  WHERE d.is_verified AND p.status='active' AND d.profile_id<>treating_doctor ORDER BY d.id LIMIT 1;
  SELECT p.id INTO patient FROM public.profiles p
  WHERE p.id NOT IN(treating_doctor, previous_doctor) ORDER BY p.id LIMIT 1;
  SELECT p.id INTO another_patient FROM public.profiles p
  WHERE p.id NOT IN(treating_doctor, previous_doctor, patient) ORDER BY p.id LIMIT 1;
  IF treating_doctor IS NULL OR previous_doctor IS NULL OR another_patient IS NULL THEN
    RAISE EXCEPTION 'History test fixtures unavailable';
  END IF;

  IF has_function_privilege('anon','public.get_current_consultation_history(uuid)','EXECUTE')
    OR has_function_privilege('anon','private.get_current_consultation_history(uuid)','EXECUTE') THEN
    RAISE EXCEPTION 'Anonymous history execution must be denied';
  END IF;
  IF (SELECT prosecdef FROM pg_proc WHERE oid='public.get_current_consultation_history(uuid)'::regprocedure) THEN
    RAISE EXCEPTION 'Public history entry point must use invoker permissions';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='private.get_current_consultation_history(uuid)'::regprocedure
    AND prosecdef AND 'search_path=public'=ANY(proconfig)) THEN
    RAISE EXCEPTION 'Private history reader must have a fixed search path';
  END IF;

  BEGIN
    INSERT INTO public.dependents(id,guardian_id,full_name,date_of_birth,relationship)
    VALUES(dependent_a,patient,'History test dependent A','2015-01-01','child'),
      (dependent_b,patient,'History test dependent B','2016-01-01','child');
    INSERT INTO public.appointments(id,patient_id,doctor_id,scheduled_at,duration_minutes,status,notes,dependent_id)
    VALUES
      (current_id,patient,treating_doctor,now()-interval '5 minutes',30,'confirmed',NULL,NULL),
      (previous_id,patient,previous_doctor,now()-interval '2 days',30,'completed',NULL,NULL),
      (legacy_id,patient,previous_doctor,now()-interval '1 day',30,'confirmed','Legacy clinical record',NULL),
      (future_id,patient,treating_doctor,now()+interval '1 day',30,'confirmed',NULL,NULL),
      (gen_random_uuid(),another_patient,previous_doctor,now()-interval '2 days',30,'completed','Other patient private history',NULL),
      (dependent_current,patient,treating_doctor,now()-interval '5 minutes',30,'confirmed',NULL,dependent_a),
      (dependent_previous,patient,previous_doctor,now()-interval '2 days',30,'completed','Dependent A clinical record',dependent_a),
      (gen_random_uuid(),patient,previous_doctor,now()-interval '2 days',30,'completed','Dependent B private history',dependent_b),
      (gen_random_uuid(),patient,previous_doctor,now()+interval '2 days',30,'confirmed','Future private record',NULL);
    INSERT INTO public.consultation_notes(appointment_id,doctor_id,content,summary)
    VALUES(previous_id,previous_doctor,'Earlier doctor clinical notes','Earlier consultation summary');
    INSERT INTO public.prescriptions(appointment_id,doctor_id,patient_id,diagnosis,medications)
    VALUES(previous_id,previous_doctor,patient,'History test diagnosis','[{"name":"History test medicine","frequency":"Once daily"}]');

    PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',treating_doctor,'role','authenticated')::text,true);
    SELECT count(*) INTO audit_count FROM public.medical_audit_logs WHERE actor_id=treating_doctor;
    EXECUTE 'SET LOCAL ROLE authenticated';
    result := public.get_current_consultation_history(current_id);
    IF EXISTS(SELECT 1 FROM public.consultation_notes WHERE appointment_id=previous_id) THEN
      RAISE EXCEPTION 'Audited RPC must not widen direct access to another doctor clinical notes';
    END IF;
    EXECUTE 'RESET ROLE';
    IF jsonb_array_length(result->'consultations') < 2
      OR NOT (result->'consultations' @> jsonb_build_array(jsonb_build_object('appointment_id',previous_id,'notes','Earlier doctor clinical notes')))
      OR NOT (result->'consultations' @> jsonb_build_array(jsonb_build_object('appointment_id',legacy_id,'notes','Legacy clinical record')))
      OR result::text LIKE '%Other patient private history%'
      OR result::text LIKE '%Dependent A clinical record%'
      OR result::text LIKE '%Dependent B private history%'
      OR result::text LIKE '%Future private record%' THEN
      RAISE EXCEPTION 'History must include earlier consultations with other doctors and exclude other patients, dependents and future appointments';
    END IF;
    IF NOT (result->'consultations' @> '[{"prescriptions":[{"diagnosis":"History test diagnosis","medications":[{"name":"History test medicine"}]}]}]'::jsonb) THEN
      RAISE EXCEPTION 'Previous prescriptions were not included';
    END IF;
    IF (SELECT count(*) FROM public.medical_audit_logs WHERE actor_id=treating_doctor)<>audit_count+1 THEN
      RAISE EXCEPTION 'Successful history read must write an audit entry';
    END IF;

    result := public.get_current_consultation_history(dependent_current);
    IF jsonb_array_length(result->'consultations')<>1
      OR result->>'dependent_id'<>dependent_a::text
      OR result->'profile'->>'full_name'<>'History test dependent A'
      OR result::text LIKE '%Earlier doctor clinical notes%'
      OR result::text LIKE '%Dependent B private history%' THEN
      RAISE EXCEPTION 'Dependent history must never contain guardian or sibling records';
    END IF;

    FOREACH state IN ARRAY ARRAY['pending','awaiting_payment','completed','cancelled','no_show'] LOOP
      INSERT INTO public.appointments(id,patient_id,doctor_id,scheduled_at,duration_minutes,status)
      VALUES(gen_random_uuid(),patient,treating_doctor,now(),30,state) RETURNING id INTO state_id;
      BEGIN
        PERFORM public.get_current_consultation_history(state_id);
        RAISE EXCEPTION 'Non-confirmed consultation allowed history access';
      EXCEPTION WHEN insufficient_privilege THEN NULL;
      END;
    END LOOP;

    BEGIN
      PERFORM public.get_current_consultation_history(future_id);
      RAISE EXCEPTION 'Future appointment allowed history access';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    INSERT INTO public.appointments(id,patient_id,doctor_id,scheduled_at,duration_minutes,status)
    VALUES(gen_random_uuid(),patient,treating_doctor,now()-interval '61 minutes',30,'confirmed') RETURNING id INTO future_id;
    BEGIN
      PERFORM public.get_current_consultation_history(future_id);
      RAISE EXCEPTION 'Expired consultation allowed history access';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;

    PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',previous_doctor,'role','authenticated')::text,true);
    BEGIN
      PERFORM public.get_current_consultation_history(current_id);
      RAISE EXCEPTION 'Another doctor was allowed to view current history';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',patient,'role','authenticated')::text,true);
    BEGIN
      PERFORM public.get_current_consultation_history(current_id);
      RAISE EXCEPTION 'Patient caller was allowed to invoke doctor history';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    PERFORM set_config('request.jwt.claims','{}',true);
    BEGIN
      PERFORM public.get_current_consultation_history(current_id);
      RAISE EXCEPTION 'Unauthenticated caller was allowed to invoke doctor history';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    RAISE EXCEPTION USING ERRCODE='PT001', MESSAGE='Rollback history test fixtures';
  EXCEPTION WHEN SQLSTATE 'PT001' THEN NULL;
  END;
  PERFORM set_config('request.jwt.claims',coalesce(old_claims,''),true);
END;
$tests$;