ALTER TABLE public.platform_fee_settings
  ADD COLUMN IF NOT EXISTS platform_fee_mode text NOT NULL DEFAULT 'percent',
  ADD COLUMN IF NOT EXISTS platform_fee_tiers jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.platform_fee_settings
  DROP CONSTRAINT IF EXISTS platform_fee_settings_mode_check;
ALTER TABLE public.platform_fee_settings
  ADD CONSTRAINT platform_fee_settings_mode_check CHECK (platform_fee_mode IN ('percent','tiered'));

UPDATE public.platform_fee_settings
   SET platform_fee_mode = 'tiered',
       platform_fee_tiers = '[{"max_amount":350,"fee":65},{"max_amount":700,"fee":75},{"max_amount":null,"fee":90}]'::jsonb,
       processing_fee_percent = 3,
       processing_fee_fixed = 0,
       updated_at = now()
 WHERE is_default = true;

CREATE OR REPLACE FUNCTION public.compute_platform_fee(_amount numeric, _settings_id uuid DEFAULT NULL)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  s record;
  t jsonb;
BEGIN
  SELECT * INTO s FROM public.platform_fee_settings
   WHERE (_settings_id IS NOT NULL AND id = _settings_id)
      OR (_settings_id IS NULL AND is_default = true AND is_active = true)
   LIMIT 1;

  IF s IS NULL THEN
    RETURN round(COALESCE(_amount,0) * 0.10, 2);
  END IF;

  IF s.platform_fee_mode = 'tiered' THEN
    FOR t IN SELECT * FROM jsonb_array_elements(COALESCE(s.platform_fee_tiers,'[]'::jsonb))
    LOOP
      IF (t->>'max_amount') IS NULL OR COALESCE(_amount,0) < (t->>'max_amount')::numeric THEN
        RETURN round(COALESCE((t->>'fee')::numeric, 0), 2);
      END IF;
    END LOOP;
    RETURN 0;
  END IF;

  RETURN round(COALESCE(_amount,0) * COALESCE(s.platform_fee_percent,0) / 100.0, 2);
END $$;

REVOKE ALL ON FUNCTION public.compute_platform_fee(numeric, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.compute_platform_fee(numeric, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_recalculate_processing_fees(_new_pct numeric, _scope text, _payment_ids uuid[] DEFAULT NULL::uuid[], _notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_admin uuid := auth.uid();
  v_old_pct numeric;
  v_updated int := 0;
  v_log_id uuid;
  r record;
  v_plan_id uuid;
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

  INSERT INTO public.platform_settings (key, value)
    VALUES ('default_processing_fee_percent', to_jsonb(_new_pct))
    ON CONFLICT (key) DO UPDATE SET value = to_jsonb(_new_pct);

  IF _scope <> 'future_only' THEN
    FOR r IN
      SELECT p.*, c.converted_amount, c.include_in_totals, c.conversion_method
      FROM public.payments p
      LEFT JOIN public.financial_currency_conversions c ON c.payment_id = p.id
      WHERE p.status IN ('paid','completed','successful','success')
        AND (_scope = 'all_historical' OR p.id = ANY(_payment_ids))
    LOOP
      IF r.conversion_method IS NOT NULL THEN
        IF COALESCE(r.include_in_totals, false) = false OR r.conversion_method IN ('test_payment','exclude') THEN
          CONTINUE;
        END IF;
        v_eff_amount := COALESCE(r.converted_amount, 0);
      ELSE
        IF UPPER(COALESCE(r.currency,'ZAR')) <> 'ZAR' THEN CONTINUE; END IF;
        v_eff_amount := COALESCE(r.amount, 0);
      END IF;

      SELECT COALESCE(
               CASE WHEN d.is_founding_doctor AND d.founding_locked THEN d.founding_pricing_plan_id END,
               d.fee_settings_id
             ) INTO v_plan_id
      FROM public.doctors d
      WHERE d.profile_id = r.doctor_id;

      v_proc := round(v_eff_amount * _new_pct / 100.0, 2);
      v_plat := public.compute_platform_fee(v_eff_amount, v_plan_id);
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

  RETURN jsonb_build_object('log_id', v_log_id, 'payments_updated', v_updated,
    'old_pct', v_old_pct, 'new_pct', _new_pct, 'scope', _scope);
END $function$;