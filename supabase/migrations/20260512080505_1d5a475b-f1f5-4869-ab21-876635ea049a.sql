
-- 1) Restrict doctor_blocked_times: drop broad authenticated SELECT, expose slot data via RPC
DROP POLICY IF EXISTS "Authenticated users can view blocked times (slot picking)" ON public.doctor_blocked_times;

CREATE OR REPLACE FUNCTION public.get_doctor_blocked_slots(_doctor_id uuid)
RETURNS TABLE(start_time timestamptz, end_time timestamptz)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.start_time, b.end_time
  FROM public.doctor_blocked_times b
  WHERE b.doctor_id = _doctor_id
    AND b.end_time >= now();
$$;

GRANT EXECUTE ON FUNCTION public.get_doctor_blocked_slots(uuid) TO anon, authenticated;

-- 2) Reviews: drop broad authenticated SELECT; public reads must go through get_public_reviews RPC.
DROP POLICY IF EXISTS "Authenticated can view approved visible reviews" ON public.reviews;

GRANT EXECUTE ON FUNCTION public.get_public_reviews(uuid) TO anon, authenticated;

-- 3) ai_conversations: enforce non-null user_id so visitor rows cannot orphan
UPDATE public.ai_conversations SET user_id = '00000000-0000-0000-0000-000000000000'::uuid WHERE user_id IS NULL;
ALTER TABLE public.ai_conversations ALTER COLUMN user_id SET NOT NULL;

-- 4) platform_fee_settings: drop public read; restrict to authenticated users
DROP POLICY IF EXISTS "Anyone can view active fee settings" ON public.platform_fee_settings;

CREATE POLICY "Authenticated can view active fee settings"
ON public.platform_fee_settings
FOR SELECT
TO authenticated
USING (is_active = true);
