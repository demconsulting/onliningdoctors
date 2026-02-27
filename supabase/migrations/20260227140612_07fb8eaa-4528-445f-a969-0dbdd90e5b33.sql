
-- Key-value store for editable site content (hero section, etc.)
CREATE TABLE public.site_content (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

-- Anyone can read site content
CREATE POLICY "Anyone can view site content"
ON public.site_content FOR SELECT
USING (true);

-- Only admins can manage
CREATE POLICY "Admins can manage site content"
ON public.site_content FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Seed default hero content
INSERT INTO public.site_content (key, value) VALUES
('hero', '{
  "badge": "Trusted Online Healthcare",
  "title": "Your Doctor,",
  "highlight": "One Click Away",
  "subtitle": "Connect with certified specialists via secure video consultations. Book appointments, share documents, and get care — all from home.",
  "cta_primary": "Find a Doctor",
  "cta_secondary": "Get Started Free",
  "features": [
    {"icon": "Video", "label": "HD Video Calls", "sub": "Crystal clear"},
    {"icon": "Shield", "label": "End-to-End Encrypted", "sub": "Your data is safe"},
    {"icon": "Clock", "label": "24/7 Available", "sub": "Anytime, anywhere"}
  ]
}'::jsonb);

-- Trigger for updated_at
CREATE TRIGGER update_site_content_updated_at
BEFORE UPDATE ON public.site_content
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
