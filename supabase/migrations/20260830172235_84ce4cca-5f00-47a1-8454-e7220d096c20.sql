SELECT cron.schedule(
  'process-doctor-onboarding-reminders',
  '*/15 * * * *',
  replace((SELECT command FROM cron.job WHERE jobname = 'license-renewal-daily-check'),
          'license-renewal-reminder', 'process-doctor-onboarding-reminders')
);