
DROP VIEW IF EXISTS public.public_reviews;
DROP VIEW IF EXISTS public.doctor_blocked_times_public;

CREATE OR REPLACE FUNCTION public.get_public_reviews(_doctor_id uuid)
RETURNS TABLE (
  id uuid,
  doctor_id uuid,
  rating integer,
  comment text,
  doctor_clear_helpful boolean,
  doctor_professional boolean,
  would_recommend boolean,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, doctor_id, rating, comment,
         doctor_clear_helpful, doctor_professional, would_recommend,
         created_at
  FROM public.reviews
  WHERE doctor_id = _doctor_id
    AND is_visible = true
    AND moderation_status = 'approved'
  ORDER BY created_at DESC
$$;

REVOKE ALL ON FUNCTION public.get_public_reviews(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_public_reviews(uuid) TO anon, authenticated;
