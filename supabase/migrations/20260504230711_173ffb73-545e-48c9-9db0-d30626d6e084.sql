
-- Dedup log for booking-related emails
CREATE TABLE IF NOT EXISTS public.booking_email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  email_type text NOT NULL,
  recipient text NOT NULL,
  resend_id text,
  status text NOT NULL DEFAULT 'sent',
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (appointment_id, email_type)
);

ALTER TABLE public.booking_email_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read; writes happen via service role from edge functions
CREATE POLICY "Admins can view booking email log"
ON public.booking_email_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Enable extensions for cron
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
