
-- Extend doctor onboarding email log with delivery/open/click tracking
ALTER TABLE public.doctor_onboarding_email_log
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS clicked_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_after_reminder boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS doctor_name text;

CREATE INDEX IF NOT EXISTS idx_doctor_onboarding_email_log_resend_id
  ON public.doctor_onboarding_email_log(resend_id);
CREATE INDEX IF NOT EXISTS idx_doctor_onboarding_email_log_doctor
  ON public.doctor_onboarding_email_log(doctor_profile_id, sent_at DESC);
