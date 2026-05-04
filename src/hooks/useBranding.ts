import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import defaultLogo from "@/assets/logo.png";

export interface BrandingContent {
  logo_url: string;
  navbar_height: number;
  footer_height: number;
}

export const DEFAULT_BRANDING: BrandingContent = {
  logo_url: "",
  navbar_height: 48,
  footer_height: 56,
};

export const resolveLogoSrc = (b: BrandingContent) =>
  b.logo_url && b.logo_url.trim().length > 0 ? b.logo_url : defaultLogo;

/** Loads `site_content[branding]` and live-updates on changes. */
export const useBranding = () => {
  const [branding, setBranding] = useState<BrandingContent>(DEFAULT_BRANDING);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("site_content")
      .select("value")
      .eq("key", "branding")
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data?.value) return;
        setBranding({ ...DEFAULT_BRANDING, ...(data.value as Partial<BrandingContent>) });
      });

    const channel = supabase
      .channel("branding-content")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "site_content", filter: "key=eq.branding" },
        (payload) => {
          const value = (payload.new as { value?: Partial<BrandingContent> } | null)?.value;
          if (value) setBranding({ ...DEFAULT_BRANDING, ...value });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  return { branding, logoSrc: resolveLogoSrc(branding) };
};
