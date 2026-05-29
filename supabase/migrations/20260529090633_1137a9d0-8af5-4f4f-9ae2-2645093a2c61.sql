
-- Add account_status to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active'
  CHECK (account_status IN ('active','suspended','deactivated','archived','pending_verification'));

CREATE INDEX IF NOT EXISTS idx_profiles_account_status ON public.profiles(account_status);

-- Admin user action logs table
CREATE TABLE IF NOT EXISTS public.admin_user_action_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  target_user_id uuid NOT NULL,
  action_type text NOT NULL,
  reason text NOT NULL,
  notes text,
  previous_status text,
  new_status text,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.admin_user_action_logs TO authenticated;
GRANT ALL ON public.admin_user_action_logs TO service_role;

ALTER TABLE public.admin_user_action_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view user action logs"
  ON public.admin_user_action_logs FOR SELECT TO authenticated
  USING (public.can_impersonate(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_aual_target ON public.admin_user_action_logs(target_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_aual_admin  ON public.admin_user_action_logs(admin_user_id, created_at DESC);

-- Helper: check if a user has any linked records that should block permanent delete
CREATE OR REPLACE FUNCTION public.user_delete_dependencies(_user_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'appointments', (SELECT count(*) FROM public.appointments WHERE patient_id = _user_id OR doctor_id = _user_id),
    'consultation_notes', (SELECT count(*) FROM public.consultation_notes WHERE doctor_id = _user_id),
    'prescriptions', COALESCE((SELECT count(*) FROM public.prescriptions WHERE patient_id = _user_id OR doctor_id = _user_id), 0),
    'payments', COALESCE((SELECT count(*) FROM public.payments WHERE patient_id = _user_id OR doctor_id = _user_id), 0),
    'medical_aid_requests', (SELECT count(*) FROM public.medical_aid_requests WHERE patient_id = _user_id OR doctor_id = _user_id),
    'audit_logs', (SELECT count(*) FROM public.audit_logs WHERE user_id = _user_id),
    'dependents', (SELECT count(*) FROM public.dependents WHERE guardian_id = _user_id OR linked_user_id = _user_id)
  );
$$;
