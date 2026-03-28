
-- Countries table for admin-managed country/currency data
CREATE TABLE public.countries (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  currency_code TEXT NOT NULL,
  currency_symbol TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active countries" ON public.countries
  FOR SELECT TO public USING (true);

CREATE POLICY "Admins can manage countries" ON public.countries
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Legal documents table (global defaults + country overrides)
CREATE TABLE public.legal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type TEXT NOT NULL CHECK (document_type IN ('terms', 'privacy')),
  country_code TEXT DEFAULT NULL REFERENCES public.countries(code) ON DELETE CASCADE,
  heading TEXT NOT NULL,
  last_updated TEXT NOT NULL DEFAULT 'March 2026',
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Only one default per document_type
CREATE UNIQUE INDEX legal_documents_default_unique 
  ON public.legal_documents (document_type) 
  WHERE is_default = true;

-- Only one override per country per document_type
CREATE UNIQUE INDEX legal_documents_country_unique 
  ON public.legal_documents (document_type, country_code) 
  WHERE country_code IS NOT NULL;

ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view legal documents" ON public.legal_documents
  FOR SELECT TO public USING (true);

CREATE POLICY "Admins can manage legal documents" ON public.legal_documents
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed countries from existing data
INSERT INTO public.countries (code, name, currency_code, currency_symbol) VALUES
  ('ZA', 'South Africa', 'ZAR', 'R'),
  ('NG', 'Nigeria', 'NGN', '₦'),
  ('KE', 'Kenya', 'KES', 'KSh'),
  ('GH', 'Ghana', 'GHS', 'GH₵'),
  ('TZ', 'Tanzania', 'TZS', 'TSh'),
  ('UG', 'Uganda', 'UGX', 'USh'),
  ('EG', 'Egypt', 'EGP', 'E£'),
  ('ET', 'Ethiopia', 'ETB', 'Br'),
  ('RW', 'Rwanda', 'RWF', 'FRw'),
  ('US', 'United States', 'USD', '$'),
  ('GB', 'United Kingdom', 'GBP', '£'),
  ('IN', 'India', 'INR', '₹'),
  ('BW', 'Botswana', 'BWP', 'P'),
  ('ZW', 'Zimbabwe', 'ZWL', 'Z$'),
  ('MZ', 'Mozambique', 'MZN', 'MT'),
  ('NA', 'Namibia', 'NAD', 'N$'),
  ('AO', 'Angola', 'AOA', 'Kz'),
  ('CD', 'Democratic Republic of the Congo', 'CDF', 'FC'),
  ('CM', 'Cameroon', 'XAF', 'FCFA'),
  ('CI', 'Ivory Coast', 'XOF', 'CFA'),
  ('SN', 'Senegal', 'XOF', 'CFA'),
  ('ML', 'Mali', 'XOF', 'CFA'),
  ('MG', 'Madagascar', 'MGA', 'Ar'),
  ('MW', 'Malawi', 'MWK', 'MK'),
  ('ZM', 'Zambia', 'ZMW', 'ZK'),
  ('CA', 'Canada', 'CAD', 'C$'),
  ('AU', 'Australia', 'AUD', 'A$'),
  ('DE', 'Germany', 'EUR', '€'),
  ('FR', 'France', 'EUR', '€')
ON CONFLICT (code) DO NOTHING;

-- Add updated_at trigger
CREATE TRIGGER update_legal_documents_updated_at
  BEFORE UPDATE ON public.legal_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
