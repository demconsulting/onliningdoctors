
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$ BEGIN
  PERFORM cron.unschedule('process-doctor-onboarding-reminders');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'process-doctor-onboarding-reminders',
  '*/15 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://ufgbavxidpmikiwicifv.supabase.co/functions/v1/process-doctor-onboarding-reminders',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmZ2JhdnhpZHBtaWtpd2ljaWZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNzkzNTYsImV4cCI6MjA4Nzc1NTM1Nn0.Q207kuJPPx0AReztT3hkR6_RBpnk03Xi5IGqGqpheWg"}'::jsonb,
    body := '{}'::jsonb
  );
  $cron$
);
