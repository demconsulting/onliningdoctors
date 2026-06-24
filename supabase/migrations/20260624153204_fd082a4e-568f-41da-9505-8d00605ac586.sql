
-- 1. admin_user_action_logs: add INSERT policy
CREATE POLICY "Admins insert their own action logs"
ON public.admin_user_action_logs
FOR INSERT
TO authenticated
WITH CHECK (
  admin_user_id = auth.uid()
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'platform_admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  )
);

-- 2. expense_categories: allow authenticated users to read active categories
CREATE POLICY "Authenticated can read active expense categories"
ON public.expense_categories
FOR SELECT
TO authenticated
USING (is_active = true);

-- 3. platform_fee_settings: drop redundant overlapping admin SELECT policy
DROP POLICY IF EXISTS "Admins view all active fee settings" ON public.platform_fee_settings;
