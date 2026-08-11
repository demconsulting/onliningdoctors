-- 1. Payment gateway configuration per business unit
CREATE TABLE public.payment_gateway_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  context business_unit NOT NULL,
  provider text NOT NULL DEFAULT 'paystack',
  mode text NOT NULL DEFAULT 'test',
  public_key_test text,
  public_key_live text,
  supported_currencies text[] NOT NULL DEFAULT ARRAY['ZAR'],
  payment_methods text[] NOT NULL DEFAULT ARRAY['card'],
  fee_bearer text NOT NULL DEFAULT 'customer',
  payment_timing text NOT NULL DEFAULT 'at_booking',
  payouts_enabled boolean NOT NULL DEFAULT false,
  platform_commission_percent numeric NOT NULL DEFAULT 0,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (context, provider)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_gateway_configs TO authenticated;
GRANT ALL ON public.payment_gateway_configs TO service_role;

ALTER TABLE public.payment_gateway_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage payment gateway configs"
ON public.payment_gateway_configs FOR ALL TO authenticated
USING (public.is_platform_admin(auth.uid()))
WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE TRIGGER trg_pgc_updated_at BEFORE UPDATE ON public.payment_gateway_configs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Safe, non-sensitive config read for the apps
CREATE OR REPLACE FUNCTION public.get_payment_gateway_public_config(_context business_unit DEFAULT 'doctorsonlining')
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'context', c.context,
    'provider', c.provider,
    'mode', c.mode,
    'public_key', CASE WHEN c.mode = 'live' THEN c.public_key_live ELSE c.public_key_test END,
    'supported_currencies', to_jsonb(c.supported_currencies),
    'payment_methods', to_jsonb(c.payment_methods),
    'fee_bearer', c.fee_bearer,
    'payment_timing', c.payment_timing,
    'is_active', c.is_active
  )
  FROM public.payment_gateway_configs c
  WHERE c.context = _context AND c.provider = 'paystack'
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_payment_gateway_public_config(business_unit) TO anon, authenticated, service_role;

-- Seed from the existing DoctorsOnlining paystack config
INSERT INTO public.payment_gateway_configs (
  context, provider, mode, public_key_test, public_key_live,
  supported_currencies, payment_methods, fee_bearer, payment_timing,
  payouts_enabled, platform_commission_percent
)
SELECT
  'doctorsonlining'::business_unit,
  'paystack',
  COALESCE(sc.value->>'mode', 'test'),
  sc.value->>'public_key_test',
  sc.value->>'public_key_live',
  COALESCE(ARRAY(SELECT jsonb_array_elements_text(sc.value->'supported_currencies')), ARRAY['ZAR']),
  COALESCE(ARRAY(SELECT jsonb_array_elements_text(sc.value->'payment_methods')), ARRAY['card']),
  COALESCE(sc.value->>'fee_bearer', 'patient'),
  COALESCE(sc.value->>'payment_timing', 'at_booking'),
  COALESCE((sc.value->>'payouts_enabled')::boolean, false),
  COALESCE((sc.value->>'platform_commission_percent')::numeric, 15)
FROM public.site_content sc
WHERE sc.key = 'paystack_config'
ON CONFLICT (context, provider) DO NOTHING;

INSERT INTO public.payment_gateway_configs (context, provider, mode, fee_bearer, payment_timing, supported_currencies, payment_methods, platform_commission_percent)
VALUES ('doctorsonlining', 'paystack', 'test', 'patient', 'at_booking', ARRAY['ZAR'], ARRAY['card'], 15)
ON CONFLICT (context, provider) DO NOTHING;

INSERT INTO public.payment_gateway_configs (context, provider, mode, fee_bearer, payment_timing, supported_currencies, payment_methods, platform_commission_percent)
VALUES ('nalavation', 'paystack', 'test', 'customer', 'at_booking', ARRAY['ZAR'], ARRAY['card'], 0)
ON CONFLICT (context, provider) DO NOTHING;

-- 2. Payments: support non-healthcare (Nalavation) transactions
ALTER TABLE public.payments
  ALTER COLUMN patient_id DROP NOT NULL,
  ALTER COLUMN doctor_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS payer_id uuid,
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.digital_practice_projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS website_invoice_id uuid REFERENCES public.website_invoices(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS service_code text;

UPDATE public.payments SET payer_id = patient_id WHERE payer_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_payments_business_unit ON public.payments(business_unit);
CREATE INDEX IF NOT EXISTS idx_payments_payer ON public.payments(payer_id);

CREATE POLICY "Payers view own business payments"
ON public.payments FOR SELECT TO authenticated
USING (payer_id = auth.uid());

-- 3. Extend the existing Nalavation service request pipeline
ALTER TABLE public.nalavation_service_requests
  ADD COLUMN IF NOT EXISTS business_unit business_unit NOT NULL DEFAULT 'nalavation',
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'ZAR',
  ADD COLUMN IF NOT EXISTS billing_cycle text NOT NULL DEFAULT 'once_off',
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.digital_practice_projects(id) ON DELETE SET NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.nalavation_service_requests TO authenticated;
GRANT ALL ON public.nalavation_service_requests TO service_role;

-- 4. Recurring digital service subscriptions
CREATE TABLE public.service_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit business_unit NOT NULL DEFAULT 'nalavation',
  doctor_id uuid NOT NULL,
  project_id uuid REFERENCES public.digital_practice_projects(id) ON DELETE SET NULL,
  service_code text,
  name text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'ZAR',
  billing_cycle text NOT NULL DEFAULT 'monthly',
  status text NOT NULL DEFAULT 'active',
  started_on date NOT NULL DEFAULT CURRENT_DATE,
  next_billing_on date,
  cancelled_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_subscriptions TO authenticated;
GRANT ALL ON public.service_subscriptions TO service_role;

ALTER TABLE public.service_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage subscriptions"
ON public.service_subscriptions FOR ALL TO authenticated
USING (public.is_platform_admin(auth.uid()))
WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE POLICY "Doctors view own subscriptions"
ON public.service_subscriptions FOR SELECT TO authenticated
USING (doctor_id = auth.uid());

CREATE TRIGGER trg_subs_updated_at BEFORE UPDATE ON public.service_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
