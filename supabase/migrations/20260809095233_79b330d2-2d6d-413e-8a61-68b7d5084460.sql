-- ============ Business unit dimension ============
DO $$ BEGIN
  CREATE TYPE public.business_unit AS ENUM ('doctorsonlining','nalavation','onlining_health','emko','tenderintel');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.profiles         ADD COLUMN IF NOT EXISTS business_unit public.business_unit NOT NULL DEFAULT 'doctorsonlining';
ALTER TABLE public.notifications    ADD COLUMN IF NOT EXISTS business_unit public.business_unit NOT NULL DEFAULT 'doctorsonlining';
ALTER TABLE public.audit_logs       ADD COLUMN IF NOT EXISTS business_unit public.business_unit NOT NULL DEFAULT 'doctorsonlining';
ALTER TABLE public.payments         ADD COLUMN IF NOT EXISTS business_unit public.business_unit NOT NULL DEFAULT 'doctorsonlining';
ALTER TABLE public.support_tickets  ADD COLUMN IF NOT EXISTS business_unit public.business_unit NOT NULL DEFAULT 'doctorsonlining';

-- ============ Helpers ============
CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin','super_admin','platform_admin')
  )
$$;

CREATE OR REPLACE FUNCTION public.owns_doctor_record(_doctor_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.doctors d WHERE d.id = _doctor_id AND d.profile_id = _user_id
  )
$$;

-- ============ Service catalogue ============
CREATE TABLE IF NOT EXISTS public.service_catalogue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit public.business_unit NOT NULL DEFAULT 'nalavation',
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'website',
  description text,
  price numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'ZAR',
  billing_cycle text NOT NULL DEFAULT 'once_off',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_catalogue TO authenticated;
GRANT ALL ON public.service_catalogue TO service_role;
ALTER TABLE public.service_catalogue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sc_admin_all" ON public.service_catalogue FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid())) WITH CHECK (public.is_platform_admin(auth.uid()));
CREATE POLICY "sc_doctor_read" ON public.service_catalogue FOR SELECT TO authenticated
  USING (is_active AND public.has_role(auth.uid(), 'doctor'));

