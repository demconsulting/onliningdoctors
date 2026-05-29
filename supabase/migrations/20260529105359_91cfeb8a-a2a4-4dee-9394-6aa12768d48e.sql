
-- 1. Recreate user_delete_dependencies WITHOUT audit_logs so they don't block deletion.
--    Blocking categories: appointments, consultation_notes, prescriptions, payments,
--    medical_aid_requests, consultations (via consultation_outcomes).
CREATE OR REPLACE FUNCTION public.user_delete_dependencies(_user_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'appointments', (SELECT count(*) FROM public.appointments WHERE patient_id = _user_id OR doctor_id = _user_id),
    'consultation_notes', (SELECT count(*) FROM public.consultation_notes WHERE doctor_id = _user_id),
    'consultations', (SELECT count(*) FROM public.consultation_outcomes WHERE doctor_id = _user_id),
    'prescriptions', COALESCE((SELECT count(*) FROM public.prescriptions WHERE patient_id = _user_id OR doctor_id = _user_id), 0),
    'payments', COALESCE((SELECT count(*) FROM public.payments WHERE patient_id = _user_id OR doctor_id = _user_id), 0),
    'medical_aid_requests', (SELECT count(*) FROM public.medical_aid_requests WHERE patient_id = _user_id OR doctor_id = _user_id)
  );
$function$;

-- 2. Platform settings table for runtime toggles such as
--    "Allow permanent deletion of test users".
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_settings TO authenticated;
GRANT ALL ON public.platform_settings TO service_role;

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage platform settings" ON public.platform_settings;
CREATE POLICY "Admins manage platform settings"
ON public.platform_settings
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.can_impersonate(auth.uid()))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.can_impersonate(auth.uid()));

INSERT INTO public.platform_settings (key, value, description)
VALUES (
  'allow_permanent_test_user_deletion',
  'true'::jsonb,
  'Allow platform admins to permanently delete users flagged as test/demo/test-environment.'
)
ON CONFLICT (key) DO NOTHING;
