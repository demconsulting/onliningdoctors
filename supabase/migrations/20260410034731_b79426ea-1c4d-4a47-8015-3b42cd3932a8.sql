
-- Add suspension fields to profiles
ALTER TABLE public.profiles
ADD COLUMN is_suspended boolean NOT NULL DEFAULT false,
ADD COLUMN suspension_reason text;
