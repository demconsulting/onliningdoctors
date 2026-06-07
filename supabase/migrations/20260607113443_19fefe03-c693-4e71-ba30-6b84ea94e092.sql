
CREATE OR REPLACE FUNCTION public.admin_recruitment_funnel()
RETURNS TABLE(stage text, current_count bigint, prior_count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  WITH stages(s, ord) AS (
    VALUES
      ('lead',1),('contacted',2),('interested',3),('meeting_scheduled',4),
      ('demo_completed',5),('invited',6),('registered',7),('pending_verification',8),
      ('verified',9),('founding_doctor',10),('activated',11),('first_consultation_completed',12)
  ),
  d AS (
    SELECT
      d.profile_id,
      d.is_verified,
      d.is_founding_doctor,
      d.created_at,
      EXISTS(SELECT 1 FROM doctor_availability da WHERE da.doctor_id = d.profile_id) AS has_av,
      EXISTS(SELECT 1 FROM appointments a WHERE a.doctor_id = d.profile_id AND a.status = 'completed') AS has_consult
    FROM doctors d
    WHERE d.is_suspended = false
  ),
  doc_counts AS (
    SELECT 'registered'::text AS s, count(*)::bigint AS c,
           count(*) FILTER (WHERE created_at < now() - interval '30 days')::bigint AS p FROM d
    UNION ALL
    SELECT 'pending_verification', count(*) FILTER (WHERE NOT is_verified),
           count(*) FILTER (WHERE NOT is_verified AND created_at < now() - interval '30 days') FROM d
    UNION ALL
    SELECT 'verified', count(*) FILTER (WHERE is_verified),
           count(*) FILTER (WHERE is_verified AND created_at < now() - interval '30 days') FROM d
    UNION ALL
    SELECT 'founding_doctor', count(*) FILTER (WHERE is_founding_doctor),
           count(*) FILTER (WHERE is_founding_doctor AND created_at < now() - interval '30 days') FROM d
    UNION ALL
    SELECT 'activated', count(*) FILTER (WHERE is_verified AND has_av), 0::bigint FROM d
    UNION ALL
    SELECT 'first_consultation_completed', count(*) FILTER (WHERE has_consult), 0::bigint FROM d
  ),
  prospect_counts AS (
    SELECT s, count(*)::bigint AS c,
           count(*) FILTER (WHERE updated_at < now() - interval '30 days')::bigint AS p
    FROM recruitment_prospects, stages WHERE stage = stages.s
    GROUP BY s
  )
  SELECT
    st.s AS stage,
    GREATEST(
      coalesce((SELECT c FROM doc_counts WHERE doc_counts.s = st.s), 0),
      coalesce((SELECT c FROM prospect_counts WHERE prospect_counts.s = st.s), 0)
    )::bigint AS current_count,
    GREATEST(
      coalesce((SELECT p FROM doc_counts WHERE doc_counts.s = st.s), 0),
      coalesce((SELECT p FROM prospect_counts WHERE prospect_counts.s = st.s), 0)
    )::bigint AS prior_count
  FROM stages st
  ORDER BY st.ord;
END;
$$;
