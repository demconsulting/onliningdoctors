import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface FoundingPricing {
  id: string;
  pioneer_setup_fee: number;
  founding_setup_fee: number;
  standard_setup_fee: number;
  monthly_care_plan: number;
  vat_enabled: boolean;
  vat_rate: number;
  currency: string;
}

export interface FoundingExitPolicy {
  id: string;
  commitment_months: number;
  standard_practice_value: number;
  founding_contribution: number;
  policy_notes: string | null;
}

export function useFoundingPricing() {
  const [pricing, setPricing] = useState<FoundingPricing | null>(null);
  const [exitPolicy, setExitPolicy] = useState<FoundingExitPolicy | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [p, e] = await Promise.all([
      supabase.from("founding_programme_pricing" as any).select("*").limit(1).maybeSingle(),
      supabase.from("founding_exit_policy" as any).select("*").limit(1).maybeSingle(),
    ]);
    setPricing((p.data as any) || null);
    setExitPolicy((e.data as any) || null);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { pricing, exitPolicy, loading, refresh };
}

/** Remaining subsidised setup investment owed if a doctor exits early. */
export function calcEarlyExit(
  monthsCompleted: number,
  policy: { commitment_months: number; standard_practice_value: number; founding_contribution: number },
) {
  const subsidy = Math.max(policy.standard_practice_value - policy.founding_contribution, 0);
  const served = Math.min(Math.max(monthsCompleted, 0), policy.commitment_months);
  const remainingMonths = policy.commitment_months - served;
  const owed = policy.commitment_months > 0 ? (subsidy * remainingMonths) / policy.commitment_months : 0;
  return { subsidy, remainingMonths, owed: Math.round(owed * 100) / 100 };
}
