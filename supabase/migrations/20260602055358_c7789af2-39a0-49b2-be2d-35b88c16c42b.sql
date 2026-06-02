ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
ALTER TABLE public.appointments ADD CONSTRAINT appointments_status_check
CHECK (status IN ('pending','awaiting_payment','confirmed','booked','paid','in_progress','completed','done','cancelled','expired','no_show','doctor_no_show','rejected'));