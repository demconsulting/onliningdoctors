
-- doctor_medical_aids
CREATE TABLE public.doctor_medical_aids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL,
  scheme_name text NOT NULL,
  plan text,
  consultation_rate numeric NOT NULL CHECK (consultation_rate >= 0),
  default_copayment numeric NOT NULL DEFAULT 0 CHECK (default_copayment >= 0),
  requires_authorization boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.doctor_medical_aids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active medical aids"
  ON public.doctor_medical_aids FOR SELECT TO public
  USING (is_active = true);

CREATE POLICY "Doctors manage own medical aids"
  ON public.doctor_medical_aids FOR ALL TO authenticated
  USING (doctor_id = auth.uid())
  WITH CHECK (doctor_id = auth.uid());

CREATE POLICY "Admins view all medical aids"
  ON public.doctor_medical_aids FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_doctor_medical_aids_updated_at
  BEFORE UPDATE ON public.doctor_medical_aids
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_doctor_medical_aids_doctor ON public.doctor_medical_aids(doctor_id);

-- medical_aid_requests
CREATE TABLE public.medical_aid_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  doctor_id uuid NOT NULL,
  dependent_id uuid,
  scheme_name text NOT NULL,
  plan text,
  membership_number text NOT NULL,
  main_member_name text NOT NULL,
  dependent_code text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','copay_requested','private_requested','cancelled')),
  approved_rate numeric,
  copayment_amount numeric,
  doctor_notes text,
  appointment_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.medical_aid_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients view own medical aid requests"
  ON public.medical_aid_requests FOR SELECT TO authenticated
  USING (patient_id = auth.uid());

CREATE POLICY "Doctors view incoming medical aid requests"
  ON public.medical_aid_requests FOR SELECT TO authenticated
  USING (doctor_id = auth.uid());

CREATE POLICY "Admins view all medical aid requests"
  ON public.medical_aid_requests FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Patients create own medical aid requests"
  ON public.medical_aid_requests FOR INSERT TO authenticated
  WITH CHECK (patient_id = auth.uid() AND length(scheme_name) > 0 AND length(membership_number) > 0);

CREATE POLICY "Doctors update incoming medical aid requests"
  ON public.medical_aid_requests FOR UPDATE TO authenticated
  USING (doctor_id = auth.uid())
  WITH CHECK (doctor_id = auth.uid());

CREATE POLICY "Patients update own pending requests"
  ON public.medical_aid_requests FOR UPDATE TO authenticated
  USING (patient_id = auth.uid())
  WITH CHECK (patient_id = auth.uid());

CREATE TRIGGER update_medical_aid_requests_updated_at
  BEFORE UPDATE ON public.medical_aid_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_medical_aid_requests_patient ON public.medical_aid_requests(patient_id);
CREATE INDEX idx_medical_aid_requests_doctor ON public.medical_aid_requests(doctor_id);
CREATE INDEX idx_medical_aid_requests_status ON public.medical_aid_requests(status);

-- appointments link to request
ALTER TABLE public.appointments ADD COLUMN medical_aid_request_id uuid;

-- Notification trigger
CREATE OR REPLACE FUNCTION public.notify_medical_aid_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  patient_name text;
  doctor_name text;
BEGIN
  SELECT full_name INTO patient_name FROM profiles WHERE id = NEW.patient_id;
  SELECT full_name INTO doctor_name FROM profiles WHERE id = NEW.doctor_id;
  patient_name := COALESCE(patient_name, 'Patient');
  doctor_name := COALESCE(doctor_name, 'Doctor');

  IF TG_OP = 'INSERT' THEN
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (NEW.doctor_id, 'New Medical Aid Request',
            patient_name || ' submitted a medical aid verification request (' || NEW.scheme_name || ').',
            'medical_aid', '/doctor');
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'approved' THEN
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (NEW.patient_id, 'Medical Aid Approved',
              'Dr. ' || doctor_name || ' approved your medical aid request. You can now pick a time slot.',
              'medical_aid', '/dashboard');
    ELSIF NEW.status = 'rejected' THEN
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (NEW.patient_id, 'Medical Aid Rejected',
              'Dr. ' || doctor_name || ' could not approve your medical aid request.' ||
              COALESCE(' Reason: ' || NEW.doctor_notes, ''),
              'medical_aid', '/dashboard');
    ELSIF NEW.status = 'copay_requested' THEN
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (NEW.patient_id, 'Co-payment Required',
              'Dr. ' || doctor_name || ' requires a co-payment of ' || COALESCE(NEW.copayment_amount::text, '0') ||
              '. You can now pick a time slot.',
              'medical_aid', '/dashboard');
    ELSIF NEW.status = 'private_requested' THEN
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (NEW.patient_id, 'Private Payment Requested',
              'Dr. ' || doctor_name || ' has requested private payment instead of medical aid.',
              'medical_aid', '/dashboard');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_medical_aid_request_trigger
  AFTER INSERT OR UPDATE ON public.medical_aid_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_medical_aid_request();
