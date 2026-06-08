
-- ENUMS
DO $$ BEGIN CREATE TYPE public.referral_user_type AS ENUM ('doctor','patient'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.referral_status AS ENUM ('pending_signup','pending_verification','pending_first_consult','eligible','approved','rejected','fraud_detected','paid'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.referral_reward_type AS ENUM ('wallet_credit','cash','voucher','promo_credit'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.referral_ledger_type AS ENUM ('credit','debit','payout','reversal'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.referral_ledger_status AS ENUM ('pending','approved','paid','reversed','rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.referral_flag_type AS ENUM ('self_referral','duplicate_email','duplicate_phone','duplicate_id','same_ip','same_device','same_card','pattern'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.referral_flag_severity AS ENUM ('block','review'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- referral_codes
CREATE TABLE IF NOT EXISTS public.referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  code text NOT NULL UNIQUE,
  user_type public.referral_user_type NOT NULL DEFAULT 'patient',
  total_clicks integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.referral_codes TO anon;
GRANT SELECT, INSERT, UPDATE ON public.referral_codes TO authenticated;
GRANT ALL ON public.referral_codes TO service_role;
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read their own code" ON public.referral_codes FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Public resolves any code" ON public.referral_codes FOR SELECT TO anon USING (true);
CREATE POLICY "Admins manage codes" ON public.referral_codes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

-- referrals
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referrer_type public.referral_user_type NOT NULL,
  referred_id uuid UNIQUE,
  referred_email text,
  referred_type public.referral_user_type,
  code_used text NOT NULL,
  signup_ip text,
  signup_user_agent text,
  device_fingerprint text,
  status public.referral_status NOT NULL DEFAULT 'pending_signup',
  registration_date timestamptz,
  verification_date timestamptz,
  first_consultation_date timestamptz,
  total_consultations integer NOT NULL DEFAULT 0,
  reward_amount numeric(12,2),
  reward_type public.referral_reward_type,
  reward_currency text,
  reward_approved_at timestamptz,
  reward_approved_by uuid,
  reward_paid_at timestamptz,
  flagged_reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON public.referrals(status);
GRANT SELECT, INSERT, UPDATE ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Referrer reads referrals" ON public.referrals FOR SELECT TO authenticated USING (referrer_id = auth.uid() OR referred_id = auth.uid());
CREATE POLICY "Admins read referrals" ON public.referrals FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins update referrals" ON public.referrals FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

-- reward settings
CREATE TABLE IF NOT EXISTS public.referral_reward_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_type public.referral_user_type NOT NULL,
  referred_type public.referral_user_type NOT NULL,
  country text NOT NULL DEFAULT 'ZA',
  reward_type public.referral_reward_type NOT NULL DEFAULT 'wallet_credit',
  amount numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'ZAR',
  is_enabled boolean NOT NULL DEFAULT false,
  requires_admin_approval boolean NOT NULL DEFAULT true,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (referrer_type, referred_type, country)
);
GRANT SELECT ON public.referral_reward_settings TO authenticated;
GRANT ALL ON public.referral_reward_settings TO service_role;
ALTER TABLE public.referral_reward_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read reward settings" ON public.referral_reward_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage reward settings" ON public.referral_reward_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

-- ledger
CREATE TABLE IF NOT EXISTS public.referral_rewards_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  referral_id uuid REFERENCES public.referrals(id) ON DELETE SET NULL,
  amount numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'ZAR',
  entry_type public.referral_ledger_type NOT NULL DEFAULT 'credit',
  status public.referral_ledger_status NOT NULL DEFAULT 'pending',
  payout_method text,
  payout_reference text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ledger_user ON public.referral_rewards_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_ledger_status ON public.referral_rewards_ledger(status);
GRANT SELECT ON public.referral_rewards_ledger TO authenticated;
GRANT ALL ON public.referral_rewards_ledger TO service_role;
ALTER TABLE public.referral_rewards_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User reads own ledger" ON public.referral_rewards_ledger FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins manage ledger" ON public.referral_rewards_ledger FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

-- fraud flags
CREATE TABLE IF NOT EXISTS public.referral_fraud_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id uuid NOT NULL REFERENCES public.referrals(id) ON DELETE CASCADE,
  flag_type public.referral_flag_type NOT NULL,
  severity public.referral_flag_severity NOT NULL DEFAULT 'review',
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  resolved boolean NOT NULL DEFAULT false,
  resolved_by uuid,
  resolved_at timestamptz,
  resolution_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.referral_fraud_flags TO authenticated;
GRANT ALL ON public.referral_fraud_flags TO service_role;
ALTER TABLE public.referral_fraud_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage fraud flags" ON public.referral_fraud_flags FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

-- clicks
CREATE TABLE IF NOT EXISTS public.referral_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  ip text,
  user_agent text,
  referer text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_referral_clicks_code ON public.referral_clicks(code);
GRANT INSERT ON public.referral_clicks TO anon, authenticated;
GRANT ALL ON public.referral_clicks TO service_role;
ALTER TABLE public.referral_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone records a click" ON public.referral_clicks FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins read clicks" ON public.referral_clicks FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role));

-- program settings (single row)
CREATE TABLE IF NOT EXISTS public.referral_program_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_enabled boolean NOT NULL DEFAULT true,
  identity_verification_required boolean NOT NULL DEFAULT true,
  manual_reward_approval boolean NOT NULL DEFAULT true,
  wallet_credits_enabled boolean NOT NULL DEFAULT true,
  fraud_detection_enabled boolean NOT NULL DEFAULT true,
  auto_cash_payouts boolean NOT NULL DEFAULT false,
  multi_level_enabled boolean NOT NULL DEFAULT false,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.referral_program_settings TO authenticated;
GRANT ALL ON public.referral_program_settings TO service_role;
ALTER TABLE public.referral_program_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read program settings" ON public.referral_program_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage program settings" ON public.referral_program_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

INSERT INTO public.referral_program_settings (id)
SELECT gen_random_uuid() WHERE NOT EXISTS (SELECT 1 FROM public.referral_program_settings);

INSERT INTO public.referral_reward_settings (referrer_type, referred_type, country, reward_type, amount, currency, is_enabled)
VALUES
  ('doctor','doctor','ZA','wallet_credit',0,'ZAR',false),
  ('doctor','patient','ZA','wallet_credit',0,'ZAR',false),
  ('patient','patient','ZA','wallet_credit',0,'ZAR',false),
  ('patient','doctor','ZA','wallet_credit',0,'ZAR',false)
ON CONFLICT DO NOTHING;

-- updated_at triggers
CREATE TRIGGER trg_referral_codes_updated BEFORE UPDATE ON public.referral_codes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_referrals_updated BEFORE UPDATE ON public.referrals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_reward_settings_updated BEFORE UPDATE ON public.referral_reward_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ledger_updated BEFORE UPDATE ON public.referral_rewards_ledger FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ FUNCTIONS ============

CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; candidate text; i int;
BEGIN
  LOOP
    candidate := '';
    FOR i IN 1..8 LOOP candidate := candidate || substr(alphabet, 1 + floor(random()*length(alphabet))::int, 1); END LOOP;
    IF NOT EXISTS (SELECT 1 FROM public.referral_codes WHERE code = candidate) THEN RETURN candidate; END IF;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.ensure_referral_code(_user_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_code text; v_type public.referral_user_type;
BEGIN
  SELECT code INTO v_code FROM public.referral_codes WHERE user_id = _user_id;
  IF v_code IS NOT NULL THEN RETURN v_code; END IF;
  v_type := CASE WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'doctor')
                 THEN 'doctor'::public.referral_user_type ELSE 'patient'::public.referral_user_type END;
  v_code := public.generate_referral_code();
  INSERT INTO public.referral_codes (user_id, code, user_type) VALUES (_user_id, v_code, v_type)
  ON CONFLICT (user_id) DO UPDATE SET code = public.referral_codes.code
  RETURNING code INTO v_code;
  RETURN v_code;
END $$;

CREATE OR REPLACE FUNCTION public.profiles_create_referral_code()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN PERFORM public.ensure_referral_code(NEW.id); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_profiles_referral_code ON public.profiles;
CREATE TRIGGER trg_profiles_referral_code AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.profiles_create_referral_code();

-- backfill
INSERT INTO public.referral_codes (user_id, code, user_type)
SELECT p.id, public.generate_referral_code(),
  CASE WHEN EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'doctor')
       THEN 'doctor'::public.referral_user_type ELSE 'patient'::public.referral_user_type END
FROM public.profiles p
LEFT JOIN public.referral_codes rc ON rc.user_id = p.id
WHERE rc.id IS NULL;

CREATE OR REPLACE FUNCTION public.attach_referral_on_signup(_code text, _ip text DEFAULT NULL, _ua text DEFAULT NULL, _fp text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_user uuid := auth.uid();
  v_code_owner uuid; v_code_user_type public.referral_user_type;
  v_self_email text; v_self_phone text; v_self_hash text;
  v_referral_id uuid; v_referred_type public.referral_user_type;
  v_flagged boolean := false; v_settings_enabled boolean;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF _code IS NULL OR length(trim(_code)) = 0 THEN RETURN NULL; END IF;
  SELECT tracking_enabled INTO v_settings_enabled FROM public.referral_program_settings LIMIT 1;
  IF NOT COALESCE(v_settings_enabled, true) THEN RETURN NULL; END IF;
  IF EXISTS (SELECT 1 FROM public.referrals WHERE referred_id = v_user) THEN RETURN NULL; END IF;

  SELECT user_id, user_type INTO v_code_owner, v_code_user_type FROM public.referral_codes WHERE code = upper(trim(_code));
  IF v_code_owner IS NULL THEN RETURN NULL; END IF;

  v_referred_type := CASE WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_user AND role = 'doctor')
                          THEN 'doctor'::public.referral_user_type ELSE 'patient'::public.referral_user_type END;
  SELECT email, phone, id_number_hash INTO v_self_email, v_self_phone, v_self_hash FROM public.profiles WHERE id = v_user;

  INSERT INTO public.referrals (referrer_id, referrer_type, referred_id, referred_email, referred_type, code_used, signup_ip, signup_user_agent, device_fingerprint, status, registration_date)
  VALUES (v_code_owner, v_code_user_type, v_user, v_self_email, v_referred_type, upper(trim(_code)), _ip, _ua, _fp, 'pending_verification', now())
  RETURNING id INTO v_referral_id;

  IF v_code_owner = v_user THEN
    INSERT INTO public.referral_fraud_flags (referral_id, flag_type, severity, details) VALUES (v_referral_id,'self_referral','block',jsonb_build_object('user_id',v_user));
    v_flagged := true;
  END IF;
  IF v_self_email IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles p JOIN public.referrals r ON r.referred_id=p.id WHERE p.email=v_self_email AND r.referred_id<>v_user) THEN
    INSERT INTO public.referral_fraud_flags (referral_id, flag_type, severity, details) VALUES (v_referral_id,'duplicate_email','block',jsonb_build_object('email',v_self_email));
    v_flagged := true;
  END IF;
  IF v_self_phone IS NOT NULL AND length(v_self_phone)>4 AND EXISTS (SELECT 1 FROM public.profiles p JOIN public.referrals r ON r.referred_id=p.id WHERE p.phone=v_self_phone AND r.referred_id<>v_user) THEN
    INSERT INTO public.referral_fraud_flags (referral_id, flag_type, severity, details) VALUES (v_referral_id,'duplicate_phone','block',jsonb_build_object('phone',v_self_phone));
    v_flagged := true;
  END IF;
  IF v_self_hash IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles p JOIN public.referrals r ON r.referred_id=p.id WHERE p.id_number_hash=v_self_hash AND r.referred_id<>v_user) THEN
    INSERT INTO public.referral_fraud_flags (referral_id, flag_type, severity, details) VALUES (v_referral_id,'duplicate_id','block',jsonb_build_object('hash',v_self_hash));
    v_flagged := true;
  END IF;
  IF _ip IS NOT NULL AND EXISTS (SELECT 1 FROM public.referrals WHERE signup_ip=_ip AND referred_id<>v_user) THEN
    INSERT INTO public.referral_fraud_flags (referral_id, flag_type, severity, details) VALUES (v_referral_id,'same_ip','review',jsonb_build_object('ip',_ip));
  END IF;
  IF _fp IS NOT NULL AND EXISTS (SELECT 1 FROM public.referrals WHERE device_fingerprint=_fp AND referred_id<>v_user) THEN
    INSERT INTO public.referral_fraud_flags (referral_id, flag_type, severity, details) VALUES (v_referral_id,'same_device','review',jsonb_build_object('fp',_fp));
  END IF;
  IF v_flagged THEN UPDATE public.referrals SET status='fraud_detected' WHERE id=v_referral_id; END IF;
  RETURN v_referral_id;
