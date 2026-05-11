
-- ============================================================
-- 1. Extend platform_fee_settings with founding flag
-- ============================================================
ALTER TABLE public.platform_fee_settings
  ADD COLUMN IF NOT EXISTS is_founding_plan boolean NOT NULL DEFAULT false;

-- ============================================================
-- 2. Extend doctors table with founding fields
-- ============================================================
ALTER TABLE public.doctors
  ADD COLUMN IF NOT EXISTS is_founding_doctor boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS founding_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS founding_doctor_since timestamptz,
  ADD COLUMN IF NOT EXISTS founding_expiry timestamptz,
  ADD COLUMN IF NOT EXISTS founding_pricing_plan_id uuid REFERENCES public.platform_fee_settings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS founding_locked boolean NOT NULL DEFAULT true;

-- ============================================================
-- 3. founding_doctor_program (singleton config)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.founding_doctor_program (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  max_slots integer NOT NULL DEFAULT 10,
  program_label text NOT NULL DEFAULT 'Founding Doctor 2026',
  applications_open boolean NOT NULL DEFAULT true,
  default_fee_settings_id uuid REFERENCES public.platform_fee_settings(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.founding_doctor_program ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view founding program"
  ON public.founding_doctor_program FOR SELECT TO public
  USING (true);

CREATE POLICY "Admins manage founding program"
  ON public.founding_doctor_program FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER founding_program_updated_at
  BEFORE UPDATE ON public.founding_doctor_program
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 4. founding_doctor_applications
-- ============================================================
CREATE TABLE IF NOT EXISTS public.founding_doctor_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  motivation text,
  years_experience integer,
  specialty text,
  availability text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT founding_status_check CHECK (status IN ('pending','approved','rejected','inactive','waitlist'))
);

CREATE UNIQUE INDEX IF NOT EXISTS founding_applications_one_active_per_doctor
  ON public.founding_doctor_applications(doctor_id)
  WHERE status IN ('pending','approved');

ALTER TABLE public.founding_doctor_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors can view own application"
  ON public.founding_doctor_applications FOR SELECT TO authenticated
  USING (doctor_id = auth.uid());

CREATE POLICY "Doctors can submit own application"
  ON public.founding_doctor_applications FOR INSERT TO authenticated
  WITH CHECK (doctor_id = auth.uid() AND public.has_role(auth.uid(), 'doctor'::app_role));

CREATE POLICY "Admins view all applications"
  ON public.founding_doctor_applications FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update applications"
  ON public.founding_doctor_applications FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete applications"
  ON public.founding_doctor_applications FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER founding_applications_updated_at
  BEFORE UPDATE ON public.founding_doctor_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 5. Slot counter RPC (public)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_founding_slots()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'approved_count', (SELECT count(*) FROM public.doctors WHERE is_founding_doctor = true AND founding_status = 'approved'),
    'max_slots', COALESCE((SELECT max_slots FROM public.founding_doctor_program LIMIT 1), 10),
    'remaining', GREATEST(
      COALESCE((SELECT max_slots FROM public.founding_doctor_program LIMIT 1), 10)
      - (SELECT count(*) FROM public.doctors WHERE is_founding_doctor = true AND founding_status = 'approved'),
      0
    ),
    'applications_open', COALESCE((SELECT applications_open FROM public.founding_doctor_program LIMIT 1), true)
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_founding_slots() TO anon, authenticated;

-- ============================================================
-- 6. Approval trigger — atomically enforces slot cap
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_founding_application_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_slots integer;
  v_approved_count integer;
  v_default_plan uuid;
  v_default_global_plan uuid;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN

    -- Approving
    IF NEW.status = 'approved' THEN
      SELECT max_slots, default_fee_settings_id INTO v_max_slots, v_default_plan
      FROM public.founding_doctor_program LIMIT 1;
      v_max_slots := COALESCE(v_max_slots, 10);

      SELECT count(*) INTO v_approved_count
      FROM public.doctors
      WHERE is_founding_doctor = true AND founding_status = 'approved';

      IF v_approved_count >= v_max_slots THEN
        RAISE EXCEPTION 'Founding doctor slot limit (%) reached', v_max_slots;
      END IF;

      UPDATE public.doctors
      SET is_founding_doctor = true,
          founding_status = 'approved',
          founding_doctor_since = COALESCE(founding_doctor_since, now()),
          founding_pricing_plan_id = COALESCE(founding_pricing_plan_id, v_default_plan),
          fee_settings_id = COALESCE(v_default_plan, fee_settings_id),
          founding_locked = true
      WHERE profile_id = NEW.doctor_id;

      NEW.reviewed_at := now();
      NEW.reviewed_by := COALESCE(NEW.reviewed_by, auth.uid());

      INSERT INTO public.notifications (user_id, title, message, type, link)
      VALUES (NEW.doctor_id,
              'Welcome to the Founding 10 Doctors Program',
              'Your founding doctor application has been approved. Enjoy your exclusive locked-in early-adopter pricing and benefits.',
              'success', '/doctor');

    ELSIF NEW.status IN ('rejected','inactive') THEN
      -- Get the default global (non-founding) plan to restore
      SELECT id INTO v_default_global_plan
      FROM public.platform_fee_settings
      WHERE is_default = true AND is_active = true AND is_founding_plan = false
      LIMIT 1;

      UPDATE public.doctors
      SET is_founding_doctor = false,
          founding_status = NEW.status,
          fee_settings_id = v_default_global_plan
      WHERE profile_id = NEW.doctor_id;

      NEW.reviewed_at := now();
      NEW.reviewed_by := COALESCE(NEW.reviewed_by, auth.uid());

      INSERT INTO public.notifications (user_id, title, message, type, link)
      VALUES (NEW.doctor_id,
              CASE WHEN NEW.status = 'rejected' THEN 'Founding Doctor Application Update'
                   ELSE 'Founding Doctor Status Changed' END,
              CASE WHEN NEW.status = 'rejected'
                   THEN 'Your founding doctor application was not approved at this time.' || COALESCE(' Reason: ' || NEW.rejection_reason, '')
                   ELSE 'Your founding doctor benefits have been deactivated.' END,
              'info', '/doctor');
    END IF;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Mark doctor as pending
    UPDATE public.doctors
    SET founding_status = 'pending'
    WHERE profile_id = NEW.doctor_id AND is_founding_doctor = false;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS founding_application_status ON public.founding_doctor_applications;
CREATE TRIGGER founding_application_status
  BEFORE INSERT OR UPDATE ON public.founding_doctor_applications
  FOR EACH ROW EXECUTE FUNCTION public.handle_founding_application_change();

-- ============================================================
-- 7. Protect founding fields on doctors from self-update
-- ============================================================
CREATE OR REPLACE FUNCTION public.prevent_doctor_suspension_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    IF NEW.is_suspended IS DISTINCT FROM OLD.is_suspended
       OR NEW.suspension_reason IS DISTINCT FROM OLD.suspension_reason
       OR NEW.is_verified IS DISTINCT FROM OLD.is_verified
       OR NEW.is_founding_doctor IS DISTINCT FROM OLD.is_founding_doctor
       OR NEW.founding_status IS DISTINCT FROM OLD.founding_status
       OR NEW.founding_pricing_plan_id IS DISTINCT FROM OLD.founding_pricing_plan_id
       OR NEW.founding_locked IS DISTINCT FROM OLD.founding_locked
       OR NEW.founding_doctor_since IS DISTINCT FROM OLD.founding_doctor_since
       OR NEW.founding_expiry IS DISTINCT FROM OLD.founding_expiry THEN
      RAISE EXCEPTION 'Only admins can modify verification, suspension, or founding doctor fields';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================
-- 8. Seed: default founding plan + singleton program row
-- ============================================================
DO $$
DECLARE
  v_plan_id uuid;
  v_existing_program uuid;
BEGIN
  SELECT id INTO v_plan_id FROM public.platform_fee_settings
  WHERE is_founding_plan = true AND name = 'Founding Doctor 2026' LIMIT 1;

  IF v_plan_id IS NULL THEN
    INSERT INTO public.platform_fee_settings
      (name, description, is_default, is_active, is_founding_plan,
       platform_fee_percent, processing_fee_percent, processing_fee_fixed,
       fixed_transaction_fee, vat_enabled, vat_percent, fee_bearer,
       payout_schedule, minimum_payout)
    VALUES
      ('Founding Doctor 2026',
       'Exclusive locked-in early-adopter pricing for the first 10 founding doctors.',
       false, true, true,
       5, 0, 0, 0, false, 0, 'doctor', 'weekly', 100)
    RETURNING id INTO v_plan_id;
  END IF;

  SELECT id INTO v_existing_program FROM public.founding_doctor_program LIMIT 1;
  IF v_existing_program IS NULL THEN
    INSERT INTO public.founding_doctor_program (max_slots, program_label, applications_open, default_fee_settings_id)
    VALUES (10, 'Founding Doctor 2026', true, v_plan_id);
  ELSE
    UPDATE public.founding_doctor_program
    SET default_fee_settings_id = COALESCE(default_fee_settings_id, v_plan_id)
    WHERE id = v_existing_program;
  END IF;
END $$;
