ALTER TABLE public.payment_gateway_configs
  ADD COLUMN IF NOT EXISTS merchant_id text,
  ADD COLUMN IF NOT EXISTS merchant_key text;

UPDATE public.payment_gateway_configs
SET provider = 'payfast', supported_currencies = ARRAY['ZAR']::text[]
WHERE context = 'nalavation' AND provider = 'paystack';