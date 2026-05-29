
-- 1. New doctor practice fields for prescription letterhead
ALTER TABLE public.doctors
  ADD COLUMN IF NOT EXISTS practice_address text,
  ADD COLUMN IF NOT EXISTS practice_website text,
  ADD COLUMN IF NOT EXISTS practice_signature_url text;

-- 2. Prescription extensions: unique number, status/cancellation, extended clinical fields, verification token (for QR)
ALTER TABLE public.prescriptions
  ADD COLUMN IF NOT EXISTS prescription_number text UNIQUE,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_by uuid,
  ADD COLUMN IF NOT EXISTS clinical_notes text,
  ADD COLUMN IF NOT EXISTS follow_up_instructions text,
  ADD COLUMN IF NOT EXISTS verification_token uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS document_type text NOT NULL DEFAULT 'prescription';

-- 3. Sequence + trigger to auto-generate prescription_number like RX-YYYYMMDD-000001
CREATE SEQUENCE IF NOT EXISTS public.prescription_number_seq;

CREATE OR REPLACE FUNCTION public.set_prescription_number()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  prefix text;
  next_id bigint;
BEGIN
  IF NEW.prescription_number IS NULL OR NEW.prescription_number = '' THEN
    prefix := CASE COALESCE(NEW.document_type,'prescription')
      WHEN 'medical_certificate' THEN 'MC'
      WHEN 'referral_letter' THEN 'RL'
      WHEN 'pathology_request' THEN 'PR'
      WHEN 'radiology_request' THEN 'RR'
      WHEN 'chronic_script' THEN 'CR'
      ELSE 'RX' END;
    next_id := nextval('public.prescription_number_seq');
    NEW.prescription_number := prefix || '-' || to_char(now(),'YYYYMMDD') || '-' || lpad(next_id::text, 6, '0');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_set_prescription_number ON public.prescriptions;
CREATE TRIGGER trg_set_prescription_number
BEFORE INSERT ON public.prescriptions
FOR EACH ROW EXECUTE FUNCTION public.set_prescription_number();

-- 4. Guard: prevent editing clinical content after issue. Allow only status->cancelled transition + cancellation fields.
CREATE OR REPLACE FUNCTION public.guard_prescription_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Admins can do anything
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  -- If currently active and cancellation is being applied, only allow status/cancellation_* fields to change
  IF OLD.status = 'active' AND NEW.status = 'cancelled' THEN
    -- Force-preserve clinical immutable fields
    NEW.medications := OLD.medications;
    NEW.diagnosis := OLD.diagnosis;
    NEW.clinical_notes := OLD.clinical_notes;
    NEW.follow_up_instructions := OLD.follow_up_instructions;
    NEW.pharmacy_notes := OLD.pharmacy_notes;
    NEW.warnings := OLD.warnings;
    NEW.allergies_noted := OLD.allergies_noted;
    NEW.refill_count := OLD.refill_count;
    NEW.follow_up_date := OLD.follow_up_date;
    NEW.prescription_number := OLD.prescription_number;
    NEW.verification_token := OLD.verification_token;
    NEW.cancelled_at := COALESCE(NEW.cancelled_at, now());
    NEW.cancelled_by := COALESCE(NEW.cancelled_by, auth.uid());
    RETURN NEW;
  END IF;

  -- If already cancelled, block edits entirely
  IF OLD.status = 'cancelled' THEN
    RAISE EXCEPTION 'Cancelled prescriptions are immutable';
  END IF;

  -- If active and not cancelling, allow edits only within 30 minutes of creation (draft window)
  IF OLD.status = 'active' AND OLD.created_at < (now() - interval '30 minutes') THEN
    RAISE EXCEPTION 'Issued prescriptions cannot be edited after 30 minutes. Cancel and reissue instead.';
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_guard_prescription_update ON public.prescriptions;
CREATE TRIGGER trg_guard_prescription_update
BEFORE UPDATE ON public.prescriptions
FOR EACH ROW EXECUTE FUNCTION public.guard_prescription_update();

-- 5. Audit trail on prescriptions
DROP TRIGGER IF EXISTS trg_audit_prescriptions ON public.prescriptions;
CREATE TRIGGER trg_audit_prescriptions
AFTER INSERT OR UPDATE OR DELETE ON public.prescriptions
FOR EACH ROW EXECUTE FUNCTION public.log_sensitive_change();

-- 6. Public verification function (so QR codes can resolve without auth)
CREATE OR REPLACE FUNCTION public.verify_prescription(_token uuid)
RETURNS TABLE(
  prescription_number text,
  status text,
  issued_at timestamptz,
  doctor_name text,
  patient_name text,
  document_type text
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.prescription_number, p.status, p.created_at,
         dp.full_name, pp.full_name, p.document_type
  FROM public.prescriptions p
  LEFT JOIN public.profiles dp ON dp.id = p.doctor_id
  LEFT JOIN public.profiles pp ON pp.id = p.patient_id
  WHERE p.verification_token = _token
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.verify_prescription(uuid) TO anon, authenticated;

-- 7. Backfill prescription_number for existing rows
UPDATE public.prescriptions
SET prescription_number = 'RX-' || to_char(created_at, 'YYYYMMDD') || '-' || lpad(nextval('public.prescription_number_seq')::text, 6, '0')
WHERE prescription_number IS NULL;
