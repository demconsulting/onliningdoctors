
-- PROSPECTS
CREATE TABLE public.recruitment_prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  title text,
  specialty text,
  hpcsa_number text,
  practice_name text,
  province text,
  city text,
  mobile_number text,
  whatsapp_number text,
  email text,
  referral_source text,
  referrer_doctor_id uuid,
  notes text,
  stage text NOT NULL DEFAULT 'lead',
  next_follow_up_date date,
  assigned_recruiter uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  linked_doctor_profile_id uuid,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recruitment_prospects_stage_check CHECK (stage IN (
    'lead','contacted','interested','meeting_scheduled','demo_completed',
    'invited','registered','pending_verification','verified','founding_doctor','declined'
  ))
);
CREATE INDEX idx_recruitment_prospects_stage ON public.recruitment_prospects(stage);
CREATE INDEX idx_recruitment_prospects_assigned ON public.recruitment_prospects(assigned_recruiter);
CREATE INDEX idx_recruitment_prospects_followup ON public.recruitment_prospects(next_follow_up_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recruitment_prospects TO authenticated;
GRANT ALL ON public.recruitment_prospects TO service_role;
ALTER TABLE public.recruitment_prospects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage prospects" ON public.recruitment_prospects FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER trg_recruitment_prospects_updated BEFORE UPDATE ON public.recruitment_prospects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- COMMUNICATIONS
CREATE TABLE public.recruitment_communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES public.recruitment_prospects(id) ON DELETE CASCADE,
  channel text NOT NULL,
  direction text NOT NULL DEFAULT 'outbound',
  subject text,
  body text,
  template_key text,
  outcome text,
  delivery_status text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recruitment_communications_channel_check CHECK (channel IN ('email','whatsapp','call','meeting','note','sms')),
  CONSTRAINT recruitment_communications_direction_check CHECK (direction IN ('inbound','outbound'))
);
CREATE INDEX idx_recruitment_comms_prospect ON public.recruitment_communications(prospect_id, occurred_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recruitment_communications TO authenticated;
GRANT ALL ON public.recruitment_communications TO service_role;
ALTER TABLE public.recruitment_communications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage comms" ON public.recruitment_communications FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

-- TASKS
CREATE TABLE public.recruitment_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid REFERENCES public.recruitment_prospects(id) ON DELETE CASCADE,
  task_type text NOT NULL,
  title text NOT NULL,
  notes text,
  due_date timestamptz,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  priority text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'pending',
  completed_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recruitment_tasks_type_check CHECK (task_type IN ('call','whatsapp','email','meeting','other')),
  CONSTRAINT recruitment_tasks_priority_check CHECK (priority IN ('low','normal','high','urgent')),
  CONSTRAINT recruitment_tasks_status_check CHECK (status IN ('pending','done','cancelled'))
);
CREATE INDEX idx_recruitment_tasks_due ON public.recruitment_tasks(due_date) WHERE status = 'pending';
CREATE INDEX idx_recruitment_tasks_prospect ON public.recruitment_tasks(prospect_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recruitment_tasks TO authenticated;
GRANT ALL ON public.recruitment_tasks TO service_role;
ALTER TABLE public.recruitment_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage tasks" ON public.recruitment_tasks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER trg_recruitment_tasks_updated BEFORE UPDATE ON public.recruitment_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- REFERRALS
CREATE TABLE public.recruitment_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_doctor_id uuid,
  referrer_name text,
  prospect_id uuid REFERENCES public.recruitment_prospects(id) ON DELETE SET NULL,
  prospect_name text,
  referral_date date NOT NULL DEFAULT (now()::date),
  status text NOT NULL DEFAULT 'new',
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recruitment_referrals_status_check CHECK (status IN ('new','contacted','converted','declined'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recruitment_referrals TO authenticated;
GRANT ALL ON public.recruitment_referrals TO service_role;
ALTER TABLE public.recruitment_referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage referrals" ON public.recruitment_referrals FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER trg_recruitment_referrals_updated BEFORE UPDATE ON public.recruitment_referrals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
