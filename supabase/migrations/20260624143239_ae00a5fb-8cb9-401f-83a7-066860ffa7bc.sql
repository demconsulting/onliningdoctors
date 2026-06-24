
CREATE TABLE public.financial_currency_conversions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  original_currency TEXT NOT NULL,
  original_amount NUMERIC(14,2) NOT NULL,
  exchange_rate NUMERIC(18,8) NOT NULL DEFAULT 0,
  converted_currency TEXT NOT NULL DEFAULT 'ZAR',
  converted_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  conversion_method TEXT NOT NULL DEFAULT 'fixed_rate',
  converted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  conversion_note TEXT,
  include_in_totals BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT financial_currency_conversions_payment_unique UNIQUE (payment_id),
  CONSTRAINT financial_currency_conversions_method_check CHECK (
    conversion_method IN ('fixed_rate','manual','excluded','test_payment')
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_currency_conversions TO authenticated;
GRANT ALL ON public.financial_currency_conversions TO service_role;

ALTER TABLE public.financial_currency_conversions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view conversions"
  ON public.financial_currency_conversions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Admins can insert conversions"
  ON public.financial_currency_conversions FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Admins can update conversions"
  ON public.financial_currency_conversions FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Admins can delete conversions"
  ON public.financial_currency_conversions FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER update_financial_currency_conversions_updated_at
  BEFORE UPDATE ON public.financial_currency_conversions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_fcc_payment_id ON public.financial_currency_conversions(payment_id);
CREATE INDEX idx_fcc_include ON public.financial_currency_conversions(include_in_totals) WHERE include_in_totals = true;
