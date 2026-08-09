-- 1. Programme config
ALTER TABLE public.founding_doctor_program
  ADD COLUMN IF NOT EXISTS pioneer_limit integer NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS founding_limit integer NOT NULL DEFAULT 80,
  ADD COLUMN IF NOT EXISTS programme_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_close_pioneer boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_close_founding boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS waiting_list_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS marketing_headline text DEFAULT 'Become a Founding Doctor',
  ADD COLUMN IF NOT EXISTS marketing_description text DEFAULT 'Join the first 100 doctors shaping digital healthcare in South Africa.',
  ADD COLUMN IF NOT EXISTS pioneer_copy text DEFAULT 'Our first 20 doctors receive Pioneer Founding Doctor status with lifetime locked-in benefits.',
  ADD COLUMN IF NOT EXISTS founding_copy text DEFAULT 'Doctors 21 to 100 join as Founding Doctors with preferential pricing.';

INSERT INTO public.founding_doctor_program (max_slots, program_label, applications_open)
SELECT 100, 'Founding Doctor Programme', true
WHERE NOT EXISTS (SELECT 1 FROM public.founding_doctor_program);

-- 2. Pricing
CREATE TABLE IF NOT EXISTS public.founding_programme_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pioneer_setup_fee numeric NOT NULL DEFAULT 750,
  founding_setup_fee numeric NOT NULL DEFAULT 750,
  standard_setup_fee numeric NOT NULL DEFAULT 7997,
  monthly_care_plan numeric NOT NULL DEFAULT 250,
  vat_enabled boolean NOT NULL DEFAULT false,
  vat_rate numeric NOT NULL DEFAULT 15,
  currency text NOT NULL DEFAULT 'ZAR',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.founding_programme_pricing TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.founding_programme_pricing TO authenticated;
GRANT ALL ON public.founding_programme_pricing TO service_role;
ALTER TABLE public.founding_programme_pricing ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read programme pricing" ON public.founding_programme_pricing;
CREATE POLICY "Anyone can read programme pricing" ON public.founding_programme_pricing FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage programme pricing" ON public.founding_programme_pricing;
CREATE POLICY "Admins manage programme pricing" ON public.founding_programme_pricing FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'platform_admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'platform_admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER founding_programme_pricing_updated_at BEFORE UPDATE ON public.founding_programme_pricing
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.founding_programme_pricing DEFAULT VALUES;

-- 3. Exit policy
CREATE TABLE IF NOT EXISTS public.founding_exit_policy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commitment_months integer NOT NULL DEFAULT 36,
  standard_practice_value numeric NOT NULL DEFAULT 7997,
  founding_contribution numeric NOT NULL DEFAULT 750,
  policy_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.founding_exit_policy TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.founding_exit_policy TO authenticated;
GRANT ALL ON public.founding_exit_policy TO service_role;
ALTER TABLE public.founding_exit_policy ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read exit policy" ON public.founding_exit_policy;
CREATE POLICY "Anyone can read exit policy" ON public.founding_exit_policy FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage exit policy" ON public.founding_exit_policy;
CREATE POLICY "Admins manage exit policy" ON public.founding_exit_policy FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'platform_admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'platform_admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER founding_exit_policy_updated_at BEFORE UPDATE ON public.founding_exit_policy
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.founding_exit_policy DEFAULT VALUES;

-- 4. Doctor tier + recruitment source
ALTER TABLE public.doctors
  ADD COLUMN IF NOT EXISTS founding_tier text NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS founding_sequence integer,
  ADD COLUMN IF NOT EXISTS recruitment_source text,
  ADD COLUMN IF NOT EXISTS assigned_business_developer uuid;

CREATE OR REPLACE FUNCTION public.assign_founding_tier()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _pioneer int;
  _founding int;
  _seq int;
BEGIN
  IF NEW.is_founding_doctor AND (NEW.founding_sequence IS NULL) THEN
    SELECT COALESCE(pioneer_limit,20), COALESCE(founding_limit,80)
      INTO _pioneer, _founding FROM public.founding_doctor_program LIMIT 1;
    _pioneer := COALESCE(_pioneer,20);
    _founding := COALESCE(_founding,80);
    SELECT COALESCE(MAX(founding_sequence),0) + 1 INTO _seq FROM public.doctors;
    NEW.founding_sequence := _seq;
    NEW.founding_tier := CASE
      WHEN _seq <= _pioneer THEN 'pioneer'
      WHEN _seq <= (_pioneer + _founding) THEN 'founding'
      ELSE 'standard' END;
  ELSIF NEW.is_founding_doctor = false THEN
    NEW.founding_tier := 'standard';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS doctors_assign_founding_tier ON public.doctors;
