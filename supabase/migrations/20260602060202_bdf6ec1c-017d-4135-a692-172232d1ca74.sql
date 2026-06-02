
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS id_number text,
  ADD COLUMN IF NOT EXISTS id_type text,
  ADD COLUMN IF NOT EXISTS id_country_code text,
  ADD COLUMN IF NOT EXISTS id_number_hash text;

DO $$ BEGIN
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_type_chk CHECK (id_type IS NULL OR id_type IN ('national_id','passport'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_id_number_hash ON public.profiles(id_number_hash) WHERE id_number_hash IS NOT NULL;

CREATE OR REPLACE FUNCTION public.hash_identifier(_id_type text, _id_value text, _country text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT CASE
    WHEN _id_value IS NULL OR length(trim(_id_value)) = 0 THEN NULL
    ELSE encode(
      digest(
        'do-pepper-v1::' ||
        COALESCE(lower(_id_type), 'unknown') || '::' ||
        upper(COALESCE(_country, '')) || '::' ||
        regexp_replace(upper(_id_value), '[^A-Z0-9]', '', 'g'),
        'sha256'
      ), 'hex')
  END
$$;
REVOKE EXECUTE ON FUNCTION public.hash_identifier(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hash_identifier(text, text, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.profiles_sync_id_hash()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.id_number_hash := public.hash_identifier(NEW.id_type, NEW.id_number, COALESCE(NEW.id_country_code, NEW.country));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_sync_id_hash ON public.profiles;
CREATE TRIGGER trg_profiles_sync_id_hash
BEFORE INSERT OR UPDATE OF id_number, id_type, id_country_code, country
ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.profiles_sync_id_hash();

-- practice_patients
CREATE TABLE IF NOT EXISTS public.practice_patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id uuid,
  doctor_id uuid,
  created_by uuid NOT NULL,
  full_name text NOT NULL,
  phone text,
  email text,
  date_of_birth date,
  gender text,
  id_type text CHECK (id_type IS NULL OR id_type IN ('national_id','passport')),
  id_country_code text,
  id_number_hash text,
  id_last_four text,
  address text,
  emergency_contact_name text,
  emergency_contact_phone text,
  allergies text,
  chronic_conditions text,
  medical_notes text,
  linked_user_id uuid,
  consent_status text NOT NULL DEFAULT 'none' CHECK (consent_status IN ('none','pending','granted','revoked','denied')),
  consent_requested_at timestamptz,
  consent_decided_at timestamptz,
  consent_ip text,
  consent_user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT practice_patients_owner_chk CHECK (practice_id IS NOT NULL OR doctor_id IS NOT NULL)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.practice_patients TO authenticated;
GRANT ALL ON public.practice_patients TO service_role;

ALTER TABLE public.practice_patients ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_practice_patients_doctor ON public.practice_patients(doctor_id);
CREATE INDEX IF NOT EXISTS idx_practice_patients_practice ON public.practice_patients(practice_id);
CREATE INDEX IF NOT EXISTS idx_practice_patients_linked_user ON public.practice_patients(linked_user_id);
CREATE INDEX IF NOT EXISTS idx_practice_patients_id_hash ON public.practice_patients(id_number_hash) WHERE id_number_hash IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_practice_patients_practice_idhash
  ON public.practice_patients(practice_id, id_number_hash)
  WHERE practice_id IS NOT NULL AND id_number_hash IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_practice_patients_doctor_idhash
  ON public.practice_patients(doctor_id, id_number_hash)
  WHERE practice_id IS NULL AND doctor_id IS NOT NULL AND id_number_hash IS NOT NULL;

DROP TRIGGER IF EXISTS trg_practice_patients_updated ON public.practice_patients;
CREATE TRIGGER trg_practice_patients_updated
BEFORE UPDATE ON public.practice_patients
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Admins manage practice patients"
  ON public.practice_patients FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Doctors view own practice patients"
  ON public.practice_patients FOR SELECT TO authenticated
  USING (doctor_id = auth.uid());

CREATE POLICY "Doctors insert own practice patients"
  ON public.practice_patients FOR INSERT TO authenticated
  WITH CHECK (doctor_id = auth.uid() AND created_by = auth.uid() AND public.has_role(auth.uid(), 'doctor'::app_role));

CREATE POLICY "Doctors update own practice patients"
  ON public.practice_patients FOR UPDATE TO authenticated
  USING (doctor_id = auth.uid()) WITH CHECK (doctor_id = auth.uid());

CREATE POLICY "Doctors delete own practice patients"
  ON public.practice_patients FOR DELETE TO authenticated
  USING (doctor_id = auth.uid() AND linked_user_id IS NULL);

CREATE POLICY "Practice staff view practice patients"
  ON public.practice_patients FOR SELECT TO authenticated
  USING (practice_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.practice_members pm
    WHERE pm.practice_id = practice_patients.practice_id AND pm.user_id = auth.uid() AND pm.status = 'active'
  ));

CREATE POLICY "Practice staff insert practice patients"
  ON public.practice_patients FOR INSERT TO authenticated
  WITH CHECK (practice_id IS NOT NULL AND created_by = auth.uid() AND EXISTS (
    SELECT 1 FROM public.practice_members pm
    WHERE pm.practice_id = practice_patients.practice_id AND pm.user_id = auth.uid()
      AND pm.status = 'active' AND pm.role IN ('owner','practice_admin','doctor','nurse','receptionist')
  ));

CREATE POLICY "Practice staff update practice patients"
  ON public.practice_patients FOR UPDATE TO authenticated
  USING (practice_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.practice_members pm
    WHERE pm.practice_id = practice_patients.practice_id AND pm.user_id = auth.uid()
      AND pm.status = 'active' AND pm.role IN ('owner','practice_admin','doctor','nurse','receptionist')
  ))
  WITH CHECK (practice_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.practice_members pm
    WHERE pm.practice_id = practice_patients.practice_id AND pm.user_id = auth.uid()
      AND pm.status = 'active' AND pm.role IN ('owner','practice_admin','doctor','nurse','receptionist')
  ));

CREATE POLICY "Practice managers delete practice patients"
  ON public.practice_patients FOR DELETE TO authenticated
  USING (practice_id IS NOT NULL AND linked_user_id IS NULL AND EXISTS (
    SELECT 1 FROM public.practice_members pm
    WHERE pm.practice_id = practice_patients.practice_id AND pm.user_id = auth.uid()
      AND pm.status = 'active' AND pm.role IN ('owner','practice_admin')
  ));

CREATE POLICY "Linked patient views own practice record"
  ON public.practice_patients FOR SELECT TO authenticated
  USING (linked_user_id = auth.uid() AND consent_status = 'granted');

-- link requests audit
CREATE TABLE IF NOT EXISTS public.practice_patient_link_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_patient_id uuid NOT NULL,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','granted','denied','expired','admin_unlinked')),
  decided_at timestamptz,
  ip text,
  user_agent text,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.practice_patient_link_requests TO authenticated;
GRANT ALL ON public.practice_patient_link_requests TO service_role;

ALTER TABLE public.practice_patient_link_requests ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_pplr_user ON public.practice_patient_link_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_pplr_pp ON public.practice_patient_link_requests(practice_patient_id);

CREATE POLICY "Users view own link requests"
  ON public.practice_patient_link_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins view link requests"
  ON public.practice_patient_link_requests FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Practice owners view link requests"
  ON public.practice_patient_link_requests FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.practice_patients pp
    WHERE pp.id = practice_patient_link_requests.practice_patient_id
      AND (pp.doctor_id = auth.uid()
           OR (pp.practice_id IS NOT NULL AND EXISTS (
              SELECT 1 FROM public.practice_members pm
              WHERE pm.practice_id = pp.practice_id AND pm.user_id = auth.uid()
                AND pm.status = 'active' AND pm.role IN ('owner','practice_admin')
           )))
  ));

