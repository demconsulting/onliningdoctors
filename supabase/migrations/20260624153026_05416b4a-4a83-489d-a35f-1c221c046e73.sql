
-- Restrict elevated role management to super_admin only
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

-- Regular admins may manage non-elevated roles; only super_admin may manage elevated roles
CREATE POLICY "Admins manage non-elevated roles (insert)"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND role::text NOT IN ('platform_admin','super_admin','admin')
);

CREATE POLICY "Super admins manage any role (insert)"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Admins manage non-elevated roles (update)"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND role::text NOT IN ('platform_admin','super_admin','admin')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND role::text NOT IN ('platform_admin','super_admin','admin')
);

CREATE POLICY "Super admins manage any role (update)"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins manage non-elevated roles (delete)"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND role::text NOT IN ('platform_admin','super_admin','admin')
);

CREATE POLICY "Super admins manage any role (delete)"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role));
