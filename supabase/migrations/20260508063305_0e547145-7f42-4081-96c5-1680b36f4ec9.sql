
-- Platform fee settings: global defaults + named plans (e.g. VIP, Promo)
CREATE TABLE public.platform_fee_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  platform_fee_percent numeric NOT NULL DEFAULT 10,
  processing_fee_percent numeric NOT NULL DEFAULT 0,
  processing_fee_fixed numeric NOT NULL DEFAULT 0,
  fixed_transaction_fee numeric NOT NULL DEFAULT 0,
  vat_enabled boolean NOT NULL DEFAULT false,
  vat_percent numeric NOT NULL DEFAULT 0,
  fee_bearer text NOT NULL DEFAULT 'doctor',
  payout_schedule text NOT NULL DEFAULT 'manual',
  minimum_payout numeric NOT NULL DEFAULT 200,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Only one default plan
CREATE UNIQUE INDEX platform_fee_settings_one_default
  ON public.platform_fee_settings (is_default) WHERE is_default = true;

ALTER TABLE public.platform_fee_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active fee settings"
  ON public.platform_fee_settings FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage fee settings"
  ON public.platform_fee_settings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_platform_fee_settings_updated
  BEFORE UPDATE ON public.platform_fee_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed a default plan matching current behavior (10% platform + ~R5.50 processing flat)
INSERT INTO public.platform_fee_settings
  (name, description, is_default, platform_fee_percent, processing_fee_percent, processing_fee_fixed, fee_bearer)
VALUES
  ('Default', 'Standard platform pricing applied to all doctors', true, 10, 0, 5.50, 'doctor');

-- Doctor-specific override
ALTER TABLE public.doctors
  ADD COLUMN fee_settings_id uuid REFERENCES public.platform_fee_settings(id) ON DELETE SET NULL;
