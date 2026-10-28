CREATE TABLE public.medical_schemes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  administrator text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.medical_schemes TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.medical_schemes TO authenticated;
GRANT ALL ON public.medical_schemes TO service_role;
ALTER TABLE public.medical_schemes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read schemes" ON public.medical_schemes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Platform admins manage schemes" ON public.medical_schemes FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid())) WITH CHECK (public.is_platform_admin(auth.uid()));
INSERT INTO public.medical_schemes (name) VALUES
 ('Discovery Health Medical Scheme'),('Bonitas'),('Momentum Health'),('Medshield'),('Bestmed'),('GEMS'),
 ('Fedhealth'),('Medihelp'),('Profmed'),('Polmed'),('Sizwe Hosmed'),('Keyhealth') ON CONFLICT (name) DO NOTHING;

CREATE TABLE public.patient_medical_aid (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dependent_id uuid REFERENCES public.dependents(id) ON DELETE CASCADE,
  scheme_name text NOT NULL,
  plan text,
  membership_number text NOT NULL,
  dependent_code text,
  is_main_member boolean NOT NULL DEFAULT true,
  main_member_name text,
  main_member_id_number text,
  main_member_dob date,
  consent_to_share_with_scheme boolean NOT NULL DEFAULT false,
  consent_given_at timestamptz,
  verification_status text NOT NULL DEFAULT 'unverified',
  last_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT patient_medical_aid_status_chk CHECK (verification_status IN ('unverified','verified','failed','expired'))
);
CREATE UNIQUE INDEX patient_medical_aid_self_uniq ON public.patient_medical_aid(patient_id) WHERE dependent_id IS NULL;
CREATE UNIQUE INDEX patient_medical_aid_dep_uniq ON public.patient_medical_aid(patient_id, dependent_id) WHERE dependent_id IS NOT NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_medical_aid TO authenticated;
GRANT ALL ON public.patient_medical_aid TO service_role;
ALTER TABLE public.patient_medical_aid ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.owns_medical_aid_row(_patient uuid, _dependent uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND _patient = auth.uid() AND (
    _dependent IS NULL OR EXISTS (SELECT 1 FROM public.dependents d WHERE d.id = _dependent AND d.guardian_id = auth.uid())
  )
$$;
REVOKE EXECUTE ON FUNCTION public.owns_medical_aid_row(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owns_medical_aid_row(uuid, uuid) TO authenticated;

CREATE POLICY "Patient reads own medical aid" ON public.patient_medical_aid FOR SELECT TO authenticated
  USING (public.owns_medical_aid_row(patient_id, dependent_id) OR public.is_platform_admin(auth.uid()));
CREATE POLICY "Patient inserts own medical aid" ON public.patient_medical_aid FOR INSERT TO authenticated
  WITH CHECK (public.owns_medical_aid_row(patient_id, dependent_id));
CREATE POLICY "Patient updates own medical aid" ON public.patient_medical_aid FOR UPDATE TO authenticated
  USING (public.owns_medical_aid_row(patient_id, dependent_id)) WITH CHECK (public.owns_medical_aid_row(patient_id, dependent_id));
CREATE POLICY "Patient deletes own medical aid" ON public.patient_medical_aid FOR DELETE TO authenticated
  USING (public.owns_medical_aid_row(patient_id, dependent_id));

-- Patients cannot self-mark verification; consent timestamp kept in sync
CREATE OR REPLACE FUNCTION public.guard_patient_medical_aid()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NOT coalesce(public.is_platform_admin(auth.uid()), false) AND auth.role() <> 'service_role' THEN
    IF TG_OP = 'INSERT' THEN
      NEW.verification_status := 'unverified'; NEW.last_verified_at := NULL;
    ELSE
      NEW.verification_status := OLD.verification_status; NEW.last_verified_at := OLD.last_verified_at;
    END IF;
  END IF;
  IF NEW.consent_to_share_with_scheme THEN
    IF NEW.consent_given_at IS NULL THEN NEW.consent_given_at := now(); END IF;
  ELSE
    NEW.consent_given_at := NULL;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER patient_medical_aid_guard BEFORE INSERT OR UPDATE ON public.patient_medical_aid
  FOR EACH ROW EXECUTE FUNCTION public.guard_patient_medical_aid();

ALTER TABLE public.medical_aid_requests ADD COLUMN IF NOT EXISTS consent_given_at timestamptz;