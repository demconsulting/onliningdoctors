-- Drop the existing constraint and recreate with 'awaiting_payment' status
ALTER TABLE public.appointments DROP CONSTRAINT appointments_status_check;

ALTER TABLE public.appointments ADD CONSTRAINT appointments_status_check 
CHECK (status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'cancelled'::text, 'completed'::text, 'no_show'::text, 'awaiting_payment'::text]));