CREATE TRIGGER doctors_assign_founding_tier BEFORE INSERT OR UPDATE OF is_founding_doctor ON public.doctors
  FOR EACH ROW EXECUTE FUNCTION public.assign_founding_tier();

-- Backfill existing founding doctors by join date
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY COALESCE(founding_doctor_since, created_at)) rn
  FROM public.doctors WHERE is_founding_doctor = true
), lim AS (
  SELECT COALESCE(pioneer_limit,20) p, COALESCE(founding_limit,80) f FROM public.founding_doctor_program LIMIT 1
)
UPDATE public.doctors d SET founding_sequence = r.rn,
  founding_tier = CASE WHEN r.rn <= lim.p THEN 'pioneer' WHEN r.rn <= lim.p + lim.f THEN 'founding' ELSE 'standard' END
FROM ranked r, lim WHERE d.id = r.id;

-- 5. Digital practice services
CREATE TABLE IF NOT EXISTS public.doctor_digital_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_profile_id uuid NOT NULL,
  service_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (doctor_profile_id, service_type)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.doctor_digital_services TO authenticated;
GRANT ALL ON public.doctor_digital_services TO service_role;
ALTER TABLE public.doctor_digital_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Doctors read own digital services" ON public.doctor_digital_services FOR SELECT TO authenticated
  USING (doctor_profile_id = auth.uid());
CREATE POLICY "Admins manage digital services" ON public.doctor_digital_services FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'platform_admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'platform_admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER doctor_digital_services_updated_at BEFORE UPDATE ON public.doctor_digital_services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. CRM prospect enhancements
ALTER TABLE public.recruitment_prospects
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS lead_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS business_developer uuid;

-- 7. Commissions
CREATE TABLE IF NOT EXISTS public.recruitment_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid REFERENCES public.recruitment_prospects(id) ON DELETE CASCADE,
  doctor_profile_id uuid,
  business_developer uuid,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  payment_date date,
  payment_reference text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recruitment_commissions TO authenticated;
GRANT ALL ON public.recruitment_commissions TO service_role;
ALTER TABLE public.recruitment_commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage commissions" ON public.recruitment_commissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'platform_admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'platform_admin') OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "Business developers read own commissions" ON public.recruitment_commissions FOR SELECT TO authenticated
  USING (business_developer = auth.uid());
CREATE TRIGGER recruitment_commissions_updated_at BEFORE UPDATE ON public.recruitment_commissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Activity timeline
CREATE TABLE IF NOT EXISTS public.recruitment_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid REFERENCES public.recruitment_prospects(id) ON DELETE CASCADE,
  doctor_profile_id uuid,
  activity_type text NOT NULL,
  description text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.recruitment_activities TO authenticated;
GRANT ALL ON public.recruitment_activities TO service_role;
ALTER TABLE public.recruitment_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage recruitment activities" ON public.recruitment_activities FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'platform_admin') OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'platform_admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE OR REPLACE FUNCTION public.log_prospect_stage_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.recruitment_activities (prospect_id, activity_type, description, created_by)
    VALUES (NEW.id, 'lead_created', 'Lead created', NEW.created_by);
  ELSIF NEW.stage IS DISTINCT FROM OLD.stage THEN
    INSERT INTO public.recruitment_activities (prospect_id, activity_type, description, created_by)
    VALUES (NEW.id, 'stage_changed', 'Stage changed from ' || COALESCE(OLD.stage,'-') || ' to ' || COALESCE(NEW.stage,'-'), auth.uid());
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS recruitment_prospects_activity ON public.recruitment_prospects;
CREATE TRIGGER recruitment_prospects_activity AFTER INSERT OR UPDATE OF stage ON public.recruitment_prospects
  FOR EACH ROW EXECUTE FUNCTION public.log_prospect_stage_change();

-- 9. Slots RPC with tier breakdown
CREATE OR REPLACE FUNCTION public.get_founding_slots()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'max_slots', COALESCE(p.pioneer_limit,20) + COALESCE(p.founding_limit,80),
    'pioneer_limit', COALESCE(p.pioneer_limit,20),
    'founding_limit', COALESCE(p.founding_limit,80),
    'pioneer_filled', (SELECT count(*) FROM public.doctors WHERE is_founding_doctor AND founding_tier='pioneer'),
    'founding_filled', (SELECT count(*) FROM public.doctors WHERE is_founding_doctor AND founding_tier='founding'),
    'approved_count', (SELECT count(*) FROM public.doctors WHERE is_founding_doctor),
    'remaining', GREATEST(COALESCE(p.pioneer_limit,20) + COALESCE(p.founding_limit,80) - (SELECT count(*) FROM public.doctors WHERE is_founding_doctor), 0),
    'applications_open', COALESCE(p.applications_open,false) AND COALESCE(p.programme_enabled,true)
  )
  FROM public.founding_doctor_program p LIMIT 1;
$$;