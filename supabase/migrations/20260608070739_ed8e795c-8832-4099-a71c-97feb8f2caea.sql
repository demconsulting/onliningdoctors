
-- 1) Enums
DO $$ BEGIN
  CREATE TYPE public.referral_reward_basis AS ENUM ('fixed_amount','pct_platform_fee','pct_consultation_fee','pct_net_revenue');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.referral_trigger_event AS ENUM ('signup','email_verified','identity_verified','first_consultation_completed','per_consultation');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Extend referral_reward_settings
ALTER TABLE public.referral_reward_settings
  ADD COLUMN IF NOT EXISTS reward_basis public.referral_reward_basis NOT NULL DEFAULT 'fixed_amount',
  ADD COLUMN IF NOT EXISTS reward_percentage numeric(6,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reward_duration_months integer,                  -- NULL = lifetime, 0 = one-off
  ADD COLUMN IF NOT EXISTS monthly_reward_cap numeric(12,2),                -- NULL = no cap
  ADD COLUMN IF NOT EXISTS lifetime_reward_cap numeric(12,2),               -- NULL = no cap
  ADD COLUMN IF NOT EXISTS trigger_event public.referral_trigger_event NOT NULL DEFAULT 'first_consultation_completed',
  ADD COLUMN IF NOT EXISTS verification_requirements jsonb NOT NULL DEFAULT
    jsonb_build_object('email',true,'phone',true,'id',true,'hpcsa',true);

-- 3) Audit trail
CREATE TABLE IF NOT EXISTS public.referral_reward_calculations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id uuid REFERENCES public.referrals(id) ON DELETE CASCADE,
  referrer_id uuid NOT NULL,
  appointment_id uuid,
  setting_id uuid REFERENCES public.referral_reward_settings(id) ON DELETE SET NULL,
  trigger_event public.referral_trigger_event NOT NULL,
  basis public.referral_reward_basis NOT NULL,
  percentage numeric(6,3) NOT NULL DEFAULT 0,
  fixed_amount numeric(12,2) NOT NULL DEFAULT 0,
  basis_value numeric(12,2) NOT NULL DEFAULT 0,
  computed_amount numeric(12,2) NOT NULL DEFAULT 0,
  applied_amount numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'ZAR',
  monthly_cap numeric(12,2),
  lifetime_cap numeric(12,2),
  monthly_used numeric(12,2) NOT NULL DEFAULT 0,
  lifetime_used numeric(12,2) NOT NULL DEFAULT 0,
  decision text NOT NULL,
  reason text,
  ledger_id uuid REFERENCES public.referral_rewards_ledger(id) ON DELETE SET NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.referral_reward_calculations TO authenticated;
GRANT ALL ON public.referral_reward_calculations TO service_role;
ALTER TABLE public.referral_reward_calculations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Referrer can see own reward calculations" ON public.referral_reward_calculations;
CREATE POLICY "Referrer can see own reward calculations"
  ON public.referral_reward_calculations FOR SELECT TO authenticated
  USING (referrer_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_rrc_referrer ON public.referral_reward_calculations (referrer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rrc_referral ON public.referral_reward_calculations (referral_id);

-- 4) Helper: resolve effective settings for a referral
CREATE OR REPLACE FUNCTION public.resolve_referral_reward_setting(_referrer_type public.referral_user_type, _referred_type public.referral_user_type, _country text)
RETURNS public.referral_reward_settings
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v public.referral_reward_settings%ROWTYPE;
BEGIN
  SELECT * INTO v FROM public.referral_reward_settings
   WHERE referrer_type=_referrer_type AND referred_type=_referred_type
     AND country=COALESCE(_country,'ZA') AND is_enabled=true LIMIT 1;
  IF NOT FOUND THEN
    SELECT * INTO v FROM public.referral_reward_settings
     WHERE referrer_type=_referrer_type AND referred_type=_referred_type
       AND country='ZA' AND is_enabled=true LIMIT 1;
  END IF;
  RETURN v;
END $$;

-- 5) Compute helper (pure)
CREATE OR REPLACE FUNCTION public.compute_referral_reward_amount(_basis public.referral_reward_basis, _percentage numeric, _fixed numeric, _basis_value numeric)
RETURNS numeric
LANGUAGE sql IMMUTABLE SET search_path TO 'public'
AS $$
  SELECT CASE _basis
    WHEN 'fixed_amount' THEN COALESCE(_fixed,0)
    ELSE round(COALESCE(_basis_value,0) * COALESCE(_percentage,0) / 100.0, 2)
  END