-- ============ Digital practice projects ============
CREATE TABLE IF NOT EXISTS public.digital_practice_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit public.business_unit NOT NULL DEFAULT 'nalavation',
  doctor_id uuid NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  name text NOT NULL,
  package text,
  status text NOT NULL DEFAULT 'onboarding',
  monthly_fee numeric(12,2) NOT NULL DEFAULT 0,
  setup_fee numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'ZAR',
  account_manager uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  start_date date,
  launch_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dpp_doctor ON public.digital_practice_projects(doctor_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.digital_practice_projects TO authenticated;
GRANT ALL ON public.digital_practice_projects TO service_role;
ALTER TABLE public.digital_practice_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dpp_admin_all" ON public.digital_practice_projects FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid())) WITH CHECK (public.is_platform_admin(auth.uid()));
CREATE POLICY "dpp_doctor_read" ON public.digital_practice_projects FOR SELECT TO authenticated
  USING (public.owns_doctor_record(doctor_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.owns_np_project(_project_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.digital_practice_projects p
    JOIN public.doctors d ON d.id = p.doctor_id
    WHERE p.id = _project_id AND d.profile_id = _user_id
  )
$$;

-- ============ Child tables ============
CREATE TABLE IF NOT EXISTS public.websites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit public.business_unit NOT NULL DEFAULT 'nalavation',
  project_id uuid NOT NULL REFERENCES public.digital_practice_projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  primary_domain text,
  platform text NOT NULL DEFAULT 'custom',
  status text NOT NULL DEFAULT 'design',
  live_url text,
  staging_url text,
  launched_on date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.website_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit public.business_unit NOT NULL DEFAULT 'nalavation',
  website_id uuid NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.digital_practice_projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  content text,
  seo_title text,
  seo_description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.website_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit public.business_unit NOT NULL DEFAULT 'nalavation',
  project_id uuid REFERENCES public.digital_practice_projects(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  service_id uuid REFERENCES public.service_catalogue(id) ON DELETE SET NULL,
  quantity integer NOT NULL DEFAULT 1,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'ZAR',
  status text NOT NULL DEFAULT 'pending',
  ordered_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.domain_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit public.business_unit NOT NULL DEFAULT 'nalavation',
  project_id uuid NOT NULL REFERENCES public.digital_practice_projects(id) ON DELETE CASCADE,
  domain_name text NOT NULL,
  registrar text,
  registered_on date,
  expires_on date,
  auto_renew boolean NOT NULL DEFAULT true,
  annual_fee numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'ZAR',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hosting_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit public.business_unit NOT NULL DEFAULT 'nalavation',
  project_id uuid NOT NULL REFERENCES public.digital_practice_projects(id) ON DELETE CASCADE,
  provider text NOT NULL,
  plan text,
  server text,
  username text,
  status text NOT NULL DEFAULT 'active',
  renews_on date,
  monthly_fee numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'ZAR',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ssl_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit public.business_unit NOT NULL DEFAULT 'nalavation',
  project_id uuid NOT NULL REFERENCES public.digital_practice_projects(id) ON DELETE CASCADE,
  domain text NOT NULL,
  issuer text,
  issued_on date,
  expires_on date,
  auto_renew boolean NOT NULL DEFAULT true,
  annual_fee numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.email_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit public.business_unit NOT NULL DEFAULT 'nalavation',
  project_id uuid NOT NULL REFERENCES public.digital_practice_projects(id) ON DELETE CASCADE,
  hosting_account_id uuid REFERENCES public.hosting_accounts(id) ON DELETE SET NULL,
  email_address text NOT NULL,
  mailbox_size_mb integer NOT NULL DEFAULT 5120,
  monthly_fee numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.business_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit public.business_unit NOT NULL DEFAULT 'nalavation',
  doctor_id uuid NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.digital_practice_projects(id) ON DELETE SET NULL,
  legal_name text NOT NULL,
  trading_name text,
  registration_number text,
  vat_number text,
  address text,
  city text,
  province text,
  country text DEFAULT 'South Africa',
  phone text,
  email text,
  website text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.social_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit public.business_unit NOT NULL DEFAULT 'nalavation',
  project_id uuid NOT NULL REFERENCES public.digital_practice_projects(id) ON DELETE CASCADE,
  platform text NOT NULL,
  handle text,
  url text,
  followers integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.seo_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit public.business_unit NOT NULL DEFAULT 'nalavation',
  project_id uuid NOT NULL REFERENCES public.digital_practice_projects(id) ON DELETE CASCADE,
  package text,
  target_keywords text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'active',
  monthly_fee numeric(12,2) NOT NULL DEFAULT 0,
  ranking_score integer,
  last_audit_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.google_business_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit public.business_unit NOT NULL DEFAULT 'nalavation',
  project_id uuid NOT NULL REFERENCES public.digital_practice_projects(id) ON DELETE CASCADE,
  listing_name text NOT NULL,
  listing_url text,
  category text,
  verification_status text NOT NULL DEFAULT 'pending',
  rating numeric(3,2),
  review_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.maintenance_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit public.business_unit NOT NULL DEFAULT 'nalavation',
  project_id uuid NOT NULL REFERENCES public.digital_practice_projects(id) ON DELETE CASCADE,
  plan_name text NOT NULL,
  included_hours numeric(6,2) NOT NULL DEFAULT 0,
  monthly_fee numeric(12,2) NOT NULL DEFAULT 0,
  renews_on date,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.website_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit public.business_unit NOT NULL DEFAULT 'nalavation',
  project_id uuid NOT NULL REFERENCES public.digital_practice_projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'todo',
  priority text NOT NULL DEFAULT 'medium',
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_date date,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.website_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit public.business_unit NOT NULL DEFAULT 'nalavation',
  project_id uuid NOT NULL REFERENCES public.digital_practice_projects(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.website_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit public.business_unit NOT NULL DEFAULT 'nalavation',
  project_id uuid REFERENCES public.digital_practice_projects(id) ON DELETE SET NULL,
  doctor_id uuid NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  invoice_number text NOT NULL UNIQUE,
  description text,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  tax_amount numeric(12,2) NOT NULL DEFAULT 0,
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'ZAR',
  category text NOT NULL DEFAULT 'website',
  is_recurring boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'draft',
  issued_on date NOT NULL DEFAULT CURRENT_DATE,
  due_on date,
  paid_at timestamptz,
  payment_reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.content_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit public.business_unit NOT NULL DEFAULT 'nalavation',
  project_id uuid REFERENCES public.digital_practice_projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text NOT NULL,
  excerpt text,
  body text,
  cover_image_url text,
  status text NOT NULL DEFAULT 'draft',
  author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.landing_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit public.business_unit NOT NULL DEFAULT 'nalavation',
  project_id uuid REFERENCES public.digital_practice_projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text NOT NULL,
  url text,
  conversion_goal text,
  views integer NOT NULL DEFAULT 0,
  conversions integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.project_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit public.business_unit NOT NULL DEFAULT 'nalavation',
  project_id uuid NOT NULL REFERENCES public.digital_practice_projects(id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  note text NOT NULL,
  is_internal boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.project_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit public.business_unit NOT NULL DEFAULT 'nalavation',
  project_id uuid NOT NULL REFERENCES public.digital_practice_projects(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  bucket text NOT NULL DEFAULT 'nalavation',
  storage_path text NOT NULL,
  file_type text,
  size_bytes bigint,
  uploaded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.digital_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit public.business_unit NOT NULL DEFAULT 'nalavation',
  project_id uuid REFERENCES public.digital_practice_projects(id) ON DELETE CASCADE,
  doctor_id uuid REFERENCES public.doctors(id) ON DELETE CASCADE,
  asset_type text NOT NULL DEFAULT 'image',
  name text NOT NULL,
  bucket text NOT NULL DEFAULT 'nalavation',
  storage_path text,
  url text,
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ Grants, RLS, policies, indexes, updated_at triggers ============
DO $$
DECLARE t text;
DECLARE tables text[] := ARRAY[
  'websites','website_pages','website_orders','domain_registrations','hosting_accounts',
  'ssl_certificates','email_accounts','business_profiles','social_profiles','seo_projects',
  'google_business_profiles','maintenance_plans','website_tasks','website_activity',
  'website_invoices','content_articles','landing_pages','project_notes','project_files','digital_assets'
];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format($f$CREATE POLICY "%1$s_admin_all" ON public.%1$I FOR ALL TO authenticated
      USING (public.is_platform_admin(auth.uid())) WITH CHECK (public.is_platform_admin(auth.uid()))$f$, t);
    EXECUTE format('CREATE TRIGGER trg_%1$s_updated_at BEFORE UPDATE ON public.%1$I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t);
  END LOOP;

  -- doctor read access on project-scoped tables
  FOREACH t IN ARRAY ARRAY[
    'websites','website_pages','domain_registrations','hosting_accounts','ssl_certificates',
    'email_accounts','social_profiles','seo_projects','google_business_profiles',
    'maintenance_plans','website_tasks','website_activity','content_articles','landing_pages',
    'project_notes','project_files'
  ] LOOP
    EXECUTE format($f$CREATE POLICY "%1$s_doctor_read" ON public.%1$I FOR SELECT TO authenticated
      USING (project_id IS NOT NULL AND public.owns_np_project(project_id, auth.uid()))$f$, t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%1$s_project ON public.%1$I(project_id)', t);
  END LOOP;

  -- doctor read access on doctor-scoped tables
  FOREACH t IN ARRAY ARRAY['website_orders','business_profiles','website_invoices','digital_assets'] LOOP
    EXECUTE format($f$CREATE POLICY "%1$s_doctor_read" ON public.%1$I FOR SELECT TO authenticated
      USING (doctor_id IS NOT NULL AND public.owns_doctor_record(doctor_id, auth.uid()))$f$, t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%1$s_doctor ON public.%1$I(doctor_id)', t);
  END LOOP;
END $$;

CREATE TRIGGER trg_service_catalogue_updated_at BEFORE UPDATE ON public.service_catalogue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_dpp_updated_at BEFORE UPDATE ON public.digital_practice_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ Seed service catalogue ============
INSERT INTO public.service_catalogue (code, name, category, description, price, billing_cycle) VALUES
  ('website_starter','Starter Practice Website','website','Up to 5 pages, mobile-first, contact form',7500,'once_off'),
  ('website_pro','Professional Practice Website','website','Up to 12 pages, bookings, blog',14500,'once_off'),
  ('hosting_standard','Standard Hosting','hosting','Managed hosting, backups, uptime monitoring',350,'monthly'),
  ('domain_coza','Domain Registration (.co.za)','domain','Annual .co.za domain registration',180,'annual'),
  ('ssl_standard','SSL Certificate','ssl','Annual SSL certificate and installation',450,'annual'),
  ('email_hosting','Business Email Hosting','email','Per mailbox, 5GB storage',85,'monthly'),
  ('seo_basic','SEO Essentials','seo','On-page SEO, monthly reporting',1950,'monthly'),
  ('gbp_setup','Google Business Profile Setup','google','Listing creation, verification, optimisation',1500,'once_off'),
  ('social_setup','Social Profile Setup','social','Facebook, Instagram, LinkedIn setup and branding',2500,'once_off'),
  ('maintenance_care','Website Care Plan','maintenance','Updates, security, 2 hours of changes monthly',650,'monthly'),
  ('article_writing','SEO Article','content','800-1200 word medically reviewed article',950,'once_off'),
  ('landing_page','Campaign Landing Page','marketing','Conversion-focused landing page with tracking',3500,'once_off')
ON CONFLICT (code) DO NOTHING;