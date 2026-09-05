ALTER TABLE public.doctors
  ADD COLUMN IF NOT EXISTS practice_type text NOT NULL DEFAULT 'independent',
  ADD COLUMN IF NOT EXISTS bhf_number text,
  ADD COLUMN IF NOT EXISTS bank_name text,
  ADD COLUMN IF NOT EXISTS account_name text,
  ADD COLUMN IF NOT EXISTS account_number text,
  ADD COLUMN IF NOT EXISTS paystack_subaccount_code text,
  ADD COLUMN IF NOT EXISTS is_payout_verified boolean NOT NULL DEFAULT false;

UPDATE public.doctors SET practice_type = 'group_member' WHERE practice_id IS NOT NULL;

ALTER TABLE public.doctors DROP CONSTRAINT IF EXISTS doctors_practice_type_check;
ALTER TABLE public.doctors ADD CONSTRAINT doctors_practice_type_check
  CHECK (practice_type IN ('independent', 'group_member'));

CREATE UNIQUE INDEX IF NOT EXISTS unique_hpcsa_number
  ON public.doctors (lower(btrim(license_number)))
  WHERE license_number IS NOT NULL AND btrim(license_number) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS unique_doctor_email
  ON public.profiles (lower(btrim(email)))
  WHERE email IS NOT NULL AND btrim(email) <> '';

CREATE OR REPLACE FUNCTION public.enforce_doctor_practice_structure()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.practice_type = 'group_member' AND NEW.practice_id IS NULL THEN
    RAISE EXCEPTION 'Group practice members must be linked to a practice';
  END IF;
  IF NEW.practice_type = 'independent' THEN
    NEW.practice_id := NULL;
    NEW.practice_approval_status := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_doctor_practice_structure ON public.doctors;
CREATE TRIGGER trg_enforce_doctor_practice_structure
  BEFORE INSERT OR UPDATE OF practice_type, practice_id ON public.doctors
  FOR EACH ROW EXECUTE FUNCTION public.enforce_doctor_practice_structure();

CREATE OR REPLACE FUNCTION public.enforce_practice_bhf_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.bhf_number IS NULL OR btrim(NEW.bhf_number) = '' THEN
    RAISE EXCEPTION 'A BHF practice number is required for group practices';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_practice_bhf_number ON public.practices;
CREATE TRIGGER trg_enforce_practice_bhf_number
  BEFORE INSERT ON public.practices
  FOR EACH ROW EXECUTE FUNCTION public.enforce_practice_bhf_number();

CREATE OR REPLACE FUNCTION public.check_doctor_identity_available(
  _email text DEFAULT NULL,
  _hpcsa text DEFAULT NULL,
  _exclude_user uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    'email_taken', COALESCE((
      SELECT true FROM public.profiles p
      WHERE _email IS NOT NULL AND btrim(_email) <> ''
        AND lower(btrim(p.email)) = lower(btrim(_email))
        AND (_exclude_user IS NULL OR p.id <> _exclude_user)
      LIMIT 1
    ), false),
    'hpcsa_taken', COALESCE((
      SELECT true FROM public.doctors d
      WHERE _hpcsa IS NOT NULL AND btrim(_hpcsa) <> ''
        AND lower(btrim(d.license_number)) = lower(btrim(_hpcsa))
        AND (_exclude_user IS NULL OR d.profile_id <> _exclude_user)
      LIMIT 1
    ), false)
  );
$$;

REVOKE EXECUTE ON FUNCTION public.check_doctor_identity_available(text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_doctor_identity_available(text, text, uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_doctor_payout_target(_doctor_id uuid)
RETURNS TABLE (
  practice_type text,
  subaccount_code text,
  hpcsa_number text,
  bhf_number text,
  practice_number text,
  practice_name text,
  doctor_name text,
  is_ready boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    d.practice_type,
    CASE WHEN d.practice_type = 'group_member' THEN pr.paystack_subaccount_code
         ELSE d.paystack_subaccount_code END,
    d.license_number,
    COALESCE(d.bhf_number, pr.bhf_number),
    pr.practice_number,
    pr.practice_name,
    p.full_name,
    CASE WHEN d.practice_type = 'group_member'
      THEN COALESCE(pr.status = 'approved', false)
           AND COALESCE(d.practice_approval_status = 'approved', false)
           AND pr.paystack_subaccount_code IS NOT NULL
      ELSE d.is_verified AND d.paystack_subaccount_code IS NOT NULL END
  FROM public.doctors d
  LEFT JOIN public.practices pr ON pr.id = d.practice_id
  LEFT JOIN public.profiles p ON p.id = d.profile_id
  WHERE d.profile_id = _doctor_id;
$$;

REVOKE EXECUTE ON FUNCTION public.get_doctor_payout_target(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_doctor_payout_target(uuid) TO authenticated, service_role;