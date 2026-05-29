CREATE TYPE public.accepted_payment_method_enum AS ENUM ('medical_aid_only', 'card_only', 'both');

ALTER TABLE public.doctors
  ADD COLUMN IF NOT EXISTS accepted_payment_method public.accepted_payment_method_enum NOT NULL DEFAULT 'both';