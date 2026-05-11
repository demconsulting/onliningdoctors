import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface FoundingSlots {
  approved_count: number;
  remaining: number;
  max_slots: number;
  applications_open: boolean;
}

export function useFoundingSlots() {
  const [slots, setSlots] = useState<FoundingSlots | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data } = await supabase.rpc("get_founding_slots" as any);
    if (data) setSlots(data as FoundingSlots);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { slots, loading, refresh };
}
