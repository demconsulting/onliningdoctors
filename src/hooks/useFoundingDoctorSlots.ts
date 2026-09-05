import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface FoundingDoctorSlots {
  cap: number;
  used: number;
  remaining: number;
}

/** Hard-capped Founding Doctor slots (max 5 across the platform). */
export function useFoundingDoctorSlots() {
  const [slots, setSlots] = useState<FoundingDoctorSlots>({ cap: 5, used: 0, remaining: 5 });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data } = await (supabase as any).rpc("founding_doctor_slots");
    if (data) setSlots(data as FoundingDoctorSlots);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { slots, loading, refresh };
}

/** Fixed tiered platform fee bands applied to Founding Doctor consultations. */
export const FOUNDING_FEE_BANDS = [
  { label: "Under R350", max_amount: 350, fee: 60 },
  { label: "R350 – R699", max_amount: 700, fee: 70 },
  { label: "R700 and above", max_amount: null, fee: 80 },
] as const;

export const FOUNDING_GATEWAY_FEE_PERCENT = 3;