END $$;

CREATE OR REPLACE FUNCTION public.evaluate_referral_eligibility(_referred_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_ref public.referrals%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
  v_doctor public.doctors%ROWTYPE;
  v_email_verified boolean;
  v_first_consult timestamptz;
  v_settings public.referral_reward_settings%ROWTYPE;
  v_referrer_country text;
BEGIN
  SELECT * INTO v_ref FROM public.referrals WHERE referred_id=_referred_id;
  IF NOT FOUND OR v_ref.status NOT IN ('pending_verification','pending_first_consult') THEN RETURN; END IF;
  SELECT * INTO v_profile FROM public.profiles WHERE id=_referred_id;
  SELECT (email_confirmed_at IS NOT NULL) INTO v_email_verified FROM auth.users WHERE id=_referred_id;

  IF v_ref.referred_type='patient' THEN
    IF NOT COALESCE(v_email_verified,false) THEN RETURN; END IF;
    IF v_profile.phone IS NULL OR length(v_profile.phone)<6 THEN RETURN; END IF;
    IF v_profile.id_number_hash IS NULL THEN RETURN; END IF;
  ELSE
    SELECT * INTO v_doctor FROM public.doctors WHERE profile_id=_referred_id;
    IF NOT FOUND THEN RETURN; END IF;
    IF NOT COALESCE(v_email_verified,false) THEN RETURN; END IF;
    IF v_profile.phone IS NULL OR length(v_profile.phone)<6 THEN RETURN; END IF;
    IF v_profile.id_number_hash IS NULL THEN RETURN; END IF;
    IF NOT v_doctor.is_verified THEN RETURN; END IF;
    IF COALESCE(v_doctor.license_number,'')='' OR v_doctor.specialty_id IS NULL THEN RETURN; END IF;
  END IF;

  IF v_ref.verification_date IS NULL THEN
    UPDATE public.referrals SET verification_date=now(), status='pending_first_consult' WHERE id=v_ref.id;
  END IF;

  SELECT min(a.scheduled_at) INTO v_first_consult FROM public.appointments a
   WHERE a.status='completed' AND (a.patient_id=_referred_id OR a.doctor_id=_referred_id);
  IF v_first_consult IS NULL THEN RETURN; END IF;

  SELECT country INTO v_referrer_country FROM public.profiles WHERE id=v_ref.referrer_id;
  v_referrer_country := COALESCE(v_referrer_country,'ZA');

  SELECT * INTO v_settings FROM public.referral_reward_settings
   WHERE referrer_type=v_ref.referrer_type AND referred_type=v_ref.referred_type AND country=v_referrer_country AND is_enabled=true LIMIT 1;
  IF NOT FOUND THEN
    SELECT * INTO v_settings FROM public.referral_reward_settings
     WHERE referrer_type=v_ref.referrer_type AND referred_type=v_ref.referred_type AND country='ZA' AND is_enabled=true LIMIT 1;
  END IF;

  UPDATE public.referrals SET status='eligible', first_consultation_date=v_first_consult,
    reward_amount=COALESCE(v_settings.amount,0),
    reward_type=COALESCE(v_settings.reward_type,'wallet_credit'::public.referral_reward_type),
    reward_currency=COALESCE(v_settings.currency,'ZAR')
   WHERE id=v_ref.id;

  IF v_settings.id IS NOT NULL AND COALESCE(v_settings.amount,0)>0 THEN
    INSERT INTO public.referral_rewards_ledger (user_id, referral_id, amount, currency, entry_type, status, notes)
    VALUES (v_ref.referrer_id, v_ref.id, v_settings.amount, v_settings.currency, 'credit', 'pending', 'Referral reward pending admin approval');
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (v_ref.referrer_id, 'Referral Reward Eligible', 'Your referral just completed their first consultation. Your reward is pending admin approval.', 'success', '/dashboard');
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.referral_appt_trigger() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF (TG_OP='UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status='completed')
     OR (TG_OP='INSERT' AND NEW.status='completed') THEN
    PERFORM public.evaluate_referral_eligibility(NEW.patient_id);
    PERFORM public.evaluate_referral_eligibility(NEW.doctor_id);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_referral_appt ON public.appointments;
CREATE TRIGGER trg_referral_appt AFTER INSERT OR UPDATE OF status ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.referral_appt_trigger();

CREATE OR REPLACE FUNCTION public.referral_doctor_verified_trigger() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.is_verified AND OLD.is_verified IS DISTINCT FROM NEW.is_verified THEN
    PERFORM public.evaluate_referral_eligibility(NEW.profile_id);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_referral_doctor_verified ON public.doctors;
CREATE TRIGGER trg_referral_doctor_verified AFTER UPDATE OF is_verified ON public.doctors FOR EACH ROW EXECUTE FUNCTION public.referral_doctor_verified_trigger();

CREATE OR REPLACE FUNCTION public.admin_approve_referral_reward(_referral_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_ref public.referrals%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'Only admins'; END IF;
  SELECT * INTO v_ref FROM public.referrals WHERE id=_referral_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Referral not found'; END IF;
  IF v_ref.status<>'eligible' THEN RAISE EXCEPTION 'Referral not eligible'; END IF;
  UPDATE public.referrals SET status='approved', reward_approved_at=now(), reward_approved_by=auth.uid() WHERE id=_referral_id;
  IF v_ref.reward_type='wallet_credit' THEN
    UPDATE public.referral_rewards_ledger SET status='paid' WHERE referral_id=_referral_id AND status='pending';
    UPDATE public.referrals SET status='paid', reward_paid_at=now() WHERE id=_referral_id;
  ELSE
    UPDATE public.referral_rewards_ledger SET status='approved' WHERE referral_id=_referral_id AND status='pending';
  END IF;
  PERFORM public.log_audit_event_self('approve_referral_reward','referrals',jsonb_build_object('referral_id',_referral_id));
  INSERT INTO public.notifications (user_id,title,message,type,link)
  VALUES (v_ref.referrer_id,'Referral Reward Approved','Your referral reward has been approved.','success','/dashboard');
END $$;

CREATE OR REPLACE FUNCTION public.admin_reject_referral_reward(_referral_id uuid, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_ref public.referrals%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'Only admins'; END IF;
  SELECT * INTO v_ref FROM public.referrals WHERE id=_referral_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Referral not found'; END IF;
  UPDATE public.referrals SET status='rejected', admin_notes=_reason WHERE id=_referral_id;
  UPDATE public.referral_rewards_ledger SET status='rejected', notes=_reason WHERE referral_id=_referral_id AND status IN ('pending','approved');
  PERFORM public.log_audit_event_self('reject_referral_reward','referrals',jsonb_build_object('referral_id',_referral_id,'reason',_reason));
  INSERT INTO public.notifications (user_id,title,message,type,link)
  VALUES (v_ref.referrer_id,'Referral Reward Rejected','A referral reward was rejected. '||COALESCE('Reason: '||_reason,''),'warning','/dashboard');
END $$;

CREATE OR REPLACE FUNCTION public.admin_mark_payout_paid(_ledger_id uuid, _reference text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_l public.referral_rewards_ledger%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'Only admins'; END IF;
  SELECT * INTO v_l FROM public.referral_rewards_ledger WHERE id=_ledger_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ledger entry not found'; END IF;
  UPDATE public.referral_rewards_ledger SET status='paid', payout_reference=_reference, entry_type='payout' WHERE id=_ledger_id;
  IF v_l.referral_id IS NOT NULL THEN
    UPDATE public.referrals SET status='paid', reward_paid_at=now() WHERE id=v_l.referral_id;
  END IF;
  PERFORM public.log_audit_event_self('mark_payout_paid','referral_rewards_ledger',jsonb_build_object('ledger_id',_ledger_id,'reference',_reference));
END $$;

CREATE OR REPLACE FUNCTION public.get_user_referral_stats(_user_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_uid uuid := COALESCE(_user_id, auth.uid());
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF v_uid<>auth.uid() AND NOT public.has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  RETURN jsonb_build_object(
    'total', (SELECT count(*) FROM public.referrals WHERE referrer_id=v_uid),
    'pending', (SELECT count(*) FROM public.referrals WHERE referrer_id=v_uid AND status IN ('pending_signup','pending_verification','pending_first_consult')),
    'eligible', (SELECT count(*) FROM public.referrals WHERE referrer_id=v_uid AND status='eligible'),
    'approved', (SELECT count(*) FROM public.referrals WHERE referrer_id=v_uid AND status IN ('approved','paid')),
    'rejected', (SELECT count(*) FROM public.referrals WHERE referrer_id=v_uid AND status IN ('rejected','fraud_detected')),
    'earnings_pending', COALESCE((SELECT sum(amount) FROM public.referral_rewards_ledger WHERE user_id=v_uid AND status IN ('pending','approved')),0),
    'earnings_paid', COALESCE((SELECT sum(amount) FROM public.referral_rewards_ledger WHERE user_id=v_uid AND status='paid'),0),
    'currency', COALESCE((SELECT currency FROM public.referral_rewards_ledger WHERE user_id=v_uid ORDER BY created_at DESC LIMIT 1),'ZAR')
  );
END $$;

CREATE OR REPLACE FUNCTION public.admin_referral_overview()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  RETURN jsonb_build_object(
    'total_referrals',(SELECT count(*) FROM public.referrals),
    'doctor_referrals',(SELECT count(*) FROM public.referrals WHERE referrer_type='doctor'),
    'patient_referrals',(SELECT count(*) FROM public.referrals WHERE referrer_type='patient'),
    'conversion_pct',(SELECT CASE WHEN count(*)=0 THEN 0 ELSE round(100.0*count(*) FILTER (WHERE status IN ('eligible','approved','paid'))::numeric/count(*)::numeric,1) END FROM public.referrals),
    'pending_rewards',COALESCE((SELECT sum(amount) FROM public.referral_rewards_ledger WHERE status IN ('pending','approved')),0),
    'paid_rewards',COALESCE((SELECT sum(amount) FROM public.referral_rewards_ledger WHERE status='paid'),0),
    'fraud_flags',(SELECT count(*) FROM public.referral_fraud_flags WHERE resolved=false),
    'eligible_pending_approval',(SELECT count(*) FROM public.referrals WHERE status='eligible')
  );
END $$;

CREATE OR REPLACE FUNCTION public.admin_top_referrers(_limit integer DEFAULT 20)
RETURNS TABLE(user_id uuid, full_name text, user_type public.referral_user_type, total bigint, approved bigint, total_earned numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  RETURN QUERY
  SELECT r.referrer_id, COALESCE(p.full_name,p.email,''), r.referrer_type,
         count(*)::bigint, count(*) FILTER (WHERE r.status IN ('approved','paid'))::bigint,
         COALESCE((SELECT sum(amount) FROM public.referral_rewards_ledger l WHERE l.user_id=r.referrer_id AND l.status='paid'),0)
  FROM public.referrals r LEFT JOIN public.profiles p ON p.id=r.referrer_id
  GROUP BY r.referrer_id, p.full_name, p.email, r.referrer_type
  ORDER BY count(*) DESC LIMIT _limit;
END $$;
