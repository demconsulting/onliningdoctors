import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface GeoInfo {
  countryCode: string;
  countryName: string;
  currency: string;
  currencySymbol: string;
}

const STORAGE_KEY = "detected_geo";

export function useGeoLocation() {
  const [geo, setGeo] = useState<GeoInfo | null>(() => {
    try {
      const cached = sessionStorage.getItem(STORAGE_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(!geo);

  useEffect(() => {
    if (geo) return;

    supabase.functions
      .invoke("detect-country")
      .then(({ data, error }) => {
        if (!error && data) {
          setGeo(data);
          try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
          } catch {}
        }
      })
      .finally(() => setLoading(false));
  }, [geo]);

  return { geo, loading };
}
