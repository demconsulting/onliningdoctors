ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_dependent_id_fkey
  FOREIGN KEY (dependent_id) REFERENCES public.dependents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_dependent_id ON public.appointments(dependent_id);