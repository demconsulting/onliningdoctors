ALTER FUNCTION public.touch_updated_at() SET search_path = public;
ALTER FUNCTION public.touch_payment_gateway_credentials() SET search_path = public;

DROP POLICY IF EXISTS "role matrix readable" ON public.role_permissions;
CREATE POLICY "Admins can read role matrix"
ON public.role_permissions
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'platform_admin')
  OR public.has_role(auth.uid(), 'super_admin')
);