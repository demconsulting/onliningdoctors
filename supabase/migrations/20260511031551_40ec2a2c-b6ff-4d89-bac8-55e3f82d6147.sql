
-- Seed default reminder minutes (used by send-appointment-reminders)
INSERT INTO public.site_content (key, value)
VALUES ('appointment_reminder_minutes', '{"minutes": [60, 5, 1]}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Schedule the appointment reminder dispatcher every minute
DO $$
BEGIN
  PERFORM cron.unschedule('send-appointment-reminders-every-minute')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-appointment-reminders-every-minute');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'send-appointment-reminders-every-minute',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://ufgbavxidpmikiwicifv.supabase.co/functions/v1/send-appointment-reminders',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmZ2JhdnhpZHBtaWtpd2ljaWZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNzkzNTYsImV4cCI6MjA4Nzc1NTM1Nn0.Q207kuJPPx0AReztT3hkR6_RBpnk03Xi5IGqGqpheWg"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
