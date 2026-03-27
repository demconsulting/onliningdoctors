
CREATE TABLE public.prescription_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  condition text,
  diagnosis text,
  medications jsonb NOT NULL DEFAULT '[]'::jsonb,
  pharmacy_notes text,
  warnings text,
  refill_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.prescription_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors can manage own templates"
ON public.prescription_templates FOR ALL TO authenticated
USING (doctor_id = auth.uid())
WITH CHECK (doctor_id = auth.uid());

CREATE TRIGGER update_prescription_templates_updated_at
  BEFORE UPDATE ON public.prescription_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
