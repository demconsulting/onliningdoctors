
DO $$ BEGIN
  CREATE TYPE pricing_tier_type AS ENUM ('private','medical_aid','follow_up','specialist');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.doctor_pricing_tiers ADD COLUMN IF NOT EXISTS tier_type pricing_tier_type;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS payment_method_type text;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS pricing_tier_type pricing_tier_type;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS transaction_type text;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS auto_weekly_payout boolean NOT NULL DEFAULT false;
