-- Create consultation categories table
CREATE TABLE public.consultation_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  min_price numeric NOT NULL,
  max_price numeric NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.consultation_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active categories" ON public.consultation_categories
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage categories" ON public.consultation_categories
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add consultation_category_id to doctors table
ALTER TABLE public.doctors ADD COLUMN consultation_category_id uuid REFERENCES public.consultation_categories(id);

-- Seed the three initial categories
INSERT INTO public.consultation_categories (name, description, min_price, max_price, sort_order) VALUES
  ('General Consultation', 'Suitable for common everyday health concerns, follow-up care, basic medical advice, general health assessments, minor symptoms, routine check-ins, and first-line online doctor consultations.', 297, 497, 1),
  ('Specialist Consultation', 'Suitable for advanced or specialist-level medical consultations where the patient needs specialist expertise, deeper assessment, specialist opinion, or condition-specific care.', 597, 997, 2),
  ('Psychologist Consultation', 'Suitable for mental health consultations, emotional wellbeing support, stress management, trauma support, anxiety, depression support, counselling-related sessions, and psychology-based online consultations.', 497, 897, 3);

-- Updated_at trigger
CREATE TRIGGER update_consultation_categories_updated_at
  BEFORE UPDATE ON public.consultation_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();