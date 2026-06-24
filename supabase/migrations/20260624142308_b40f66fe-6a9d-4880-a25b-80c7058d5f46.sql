
CREATE POLICY "Admins can insert impersonation logs"
  ON public.admin_impersonation_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    can_impersonate(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Doctors manage own expenses"
  ON public.expenses
  FOR ALL
  TO authenticated
  USING (created_by = auth.uid() AND has_role(auth.uid(), 'doctor'::app_role))
  WITH CHECK (created_by = auth.uid() AND has_role(auth.uid(), 'doctor'::app_role));

CREATE POLICY "Doctors manage own recurring expenses"
  ON public.recurring_expenses
  FOR ALL
  TO authenticated
  USING (created_by = auth.uid() AND has_role(auth.uid(), 'doctor'::app_role))
  WITH CHECK (created_by = auth.uid() AND has_role(auth.uid(), 'doctor'::app_role));

DROP POLICY IF EXISTS "Admins and doctors can view active fee settings" ON public.platform_fee_settings;

CREATE POLICY "Admins view all active fee settings"
  ON public.platform_fee_settings
  FOR SELECT
  TO authenticated
  USING (is_active = true AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Doctors view only their assigned fee settings"
  ON public.platform_fee_settings
  FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND has_role(auth.uid(), 'doctor'::app_role)
    AND (
      id IN (SELECT fee_settings_id FROM public.doctors WHERE profile_id = auth.uid() AND fee_settings_id IS NOT NULL)
      OR (is_founding_plan = true AND EXISTS (
        SELECT 1 FROM public.doctors WHERE profile_id = auth.uid() AND is_founding_doctor = true
      ))
      OR (is_default = true AND NOT EXISTS (
        SELECT 1 FROM public.doctors WHERE profile_id = auth.uid() AND fee_settings_id IS NOT NULL
      ))
    )
  );
