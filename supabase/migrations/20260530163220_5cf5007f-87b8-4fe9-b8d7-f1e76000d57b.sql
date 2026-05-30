
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS welcome_email_sent_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.doctor_onboarding_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  delay_minutes INTEGER NOT NULL CHECK (delay_minutes > 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.doctor_onboarding_reminders TO authenticated;
GRANT ALL ON public.doctor_onboarding_reminders TO service_role;

ALTER TABLE public.doctor_onboarding_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage onboarding reminders"
  ON public.doctor_onboarding_reminders FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_doctor_onboarding_reminders_updated_at
  BEFORE UPDATE ON public.doctor_onboarding_reminders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.doctor_onboarding_email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_profile_id UUID NOT NULL,
  email_type TEXT NOT NULL,
  reminder_id UUID REFERENCES public.doctor_onboarding_reminders(id) ON DELETE SET NULL,
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  error TEXT,
  resend_id TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_email_log_doctor ON public.doctor_onboarding_email_log(doctor_profile_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_onboarding_reminder_per_doctor
  ON public.doctor_onboarding_email_log(doctor_profile_id, reminder_id)
  WHERE reminder_id IS NOT NULL AND status = 'sent';

GRANT SELECT ON public.doctor_onboarding_email_log TO authenticated;
GRANT ALL ON public.doctor_onboarding_email_log TO service_role;

ALTER TABLE public.doctor_onboarding_email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view onboarding email log"
  ON public.doctor_onboarding_email_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.doctor_onboarding_reminders (name, subject, body, delay_minutes, sort_order)
VALUES
  ('1 hour follow-up', 'Complete your Doctors Onlining profile',
   E'Hi Dr {{doctor_name}},\n\nThank you for registering. Your profile is not yet complete.\n\nMissing items:\n{{missing_items}}\n\nPlease log in and complete your profile so patients can find you.', 60, 1),
  ('24 hour reminder', 'Reminder: finish setting up your Doctors Onlining account',
   E'Hi Dr {{doctor_name}},\n\nIt has been a day since you signed up and your profile is still incomplete.\n\nMissing items:\n{{missing_items}}\n\nIt only takes a few minutes to get verified and start consulting.', 1440, 2),
  ('3 day reminder', 'We are still holding your Doctors Onlining account',
   E'Hi Dr {{doctor_name}},\n\nYour account is awaiting these items:\n\n{{missing_items}}\n\nLog in to complete your onboarding and start receiving patients.', 4320, 3),
  ('7 day final reminder', 'Final reminder: complete your Doctors Onlining onboarding',
   E'Hi Dr {{doctor_name}},\n\nThis is a final reminder to finish your onboarding.\n\nMissing items:\n{{missing_items}}\n\nIf you need help, reply to this email and our team will assist.', 10080, 4)
ON CONFLICT DO NOTHING;
