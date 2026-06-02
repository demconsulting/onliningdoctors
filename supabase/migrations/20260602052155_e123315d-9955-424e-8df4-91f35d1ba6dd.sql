
-- Categories
CREATE TABLE public.expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  parent_group text NOT NULL DEFAULT 'Other',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_categories TO authenticated;
GRANT ALL ON public.expense_categories TO service_role;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage expense categories" ON public.expense_categories
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

-- Recurring expenses
CREATE TABLE public.recurring_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  supplier text,
  description text NOT NULL,
  amount numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'ZAR',
  frequency text NOT NULL DEFAULT 'monthly', -- monthly | yearly | weekly | quarterly
  next_due_date date NOT NULL,
  reminder_days integer NOT NULL DEFAULT 7,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recurring_expenses TO authenticated;
GRANT ALL ON public.recurring_expenses TO service_role;
ALTER TABLE public.recurring_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage recurring expenses" ON public.recurring_expenses
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

-- Expenses
CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  category_id uuid REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  supplier text,
  description text NOT NULL,
  amount numeric(12,2) NOT NULL,
  vat_amount numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'ZAR',
  payment_method text,
  status text NOT NULL DEFAULT 'paid', -- paid | pending | overdue
  receipt_path text,
  notes text,
  tax_deductible boolean NOT NULL DEFAULT true,
  recurring_expense_id uuid REFERENCES public.recurring_expenses(id) ON DELETE SET NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_expenses_date ON public.expenses(expense_date DESC);
CREATE INDEX idx_expenses_category ON public.expenses(category_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage expenses" ON public.expenses
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

-- Updated_at triggers
CREATE TRIGGER trg_expenses_updated_at BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_recurring_expenses_updated_at BEFORE UPDATE ON public.recurring_expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Receipts bucket (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('expense-receipts','expense-receipts', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins read expense receipts" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'expense-receipts' AND has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins upload expense receipts" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'expense-receipts' AND has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins update expense receipts" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'expense-receipts' AND has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins delete expense receipts" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'expense-receipts' AND has_role(auth.uid(),'admin'::app_role));

-- Seed categories
INSERT INTO public.expense_categories (name, slug, parent_group, sort_order) VALUES
  ('Supabase','supabase','Technology',10),
  ('Resend','resend','Technology',20),
  ('Web Hosting','web-hosting','Technology',30),
  ('Domains','domains','Technology',40),
  ('TURN Server','turn-server','Technology',50),
  ('Cloud Storage','cloud-storage','Technology',60),
  ('SSL Certificates','ssl-certificates','Technology',70),
  ('SMS','sms','Technology',80),
  ('WhatsApp','whatsapp','Technology',90),
  ('AI Services','ai-services','Technology',100),
  ('Salaries','salaries','Operations',110),
  ('Contractors','contractors','Operations',120),
  ('Support Staff','support-staff','Operations',130),
  ('Legal','legal','Operations',140),
  ('Accounting','accounting','Operations',150),
  ('Insurance','insurance','Operations',160),
  ('Facebook Ads','facebook-ads','Marketing',170),
  ('Google Ads','google-ads','Marketing',180),
  ('Influencer Marketing','influencer-marketing','Marketing',190),
  ('Referral Commissions','referral-commissions','Marketing',200),
  ('Events','events','Marketing',210),
  ('Printing','printing','Marketing',220),
  ('Office Costs','office-costs','Administration',230),
  ('Travel','travel','Administration',240),
  ('Equipment','equipment','Administration',250),
  ('Licences','licences','Administration',260),
  ('Other','other','Other',999)
ON CONFLICT (slug) DO NOTHING;