$$;

-- 6) Upgraded eligibility evaluator
CREATE OR REPLACE FUNCTION public.evaluate_referral_eligibility(_referred_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_ref public.referrals%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
  v_doctor public.doctors%ROWTYPE;
  v_email_verified boolean;
  v_first_consult timestamptz;
  v_settings public.referral_reward_settings%ROWTYPE;
  v_referrer_country text;
  v_reqs jsonb;
  v_amount numeric := 0;
  v_ledger_id uuid;
  v_decision text;
  v_reason text;
BEGIN
  SELECT * INTO v_ref FROM public.referrals WHERE referred_id=_referred_id;
  IF NOT FOUND OR v_ref.status IN ('rejected','fraud_detected') THEN RETURN; END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id=_referred_id;
  SELECT (email_confirmed_at IS NOT NULL) INTO v_email_verified FROM auth.users WHERE id=_referred_id;

  SELECT country INTO v_referrer_country FROM public.profiles WHERE id=v_ref.referrer_id;
  v_settings := public.resolve_referral_reward_setting(v_ref.referrer_type, v_ref.referred_type, COALESCE(v_referrer_country,'ZA'));
  v_reqs := COALESCE(v_settings.verification_requirements, jsonb_build_object('email',true,'phone',true,'id',true,'hpcsa',true));

  -- Verification checks
  IF COALESCE((v_reqs->>'email')::boolean,true) AND NOT COALESCE(v_email_verified,false) THEN RETURN; END IF;
  IF COALESCE((v_reqs->>'phone')::boolean,true) AND (v_profile.phone IS NULL OR length(v_profile.phone)<6) THEN RETURN; END IF;
  IF COALESCE((v_reqs->>'id')::boolean,true) AND v_profile.id_number_hash IS NULL THEN RETURN; END IF;
  IF v_ref.referred_type='doctor' THEN
    SELECT * INTO v_doctor FROM public.doctors WHERE profile_id=_referred_id;
    IF COALESCE((v_reqs->>'hpcsa')::boolean,true) THEN
      IF NOT FOUND OR NOT v_doctor.is_verified OR COALESCE(v_doctor.license_number,'')='' OR v_doctor.specialty_id IS NULL THEN RETURN; END IF;
    END IF;
  END IF;

  IF v_ref.verification_date IS NULL THEN
    UPDATE public.referrals SET verification_date=now() WHERE id=v_ref.id;
    v_ref.verification_date := now();
  END IF;

  -- Trigger-event gating
  IF v_settings.id IS NULL THEN RETURN; END IF;

  IF v_settings.trigger_event = 'signup' THEN
    -- always ok
    NULL;
  ELSIF v_settings.trigger_event = 'email_verified' THEN
    IF NOT COALESCE(v_email_verified,false) THEN RETURN; END IF;
  ELSIF v_settings.trigger_event = 'identity_verified' THEN
    IF v_profile.id_number_hash IS NULL THEN RETURN; END IF;
  ELSIF v_settings.trigger_event IN ('first_consultation_completed','per_consultation') THEN
    SELECT min(a.scheduled_at) INTO v_first_consult FROM public.appointments a
     WHERE a.status='completed' AND (a.patient_id=_referred_id OR a.doctor_id=_referred_id);
    IF v_first_consult IS NULL THEN RETURN; END IF;
    UPDATE public.referrals SET first_consultation_date=v_first_consult WHERE id=v_ref.id AND first_consultation_date IS NULL;
  END IF;

  -- Move into eligible if not already there (per_consultation also tracked further by the appt trigger)
  IF v_ref.status IN ('pending_signup','pending_verification','pending_first_consult') THEN
    UPDATE public.referrals SET status='eligible',
      reward_type=COALESCE(v_settings.reward_type,'wallet_credit'::public.referral_reward_type),
      reward_currency=COALESCE(v_settings.currency,'ZAR')
     WHERE id=v_ref.id;
  END IF;

  -- For non-per_consultation: create the (single) ledger entry if absent
  IF v_settings.trigger_event <> 'per_consultation' THEN
    IF EXISTS (SELECT 1 FROM public.referral_rewards_ledger WHERE referral_id=v_ref.id) THEN RETURN; END IF;

    v_amount := public.compute_referral_reward_amount(v_settings.reward_basis, v_settings.reward_percentage, v_settings.amount, 0);
    -- For non-fixed basis without a transactional context, we cannot compute % here — fall back to fixed_amount column
    IF v_settings.reward_basis <> 'fixed_amount' AND v_amount = 0 THEN
      v_amount := COALESCE(v_settings.amount,0);
    END IF;

    IF v_amount > 0 THEN
      INSERT INTO public.referral_rewards_ledger (user_id, referral_id, amount, currency, entry_type, status, notes)
      VALUES (v_ref.referrer_id, v_ref.id, v_amount, COALESCE(v_settings.currency,'ZAR'),'credit','pending',
              'Referral reward (' || v_settings.trigger_event::text || ')')
      RETURNING id INTO v_ledger_id;
      v_decision := 'credited';
    ELSE
      v_decision := 'zero_amount';
    END IF;

    UPDATE public.referrals SET reward_amount=v_amount WHERE id=v_ref.id;

    INSERT INTO public.referral_reward_calculations
      (referral_id, referrer_id, setting_id, trigger_event, basis, percentage, fixed_amount,
       basis_value, computed_amount, applied_amount, currency, decision, ledger_id, details)
    VALUES
      (v_ref.id, v_ref.referrer_id, v_settings.id, v_settings.trigger_event, v_settings.reward_basis,
       v_settings.reward_percentage, v_settings.amount, 0, v_amount, v_amount,
       COALESCE(v_settings.currency,'ZAR'), v_decision, v_ledger_id,
       jsonb_build_object('referred_id', _referred_id));

    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (v_ref.referrer_id, 'Referral Reward Eligible',
            'A referral reward was calculated and is pending approval.', 'success','/dashboard');
  END IF;
END $$;

-- 7) Per-consultation reward
CREATE OR REPLACE FUNCTION public.process_consultation_referral_reward(_appointment_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_appt public.appointments%ROWTYPE;
  v_pay public.payments%ROWTYPE;
  side_user_id uuid;
  v_ref public.referrals%ROWTYPE;
  v_settings public.referral_reward_settings%ROWTYPE;
  v_referrer_country text;
  v_basis_value numeric;
  v_amount numeric;
  v_currency text;
  v_month_start timestamptz := date_trunc('month', now());
  v_monthly_used numeric; v_lifetime_used numeric;
  v_ledger_id uuid; v_decision text; v_reason text;
  v_within_window boolean;
BEGIN
  SELECT * INTO v_appt FROM public.appointments WHERE id=_appointment_id;
  IF NOT FOUND OR v_appt.status <> 'completed' THEN RETURN; END IF;

  SELECT * INTO v_pay FROM public.payments
   WHERE appointment_id=_appointment_id AND status='paid'
   ORDER BY paid_at DESC NULLS LAST LIMIT 1;

  -- Evaluate both sides
  FOREACH side_user_id IN ARRAY ARRAY[v_appt.patient_id, v_appt.doctor_id] LOOP
    IF side_user_id IS NULL THEN CONTINUE; END IF;
    SELECT * INTO v_ref FROM public.referrals WHERE referred_id=side_user_id;
    IF NOT FOUND OR v_ref.status IN ('rejected','fraud_detected') THEN CONTINUE; END IF;

    SELECT country INTO v_referrer_country FROM public.profiles WHERE id=v_ref.referrer_id;
    v_settings := public.resolve_referral_reward_setting(v_ref.referrer_type, v_ref.referred_type, COALESCE(v_referrer_country,'ZA'));
    IF v_settings.id IS NULL OR v_settings.trigger_event <> 'per_consultation' THEN CONTINUE; END IF;

    -- Ensure eligibility flagged
    PERFORM public.evaluate_referral_eligibility(side_user_id);
    SELECT * INTO v_ref FROM public.referrals WHERE id=v_ref.id;
    IF v_ref.status NOT IN ('eligible','approved','paid') THEN CONTINUE; END IF;

    -- Duration check (months since first_consultation_date)
    v_within_window := v_settings.reward_duration_months IS NULL
                       OR v_settings.reward_duration_months <= 0
                       OR (v_ref.first_consultation_date IS NOT NULL
                           AND v_ref.first_consultation_date >= now() - (v_settings.reward_duration_months || ' months')::interval);
    IF NOT v_within_window THEN
      INSERT INTO public.referral_reward_calculations
        (referral_id, referrer_id, appointment_id, setting_id, trigger_event, basis, percentage, fixed_amount,
         basis_value, computed_amount, applied_amount, currency, decision, reason)
      VALUES (v_ref.id, v_ref.referrer_id, _appointment_id, v_settings.id, v_settings.trigger_event,
              v_settings.reward_basis, v_settings.reward_percentage, v_settings.amount,
              0, 0, 0, COALESCE(v_settings.currency,'ZAR'),'skipped_out_of_window',
              'duration window expired');
      CONTINUE;
    END IF;

    -- Basis value
    v_basis_value := CASE v_settings.reward_basis
      WHEN 'fixed_amount' THEN 0
      WHEN 'pct_consultation_fee' THEN COALESCE(v_pay.amount, 0)
      WHEN 'pct_platform_fee' THEN COALESCE(v_pay.fee_amount, 0)
      WHEN 'pct_net_revenue' THEN COALESCE(v_pay.amount, 0) - COALESCE(v_pay.fee_amount, 0)
    END;
    v_currency := COALESCE(v_pay.currency, v_settings.currency, 'ZAR');
    v_amount := public.compute_referral_reward_amount(v_settings.reward_basis, v_settings.reward_percentage, v_settings.amount, v_basis_value);

    -- Caps
    SELECT COALESCE(sum(applied_amount),0) INTO v_monthly_used
      FROM public.referral_reward_calculations
      WHERE referrer_id=v_ref.referrer_id AND created_at >= v_month_start AND decision IN ('credited','partial');
    SELECT COALESCE(sum(applied_amount),0) INTO v_lifetime_used
      FROM public.referral_reward_calculations
      WHERE referrer_id=v_ref.referrer_id AND decision IN ('credited','partial');

    v_decision := 'credited'; v_reason := NULL;
    IF v_settings.monthly_reward_cap IS NOT NULL THEN
      IF v_monthly_used >= v_settings.monthly_reward_cap THEN
        v_amount := 0; v_decision := 'capped_monthly'; v_reason := 'Monthly cap reached';
      ELSIF v_monthly_used + v_amount > v_settings.monthly_reward_cap THEN
        v_amount := round(v_settings.monthly_reward_cap - v_monthly_used, 2); v_decision := 'partial'; v_reason := 'Monthly cap';
      END IF;
    END IF;
    IF v_amount > 0 AND v_settings.lifetime_reward_cap IS NOT NULL THEN
      IF v_lifetime_used >= v_settings.lifetime_reward_cap THEN
        v_amount := 0; v_decision := 'capped_lifetime'; v_reason := 'Lifetime cap reached';
      ELSIF v_lifetime_used + v_amount > v_settings.lifetime_reward_cap THEN
        v_amount := round(v_settings.lifetime_reward_cap - v_lifetime_used, 2); v_decision := 'partial'; v_reason := COALESCE(v_reason,'')||' Lifetime cap';
      END IF;
    END IF;
    IF v_amount <= 0 AND v_decision = 'credited' THEN v_decision := 'zero_amount'; END IF;

    -- Write ledger only if positive amount
    IF v_amount > 0 THEN
      INSERT INTO public.referral_rewards_ledger (user_id, referral_id, amount, currency, entry_type, status, notes)
      VALUES (v_ref.referrer_id, v_ref.id, v_amount, v_currency,'credit',
              CASE WHEN COALESCE((SELECT manual_reward_approval FROM public.referral_program_settings LIMIT 1), true) THEN 'pending' ELSE 'approved' END,
              'Per-consultation reward (appt '||_appointment_id::text||')')
      RETURNING id INTO v_ledger_id;
    END IF;

    INSERT INTO public.referral_reward_calculations
      (referral_id, referrer_id, appointment_id, setting_id, trigger_event, basis, percentage, fixed_amount,
       basis_value, computed_amount, applied_amount, currency, monthly_cap, lifetime_cap,
       monthly_used, lifetime_used, decision, reason, ledger_id)
    VALUES (v_ref.id, v_ref.referrer_id, _appointment_id, v_settings.id, v_settings.trigger_event,
            v_settings.reward_basis, v_settings.reward_percentage, v_settings.amount,
            v_basis_value, public.compute_referral_reward_amount(v_settings.reward_basis, v_settings.reward_percentage, v_settings.amount, v_basis_value),
            v_amount, v_currency, v_settings.monthly_reward_cap, v_settings.lifetime_reward_cap,
            v_monthly_used, v_lifetime_used, v_decision, v_reason, v_ledger_id);
  END LOOP;
END $$;

-- 8) Extend appointment trigger to also call per-consultation processor
CREATE OR REPLACE FUNCTION public.referral_appt_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF (TG_OP='UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status='completed')
     OR (TG_OP='INSERT' AND NEW.status='completed') THEN
    PERFORM public.evaluate_referral_eligibility(NEW.patient_id);
    PERFORM public.evaluate_referral_eligibility(NEW.doctor_id);
    PERFORM public.process_consultation_referral_reward(NEW.id);
  END IF;
  RETURN NEW;
END $$;

-- 9) Analytics: top doctors and top patients
CREATE OR REPLACE FUNCTION public.admin_top_referrers_by_type(_role public.referral_user_type, _limit integer DEFAULT 20)
RETURNS TABLE(user_id uuid, full_name text, email text, total bigint, approved bigint, paid bigint, total_earned numeric, lifetime_value numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  RETURN QUERY
  SELECT r.referrer_id,
         COALESCE(p.full_name,p.email,''), p.email,
         count(*)::bigint,
         count(*) FILTER (WHERE r.status IN ('approved','paid'))::bigint,
         count(*) FILTER (WHERE r.status='paid')::bigint,
         COALESCE((SELECT sum(amount) FROM public.referral_rewards_ledger l WHERE l.user_id=r.referrer_id AND l.status IN ('paid','approved')),0),
         COALESCE((SELECT sum(py.amount) FROM public.payments py
                    JOIN public.referrals rr ON rr.referred_id IN (py.patient_id, py.doctor_id)
                    WHERE rr.referrer_id=r.referrer_id AND py.status='paid'),0)
  FROM public.referrals r LEFT JOIN public.profiles p ON p.id=r.referrer_id
  WHERE r.referrer_type=_role
  GROUP BY r.referrer_id, p.full_name, p.email
  ORDER BY count(*) DESC LIMIT _limit;
END $$;

-- 10) Per-referrer lifetime value
CREATE OR REPLACE FUNCTION public.admin_referrer_lifetime_value(_referrer_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v jsonb;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin'::app_role) OR auth.uid()=_referrer_id) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT jsonb_build_object(
    'total_referrals', (SELECT count(*) FROM public.referrals WHERE referrer_id=_referrer_id),
    'completed_referrals', (SELECT count(*) FROM public.referrals WHERE referrer_id=_referrer_id AND status IN ('eligible','approved','paid')),
    'consultations_generated', COALESCE((SELECT count(*) FROM public.appointments a
        JOIN public.referrals r ON r.referred_id IN (a.patient_id, a.doctor_id)
        WHERE r.referrer_id=_referrer_id AND a.status='completed'),0),
    'gross_revenue_generated', COALESCE((SELECT sum(py.amount) FROM public.payments py
        JOIN public.referrals r ON r.referred_id IN (py.patient_id, py.doctor_id)
        WHERE r.referrer_id=_referrer_id AND py.status='paid'),0),
    'platform_fees_generated', COALESCE((SELECT sum(py.fee_amount) FROM public.payments py
        JOIN public.referrals r ON r.referred_id IN (py.patient_id, py.doctor_id)
        WHERE r.referrer_id=_referrer_id AND py.status='paid'),0),
    'rewards_pending', COALESCE((SELECT sum(amount) FROM public.referral_rewards_ledger
        WHERE user_id=_referrer_id AND status='pending'),0),
    'rewards_approved', COALESCE((SELECT sum(amount) FROM public.referral_rewards_ledger
        WHERE user_id=_referrer_id AND status='approved'),0),
    'rewards_paid', COALESCE((SELECT sum(amount) FROM public.referral_rewards_ledger
        WHERE user_id=_referrer_id AND status='paid'),0)
  ) INTO v;
  RETURN v;
END $$;
