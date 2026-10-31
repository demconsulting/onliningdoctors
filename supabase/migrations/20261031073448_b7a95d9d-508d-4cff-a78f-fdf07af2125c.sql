-- lovable-cron-fallback-reviewed: Repair existing time-based delayed reminder checks at the established 15-minute cadence, no new job or provider.
CREATE OR REPLACE FUNCTION public.configure_doctor_reminder_schedule(_service_authorization text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _command text; _jobid bigint;
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _service_authorization IS NULL OR length(_service_authorization) < 20 THEN RAISE EXCEPTION 'Server authorization required'; END IF;
  _command := format('SELECT net.http_post(url := %L, headers := %L::jsonb, body := ''{}''::jsonb) AS request_id;',
    'https://ufgbavxidpmikiwicifv.supabase.co/functions/v1/process-doctor-onboarding-reminders',
    jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || _service_authorization)::text);
  SELECT jobid INTO _jobid FROM cron.job WHERE jobname='process-doctor-onboarding-reminders';
  IF _jobid IS NULL THEN
    PERFORM cron.schedule('process-doctor-onboarding-reminders','*/15 * * * *',_command);
  ELSIF EXISTS (SELECT 1 FROM cron.job WHERE jobid=_jobid AND (command IS DISTINCT FROM _command OR NOT active)) THEN
    PERFORM cron.alter_job(_jobid, command := _command, active := true);
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.configure_doctor_reminder_schedule(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.configure_doctor_reminder_schedule(text) TO service_role;