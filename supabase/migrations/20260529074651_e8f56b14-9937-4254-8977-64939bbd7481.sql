-- Extend role enum with new roles (idempotent)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'platform_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'receptionist';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'hospital_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'department_admin';

-- Authoritative impersonation-permission check.
-- Uses ::text comparison so this migration does not depend on the
-- newly added enum labels being committed yet.
CREATE OR REPLACE FUNCTION public.can_impersonate(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text IN ('platform_admin', 'super_admin')
  );
$$;

-- Audit table
CREATE TABLE public.admin_impersonation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  target_user_id uuid NOT NULL,
  reason text NOT NULL CHECK (length(trim(reason)) >= 5 AND length(reason) <= 1000),
  ip_address text,
  user_agent text,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.admin_impersonation_logs TO authenticated;
GRANT ALL ON public.admin_impersonation_logs TO service_role;

ALTER TABLE public.admin_impersonation_logs ENABLE ROW LEVEL SECURITY;

-- Only platform/super admins (or legacy admins) can read the audit trail.
CREATE POLICY "Admins view impersonation logs"
  ON public.admin_impersonation_logs
  FOR SELECT
  TO authenticated
  USING (
    public.can_impersonate(auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- INSERT / UPDATE only via service_role (Edge Functions). No client policies.

CREATE INDEX idx_impersonation_admin
  ON public.admin_impersonation_logs(admin_user_id, started_at DESC);

CREATE INDEX idx_impersonation_target
  ON public.admin_impersonation_logs(target_user_id, started_at DESC);

CREATE INDEX idx_impersonation_open
  ON public.admin_impersonation_logs(admin_user_id)
  WHERE ended_at IS NULL;