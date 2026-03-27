
-- Enable pg_cron if not already
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Function to expire stale pending payments (older than 5 minutes)
CREATE OR REPLACE FUNCTION public.expire_stale_payments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Cancel appointments that are awaiting payment for more than 5 minutes
  UPDATE appointments
  SET status = 'cancelled', updated_at = now()
  WHERE status = 'awaiting_payment'
    AND created_at < now() - interval '5 minutes';

  -- Expire pending payments older than 5 minutes
  UPDATE payments
  SET status = 'expired', updated_at = now()
  WHERE status = 'pending'
    AND created_at < now() - interval '5 minutes';
END;
$$;

-- Schedule it to run every minute
SELECT cron.schedule(
  'expire-stale-payments',
  '* * * * *',
  $$SELECT public.expire_stale_payments()$$
);
