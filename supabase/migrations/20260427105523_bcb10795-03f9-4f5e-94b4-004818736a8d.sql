
-- ============================================================
-- DEPENDENTS
-- ============================================================
CREATE TABLE public.dependents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guardian_id uuid NOT NULL,
  linked_user_id uuid,
  full_name text NOT NULL,
  date_of_birth date NOT NULL,
  gender text,
  relationship text NOT NULL,
  email text,
  phone text,
  medical_notes text,
  allergies text,
  chronic_conditions text,
  emergency_contact_name text,
  emergency_contact_phone text,
  allow_login boolean NOT NULL DEFAULT false,
  is_minor boolean NOT NULL DEFAULT true,
  invitation_status text NOT NULL DEFAULT 'none',
  invitation_token text UNIQUE,
  invitation_sent_at timestamptz,
  consent_accepted_at timestamptz,
  consent_version text,
  guardian_consent_accepted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dependents_full_name_len CHECK (length(full_name) BETWEEN 1 AND 200),
  CONSTRAINT dependents_relationship_len CHECK (length(relationship) BETWEEN 1 AND 100),
  CONSTRAINT dependents_email_len CHECK (email IS NULL OR length(email) <= 255),
  CONSTRAINT dependents_invitation_status_chk CHECK (invitation_status IN ('none','pending','accepted','declined'))
);

CREATE INDEX idx_dependents_guardian ON public.dependents(guardian_id);
CREATE INDEX idx_dependents_linked_user ON public.dependents(linked_user_id);

-- Trigger to compute is_minor from date_of_birth
CREATE OR REPLACE FUNCTION public.set_dependent_is_minor()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.is_minor := NEW.date_of_birth > (CURRENT_DATE - INTERVAL '18 years')::date;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_dependents_set_is_minor
  BEFORE INSERT OR UPDATE OF date_of_birth ON public.dependents
  FOR EACH ROW EXECUTE FUNCTION public.set_dependent_is_minor();

CREATE TRIGGER update_dependents_updated_at
  BEFORE UPDATE ON public.dependents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.dependents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guardians can view own dependents"
  ON public.dependents FOR SELECT TO authenticated
  USING (guardian_id = auth.uid());

CREATE POLICY "Guardians can insert own dependents"
  ON public.dependents FOR INSERT TO authenticated
  WITH CHECK (guardian_id = auth.uid());

CREATE POLICY "Guardians can update own dependents"
  ON public.dependents FOR UPDATE TO authenticated
  USING (guardian_id = auth.uid());

CREATE POLICY "Guardians can delete own dependents"
  ON public.dependents FOR DELETE TO authenticated
  USING (guardian_id = auth.uid());

CREATE POLICY "Linked dependent can view own record"
  ON public.dependents FOR SELECT TO authenticated
  USING (linked_user_id = auth.uid());

CREATE POLICY "Linked dependent can update own record"
  ON public.dependents FOR UPDATE TO authenticated
  USING (linked_user_id = auth.uid());

CREATE POLICY "Admins can view all dependents"
  ON public.dependents FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- DEPENDENT CONSENTS
-- ============================================================
CREATE TABLE public.dependent_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dependent_id uuid NOT NULL,
  user_id uuid NOT NULL,
  consent_type text NOT NULL,
  consent_text text NOT NULL,
  consent_version text NOT NULL DEFAULT '1.0',
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dependent_consents_type_chk CHECK (consent_type IN ('guardian_authority','adult_share_records','adult_invitation_accepted'))
);

CREATE INDEX idx_dependent_consents_dependent ON public.dependent_consents(dependent_id);
CREATE INDEX idx_dependent_consents_user ON public.dependent_consents(user_id);

ALTER TABLE public.dependent_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own consent records"
  ON public.dependent_consents FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own consent records"
  ON public.dependent_consents FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Guardian can view consents for their dependents"
  ON public.dependent_consents FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.dependents d
    WHERE d.id = dependent_consents.dependent_id
      AND d.guardian_id = auth.uid()
  ));

CREATE POLICY "Admins can view all consent records"
  ON public.dependent_consents FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- LINK dependent_id TO RELEVANT TABLES
-- ============================================================
ALTER TABLE public.appointments ADD COLUMN dependent_id uuid;
CREATE INDEX idx_appointments_dependent ON public.appointments(dependent_id);

ALTER TABLE public.prescriptions ADD COLUMN dependent_id uuid;
CREATE INDEX idx_prescriptions_dependent ON public.prescriptions(dependent_id);

ALTER TABLE public.consultation_notes ADD COLUMN dependent_id uuid;
CREATE INDEX idx_consultation_notes_dependent ON public.consultation_notes(dependent_id);

CREATE POLICY "Linked dependent can view own appointments"
  ON public.appointments FOR SELECT TO authenticated
  USING (
    dependent_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.dependents d
      WHERE d.id = appointments.dependent_id
        AND d.linked_user_id = auth.uid()
        AND d.consent_accepted_at IS NOT NULL
    )
  );

CREATE POLICY "Linked dependent can view own prescriptions"
  ON public.prescriptions FOR SELECT TO authenticated
  USING (
    dependent_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.dependents d
      WHERE d.id = prescriptions.dependent_id
        AND d.linked_user_id = auth.uid()
        AND d.consent_accepted_at IS NOT NULL
    )
  );

CREATE POLICY "Linked dependent can view own consultation notes"
  ON public.consultation_notes FOR SELECT TO authenticated
  USING (
    dependent_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.dependents d
      WHERE d.id = consultation_notes.dependent_id
        AND d.linked_user_id = auth.uid()
        AND d.consent_accepted_at IS NOT NULL
    )
  );
