
-- 1) Widen stage constraint + cached timestamps on existing table
ALTER TABLE public.recruitment_prospects DROP CONSTRAINT IF EXISTS recruitment_prospects_stage_check;
ALTER TABLE public.recruitment_prospects ADD CONSTRAINT recruitment_prospects_stage_check
  CHECK (stage = ANY (ARRAY[
    'lead','contacted','interested','meeting_scheduled','demo_completed',
    'invited','registered','pending_verification','verified','founding_doctor',
    'declined','awaiting_cohort_activation','activated','first_consultation_completed','active_doctor'
  ]));

ALTER TABLE public.recruitment_prospects
  ADD COLUMN IF NOT EXISTS activated_at timestamptz,
  ADD COLUMN IF NOT EXISTS first_consultation_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_activity_at timestamptz;

-- 2) Activation events
CREATE TABLE IF NOT EXISTS public.recruitment_activation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid REFERENCES public.recruitment_prospects(id) ON DELETE SET NULL,
  doctor_profile_id uuid,
  event_type text NOT NULL CHECK (event_type IN ('verified','awaiting_cohort','activated','first_consultation','active')),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recruitment_activation_events TO authenticated;
GRANT ALL ON public.recruitment_activation_events TO service_role;
ALTER TABLE public.recruitment_activation_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage activation events" ON public.recruitment_activation_events
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX IF NOT EXISTS idx_rae_doctor ON public.recruitment_activation_events(doctor_profile_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_rae_prospect ON public.recruitment_activation_events(prospect_id, occurred_at DESC);

-- 3) Early access interest
CREATE TABLE IF NOT EXISTS public.recruitment_early_access_interest (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_profile_id uuid,
  prospect_id uuid REFERENCES public.recruitment_prospects(id) ON DELETE SET NULL,
  email text,
  feature_key text NOT NULL CHECK (feature_key IN (
    'practice_management','financial_management','medical_aid_automation',
    'tax_reports','bank_reconciliation','enterprise_tools'
  )),
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recruitment_early_access_interest TO authenticated;
GRANT ALL ON public.recruitment_early_access_interest TO service_role;
ALTER TABLE public.recruitment_early_access_interest ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage early access interest" ON public.recruitment_early_access_interest
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX IF NOT EXISTS idx_reai_feature ON public.recruitment_early_access_interest(feature_key);

-- 4) Source catalog
CREATE TABLE IF NOT EXISTS public.recruitment_source_catalog (
  key text PRIMARY KEY,
  label text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.recruitment_source_catalog TO authenticated;
GRANT ALL ON public.recruitment_source_catalog TO service_role;
ALTER TABLE public.recruitment_source_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read source catalog" ON public.recruitment_source_catalog
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage source catalog" ON public.recruitment_source_catalog
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.recruitment_source_catalog(key, label, sort_order) VALUES
  ('referral','Referral',1),
  ('linkedin','LinkedIn',2),
  ('whatsapp','WhatsApp',3),
  ('medical_centre','Medical Centre',4),
  ('facebook','Facebook',5),
  ('website','Website',6),
  ('event','Event',7),
  ('other','Other',99)
ON CONFLICT (key) DO NOTHING;

-- 5) Funnel analytics RPC
CREATE OR REPLACE FUNCTION public.admin_recruitment_funnel()
RETURNS TABLE(stage text, current_count bigint, prior_count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  WITH stages(s) AS (
    SELECT unnest(ARRAY[
      'lead','contacted','interested','meeting_scheduled','demo_completed',
      'invited','registered','pending_verification','verified',
      'founding_doctor','activated','first_consultation_completed'
    ])
  )
  SELECT
    s,
    (SELECT count(*) FROM recruitment_prospects p WHERE p.stage = s)::bigint,
    (SELECT count(*) FROM recruitment_prospects p WHERE p.stage = s AND p.updated_at < now() - interval '30 days')::bigint
  FROM stages;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_recruitment_funnel() TO authenticated;

-- 6) Geographic dashboard RPC
CREATE OR REPLACE FUNCTION public.admin_recruitment_geo()
RETURNS TABLE(province text, city text, specialty text, total bigint, verified bigint, founding bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT
    coalesce(p.province,'Unknown') AS province,
    coalesce(p.city,'Unknown') AS city,
    coalesce(p.specialty,'Unknown') AS specialty,
    count(*)::bigint AS total,
    count(*) FILTER (WHERE p.stage IN ('verified','founding_doctor','activated','first_consultation_completed','active_doctor'))::bigint AS verified,
    count(*) FILTER (WHERE p.stage = 'founding_doctor')::bigint AS founding
  FROM recruitment_prospects p
  GROUP BY 1,2,3
  ORDER BY total DESC;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_recruitment_geo() TO authenticated;

-- 7) Source conversion RPC
CREATE OR REPLACE FUNCTION public.admin_recruitment_source_stats()
RETURNS TABLE(source text, total bigint, registered bigint, verified bigint, conversion_pct numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT
    coalesce(p.referral_source,'unknown') AS source,
    count(*)::bigint AS total,
    count(*) FILTER (WHERE p.stage IN ('registered','pending_verification','verified','founding_doctor','activated','first_consultation_completed','active_doctor'))::bigint AS registered,
    count(*) FILTER (WHERE p.stage IN ('verified','founding_doctor','activated','first_consultation_completed','active_doctor'))::bigint AS verified,
    CASE WHEN count(*) = 0 THEN 0
      ELSE round(100.0 * count(*) FILTER (WHERE p.stage IN ('verified','founding_doctor','activated','first_consultation_completed','active_doctor'))::numeric / count(*)::numeric, 1)
    END AS conversion_pct
  FROM recruitment_prospects p
  GROUP BY 1
  ORDER BY total DESC;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_recruitment_source_stats() TO authenticated;

-- 8) Doctor success list RPC
CREATE OR REPLACE FUNCTION public.admin_doctor_success_list()
RETURNS TABLE(
  doctor_id uuid, profile_id uuid, full_name text, email text,
  registration_date timestamptz, verification_date timestamptz,
  activated_at timestamptz, first_consultation_at timestamptz,
  last_activity_at timestamptz, total_consultations bigint,
  is_verified boolean, is_suspended boolean,
  is_founding_doctor boolean, status text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  WITH consult AS (
    SELECT a.doctor_id AS pid, count(*) FILTER (WHERE a.status = 'completed') AS total,
           min(a.scheduled_at) FILTER (WHERE a.status = 'completed') AS first_done
    FROM appointments a GROUP BY a.doctor_id
  )
  SELECT
    d.id, d.profile_id,
    coalesce(pr.full_name, pr.email, '') AS full_name,
    pr.email,
    d.created_at AS registration_date,
    CASE WHEN d.is_verified THEN d.updated_at END AS verification_date,
    coalesce((SELECT min(occurred_at) FROM recruitment_activation_events e WHERE e.doctor_profile_id = d.profile_id AND e.event_type='activated'), NULL) AS activated_at,
    coalesce(c.first_done, (SELECT min(occurred_at) FROM recruitment_activation_events e WHERE e.doctor_profile_id = d.profile_id AND e.event_type='first_consultation')) AS first_consultation_at,
    pr.updated_at AS last_activity_at,
    coalesce(c.total, 0)::bigint AS total_consultations,
    d.is_verified, d.is_suspended, d.is_founding_doctor,
    CASE
      WHEN d.is_suspended THEN 'suspended'
      WHEN coalesce(c.total,0) > 0 THEN 'active_doctor'
      WHEN d.is_verified THEN 'verified'
      ELSE 'pending'
    END AS status
  FROM doctors d
  LEFT JOIN profiles pr ON pr.id = d.profile_id
  LEFT JOIN consult c ON c.pid = d.profile_id
  ORDER BY d.created_at DESC;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_doctor_success_list() TO authenticated;

-- 9) First-consultation pending RPC
CREATE OR REPLACE FUNCTION public.admin_first_consultation_pending()
RETURNS TABLE(
  profile_id uuid, full_name text, email text,
  verified_at timestamptz, days_since_verified int,
  has_availability boolean, profile_completion_pct int,
  last_activity_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT
    d.profile_id,
    coalesce(pr.full_name, pr.email, ''),
    pr.email,
    d.updated_at AS verified_at,
    GREATEST(0, EXTRACT(day FROM (now() - d.updated_at))::int) AS days_since_verified,
    EXISTS(SELECT 1 FROM doctor_availability da WHERE da.doctor_id = d.profile_id) AS has_availability,
    (
      (CASE WHEN coalesce(d.bio,'') <> '' THEN 15 ELSE 0 END) +
      (CASE WHEN coalesce(d.specialty_id::text,'') <> '' THEN 15 ELSE 0 END) +
      (CASE WHEN coalesce(d.license_number,'') <> '' THEN 10 ELSE 0 END) +
      (CASE WHEN coalesce(d.consultation_fee,0) > 0 THEN 10 ELSE 0 END) +
      (CASE WHEN coalesce(pr.avatar_url,'') <> '' THEN 15 ELSE 0 END) +
      (CASE WHEN EXISTS(SELECT 1 FROM doctor_availability da WHERE da.doctor_id = d.profile_id) THEN 20 ELSE 0 END) +
      (CASE WHEN d.is_verified THEN 15 ELSE 0 END)
    )::int AS profile_completion_pct,
    pr.updated_at
  FROM doctors d
  LEFT JOIN profiles pr ON pr.id = d.profile_id
  WHERE d.is_verified = true AND d.is_suspended = false
    AND NOT EXISTS(SELECT 1 FROM appointments a WHERE a.doctor_id = d.profile_id AND a.status = 'completed')
  ORDER BY d.updated_at ASC;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_first_consultation_pending() TO authenticated;

-- 10) Doctor health score RPC
CREATE OR REPLACE FUNCTION public.admin_doctor_health_score(_doctor_profile_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  d record; pr record;
  score int := 0;
  recs text[] := ARRAY[]::text[];
  has_av boolean; has_consults boolean; has_reviews boolean;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO d FROM doctors WHERE profile_id = _doctor_profile_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('score',0,'recommendations',ARRAY['Doctor not found']); END IF;
  SELECT * INTO pr FROM profiles WHERE id = _doctor_profile_id;
  has_av := EXISTS(SELECT 1 FROM doctor_availability da WHERE da.doctor_id = _doctor_profile_id);
  has_consults := EXISTS(SELECT 1 FROM appointments a WHERE a.doctor_id = _doctor_profile_id AND a.status='completed');
  has_reviews := false;

  IF coalesce(d.bio,'') <> '' AND coalesce(d.specialty_id::text,'') <> '' THEN score := score + 20;
  ELSE recs := array_append(recs, 'Complete your profile'); END IF;

  IF d.is_verified THEN score := score + 20;
  ELSE recs := array_append(recs, 'Complete verification'); END IF;

  IF has_av THEN score := score + 20;
  ELSE recs := array_append(recs, 'Add Availability'); END IF;

  IF coalesce(pr.avatar_url,'') <> '' THEN score := score + 10;
  ELSE recs := array_append(recs, 'Upload Profile Photo'); END IF;

  IF pr.updated_at > now() - interval '14 days' THEN score := score + 10; END IF;

  IF has_consults THEN score := score + 15;
  ELSE recs := array_append(recs, 'Encourage first consultation'); END IF;

  IF has_reviews THEN score := score + 5; END IF;

  IF NOT d.is_founding_doctor THEN
    recs := array_append(recs, 'Apply for Founding Doctor Program');
  END IF;

  RETURN jsonb_build_object('score', LEAST(score,100), 'recommendations', recs);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_doctor_health_score(uuid) TO authenticated;