-- RPCs
CREATE OR REPLACE FUNCTION public.find_matching_practice_patients()
RETURNS TABLE (
  id uuid, practice_id uuid, doctor_id uuid,
  doctor_name text, practice_name text,
  date_of_birth_year int, created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT pp.id, pp.practice_id, pp.doctor_id,
         dp.full_name AS doctor_name,
         pr.practice_name AS practice_name,
         EXTRACT(YEAR FROM pp.date_of_birth)::int AS date_of_birth_year,
         pp.created_at
  FROM public.practice_patients pp
  LEFT JOIN public.profiles dp ON dp.id = pp.doctor_id
  LEFT JOIN public.practices pr ON pr.id = pp.practice_id
  WHERE pp.linked_user_id IS NULL
    AND pp.consent_status IN ('none','pending')
    AND pp.id_number_hash IS NOT NULL
    AND pp.id_number_hash = (SELECT p.id_number_hash FROM public.profiles p WHERE p.id = auth.uid())
  ORDER BY pp.created_at DESC
$$;
REVOKE EXECUTE ON FUNCTION public.find_matching_practice_patients() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_matching_practice_patients() TO authenticated;

CREATE OR REPLACE FUNCTION public.link_practice_patient(_practice_patient_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_hash text; v_pp public.practice_patients%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT id_number_hash INTO v_user_hash FROM public.profiles WHERE id = auth.uid();
  IF v_user_hash IS NULL THEN RAISE EXCEPTION 'Add your ID or passport number to your profile first'; END IF;
  SELECT * INTO v_pp FROM public.practice_patients WHERE id = _practice_patient_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Practice patient not found'; END IF;
  IF v_pp.id_number_hash IS NULL OR v_pp.id_number_hash <> v_user_hash THEN
    RAISE EXCEPTION 'ID does not match this practice patient';
  END IF;
  IF v_pp.linked_user_id IS NOT NULL THEN RAISE EXCEPTION 'Already linked'; END IF;

  UPDATE public.practice_patients
    SET linked_user_id = auth.uid(), consent_status = 'granted', consent_decided_at = now()
    WHERE id = _practice_patient_id;
  INSERT INTO public.practice_patient_link_requests (practice_patient_id, user_id, status, decided_at)
    VALUES (_practice_patient_id, auth.uid(), 'granted', now());
  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, details)
    VALUES (auth.uid(), 'link_practice_patient', 'practice_patients', _practice_patient_id::text,
            jsonb_build_object('doctor_id', v_pp.doctor_id, 'practice_id', v_pp.practice_id));
  IF v_pp.doctor_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (v_pp.doctor_id, 'Practice Patient Linked',
            'A patient linked their Doctors Onlining account to an existing practice record.',
            'info', '/doctor');
  END IF;
  RETURN _practice_patient_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.link_practice_patient(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.link_practice_patient(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.deny_practice_patient(_practice_patient_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_hash text; v_pp public.practice_patients%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT id_number_hash INTO v_user_hash FROM public.profiles WHERE id = auth.uid();
  SELECT * INTO v_pp FROM public.practice_patients WHERE id = _practice_patient_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Practice patient not found'; END IF;
  IF v_user_hash IS NULL OR v_pp.id_number_hash IS NULL OR v_pp.id_number_hash <> v_user_hash THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF v_pp.linked_user_id IS NOT NULL THEN RAISE EXCEPTION 'Already linked'; END IF;

  UPDATE public.practice_patients SET consent_status = 'denied', consent_decided_at = now() WHERE id = _practice_patient_id;
  INSERT INTO public.practice_patient_link_requests (practice_patient_id, user_id, status, decided_at)
    VALUES (_practice_patient_id, auth.uid(), 'denied', now());
  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, details)
    VALUES (auth.uid(), 'deny_practice_patient', 'practice_patients', _practice_patient_id::text, '{}'::jsonb);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.deny_practice_patient(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.deny_practice_patient(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_unlink_practice_patient(_practice_patient_id uuid, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_pp public.practice_patients%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::app_role) THEN RAISE EXCEPTION 'Only admins'; END IF;
  IF _reason IS NULL OR length(trim(_reason)) = 0 THEN RAISE EXCEPTION 'Reason required'; END IF;
  SELECT * INTO v_pp FROM public.practice_patients WHERE id = _practice_patient_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Not found'; END IF;

  UPDATE public.practice_patients
    SET linked_user_id = NULL, consent_status = 'revoked', consent_decided_at = now()
    WHERE id = _practice_patient_id;
  INSERT INTO public.practice_patient_link_requests (practice_patient_id, user_id, status, decided_at, reason)
    VALUES (_practice_patient_id, COALESCE(v_pp.linked_user_id, auth.uid()), 'admin_unlinked', now(), _reason);
  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, details)
    VALUES (auth.uid(), 'admin_unlink_practice_patient', 'practice_patients', _practice_patient_id::text,
            jsonb_build_object('reason', _reason, 'previous_linked_user', v_pp.linked_user_id));
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_unlink_practice_patient(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_unlink_practice_patient(uuid, text) TO authenticated;
