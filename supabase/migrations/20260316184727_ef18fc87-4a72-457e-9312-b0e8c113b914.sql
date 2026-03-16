
CREATE TABLE public.doctor_billing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  billing_type text NOT NULL DEFAULT 'individual' CHECK (billing_type IN ('individual', 'company')),
  -- Bank details
  bank_name text,
  account_holder_name text,
  account_number text,
  branch_code text,
  bank_swift_code text,
  account_type text,
  -- Company details (only for billing_type = 'company')
  company_name text,
  company_registration_number text,
  company_vat_number text,
  company_address text,
  company_phone text,
  company_email text,
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (doctor_id)
);

ALTER TABLE public.doctor_billing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors can view own billing" ON public.doctor_billing
  FOR SELECT TO authenticated USING (doctor_id = auth.uid());

CREATE POLICY "Doctors can insert own billing" ON public.doctor_billing
  FOR INSERT TO authenticated WITH CHECK (doctor_id = auth.uid() AND has_role(auth.uid(), 'doctor'::app_role));

CREATE POLICY "Doctors can update own billing" ON public.doctor_billing
  FOR UPDATE TO authenticated USING (doctor_id = auth.uid());

CREATE POLICY "Admins can view all billing" ON public.doctor_billing
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_doctor_billing_updated_at
  BEFORE UPDATE ON public.doctor_billing
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
