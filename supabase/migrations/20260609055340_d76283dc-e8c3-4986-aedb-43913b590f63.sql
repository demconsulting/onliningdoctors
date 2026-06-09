
CREATE TABLE public.referral_profitability_simulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  referral_type text NOT NULL,
  consultation_fee numeric(12,2) NOT NULL DEFAULT 0,
  platform_fee_percentage numeric(6,3) NOT NULL DEFAULT 0,
  processing_fee_percentage numeric(6,3) NOT NULL DEFAULT 0,
  fixed_processing_fee numeric(12,2) NOT NULL DEFAULT 0,
  reward_basis text NOT NULL,
  reward_percentage numeric(6,3) NOT NULL DEFAULT 0,
  fixed_reward_amount numeric(12,2) NOT NULL DEFAULT 0,
  reward_duration text,
  monthly_reward_cap numeric(12,2),
  lifetime_reward_cap numeric(12,2),
  platform_revenue numeric(12,2) NOT NULL DEFAULT 0,
  processing_fee numeric(12,2) NOT NULL DEFAULT 0,
  net_platform_revenue numeric(12,2) NOT NULL DEFAULT 0,
  reward_amount numeric(12,2) NOT NULL DEFAULT 0,
  doctors_onlining_keeps numeric(12,2) NOT NULL DEFAULT 0,
  profit_margin_percentage numeric(7,3) NOT NULL DEFAULT 0,
  risk_status text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.referral_profitability_simulations TO authenticated;
GRANT ALL ON public.referral_profitability_simulations TO service_role;

ALTER TABLE public.referral_profitability_simulations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage referral profitability simulations"
ON public.referral_profitability_simulations
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'platform_admin') OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'platform_admin') OR public.has_role(auth.uid(), 'super_admin'));
