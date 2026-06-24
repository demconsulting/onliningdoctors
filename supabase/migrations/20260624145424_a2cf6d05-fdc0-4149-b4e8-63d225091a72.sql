
-- 1. Per-payment fee breakdown
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS processing_fee_percentage numeric,
  ADD COLUMN IF NOT EXISTS processing_fee_amount numeric,
  ADD COLUMN IF NOT EXISTS platform_fee_amount numeric,
  ADD COLUMN IF NOT EXISTS doctor_net_amount numeric,
  ADD COLUMN IF NOT EXISTS last_recalculated_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_recalculated_by uuid;

-- 2. Default processing fee setting
INSERT INTO public.platform_settings (key, value)
VALUES ('default_processing_fee_percent', to_jsonb(3.5))
ON CONFLICT (key) DO NOTHING;

-- 3. Audit log table
CREATE TABLE IF NOT EXISTS public.financial_recalculation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  old_processing_fee_percentage numeric,
  new_processing_fee_percentage numeric NOT NULL,
  scope text NOT NULL,
  payments_updated integer NOT NULL DEFAULT 0,
  payment_ids uuid[],
  notes text,
  recalculation_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.financial_recalculation_logs TO authenticated;
GRANT ALL ON public.financial_recalculation_logs TO service_role;

ALTER TABLE public.financial_recalculation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read recalc logs" ON public.financial_recalculation_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins insert recalc logs" ON public.financial_recalculation_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) AND admin_user_id = auth.uid());

-- 4. RPC: recalculate processing fees
CREATE OR REPLACE FUNCTION public.admin_recalculate_processing_fees(
  _new_pct numeric,
  _scope text,                  -- 'future_only' | 'selected_payments' | 'all_historical'
  _payment_ids uuid[] DEFAULT NULL,
  _notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin uuid := auth.uid();
  v_old_pct numeric;
  v_updated int := 0;
  v_log_id uuid;
  r record;
  v_platform_pct numeric;
  v_amount numeric;
  v_proc numeric;
  v_plat numeric;
  v_net numeric;
  v_eff_amount numeric;
BEGIN
  IF NOT public.has_role(v_admin, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can recalculate processing fees';
  END IF;
  IF _new_pct IS NULL OR _new_pct < 0 OR _new_pct > 100 THEN
    RAISE EXCEPTION 'Invalid processing fee percentage';
  END IF;
  IF _scope NOT IN ('future_only','selected_payments','all_historical') THEN
    RAISE EXCEPTION 'Invalid scope';
  END IF;

  SELECT (value)::text::numeric INTO v_old_pct
    FROM public.platform_settings WHERE key='default_processing_fee_percent';

  -- Always update the default going forward
  INSERT INTO public.platform_settings (key, value)
    VALUES ('default_processing_fee_percent', to_jsonb(_new_pct))
    ON CONFLICT (key) DO UPDATE SET value = to_jsonb(_new_pct);

  IF _scope <> 'future_only' THEN
    FOR r IN
      SELECT p.*,
             c.converted_amount, c.include_in_totals, c.conversion_method
      FROM public.payments p
      LEFT JOIN public.financial_currency_conversions c ON c.payment_id = p.id
      WHERE p.status IN ('paid','completed','successful','success')
        AND (_scope = 'all_historical' OR p.id = ANY(_payment_ids))
    LOOP
      -- Skip test/excluded conversions
      IF r.conversion_method IS NOT NULL THEN
        IF COALESCE(r.include_in_totals, false) = false OR r.conversion_method = 'test_payment' OR r.conversion_method = 'exclude' THEN
          CONTINUE;
        END IF;
        v_eff_amount := COALESCE(r.converted_amount, 0);
      ELSE
        -- Only ZAR native payments included in totals
        IF UPPER(COALESCE(r.currency,'ZAR')) <> 'ZAR' THEN CONTINUE; END IF;
        v_eff_amount := COALESCE(r.amount, 0);
      END IF;

      -- Resolve platform fee % from doctor's plan
      SELECT pfs.platform_fee_percent INTO v_platform_pct
      FROM public.doctors d
      LEFT JOIN public.platform_fee_settings pfs
        ON pfs.id = COALESCE(
             CASE WHEN d.is_founding_doctor AND d.founding_locked THEN d.founding_pricing_plan_id END,
             d.fee_settings_id,
             (SELECT id FROM public.platform_fee_settings WHERE is_default = true AND is_active = true LIMIT 1)
           )
      WHERE d.profile_id = r.doctor_id;

      v_platform_pct := COALESCE(v_platform_pct,
        (SELECT platform_fee_percent FROM public.platform_fee_settings WHERE is_default = true AND is_active = true LIMIT 1),
        10);

      v_proc := round(v_eff_amount * _new_pct / 100.0, 2);
      v_plat := round(v_eff_amount * v_platform_pct / 100.0, 2);
      v_net  := round(v_eff_amount - v_proc - v_plat, 2);

      UPDATE public.payments
         SET processing_fee_percentage = _new_pct,
             processing_fee_amount     = v_proc,
             platform_fee_amount       = v_plat,
             doctor_net_amount         = v_net,
             fee_amount                = v_proc + v_plat,
             last_recalculated_at      = now(),
             last_recalculated_by      = v_admin,
             updated_at                = now()
       WHERE id = r.id;

      v_updated := v_updated + 1;
    END LOOP;
  END IF;

  INSERT INTO public.financial_recalculation_logs
    (admin_user_id, old_processing_fee_percentage, new_processing_fee_percentage,
     scope, payments_updated, payment_ids, notes)
  VALUES (v_admin, v_old_pct, _new_pct, _scope, v_updated,
          CASE WHEN _scope = 'selected_payments' THEN _payment_ids ELSE NULL END,
          _notes)
  RETURNING id INTO v_log_id;

  RETURN jsonb_build_object(
    'log_id', v_log_id,
    'payments_updated', v_updated,
    'old_pct', v_old_pct,
    'new_pct', _new_pct,
    'scope', _scope
  );
END $$;

REVOKE ALL ON FUNCTION public.admin_recalculate_processing_fees(numeric, text, uuid[], text) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_recalculate_processing_fees(numeric, text, uuid[], text) TO authenticated;
