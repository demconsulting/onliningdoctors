
-- Schedule daily check at 8am UTC for license renewal reminders
SELECT cron.schedule(
  'license-renewal-daily-check',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ufgbavxidpmikiwicifv.supabase.co/functions/v1/license-renewal-reminder',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmZ2JhdnhpZHBtaWtpd2ljaWZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNzkzNTYsImV4cCI6MjA4Nzc1NTM1Nn0.Q207kuJPPx0AReztT3hkR6_RBpnk03Xi5IGqGqpheWg"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
