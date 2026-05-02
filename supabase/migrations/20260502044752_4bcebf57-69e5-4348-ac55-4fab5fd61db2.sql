
-- 1. Reviews: hide internal moderation columns from anon
REVOKE SELECT ON public.reviews FROM anon;
GRANT SELECT (
  id, appointment_id, patient_id, doctor_id, rating, comment,
  doctor_clear_helpful, doctor_professional, would_recommend,
  created_at, updated_at
) ON public.reviews TO anon;

-- 2. ai_audit_logs: restrict INSERT to authenticated, must match auth.uid()
DROP POLICY IF EXISTS "Anyone can insert ai audit logs" ON public.ai_audit_logs;
CREATE POLICY "Authenticated users can insert own ai audit logs"
ON public.ai_audit_logs
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND length(action) > 0
);

-- 3. patient_medical_info: allow treating doctor read access
DROP POLICY IF EXISTS "Doctors can view medical info for their active patients" ON public.patient_medical_info;
CREATE POLICY "Doctors can view medical info for their active patients"
ON public.patient_medical_info
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.patient_id = patient_medical_info.patient_id
      AND a.doctor_id = auth.uid()
      AND a.status IN ('confirmed', 'completed')
  )
);

-- 4. Realtime channel authorization
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users read own topic" ON realtime.messages;
CREATE POLICY "Authenticated users read own topic"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() LIKE '%' || auth.uid()::text || '%'
);

DROP POLICY IF EXISTS "Authenticated users write own topic" ON realtime.messages;
CREATE POLICY "Authenticated users write own topic"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  realtime.topic() LIKE '%' || auth.uid()::text || '%'
);

-- 5. Lock down SECURITY DEFINER trigger functions: revoke EXECUTE
REVOKE EXECUTE ON FUNCTION public.log_sensitive_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.flag_review_keywords() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_appointment_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.expire_stale_payments() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_dependent_is_minor() FROM PUBLIC, anon, authenticated;
-- Keep has_role callable by authenticated (used by RLS); revoke from anon
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

-- 6. Avatars bucket: stop allowing arbitrary listing
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
