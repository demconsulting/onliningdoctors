import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const COUNTRY_CURRENCY: Record<string, { currency: string; currencySymbol: string }> = {
  ZA: { currency: "ZAR", currencySymbol: "R" },
  NG: { currency: "NGN", currencySymbol: "₦" },
  KE: { currency: "KES", currencySymbol: "KSh" },
  GH: { currency: "GHS", currencySymbol: "GH₵" },
  TZ: { currency: "TZS", currencySymbol: "TSh" },
  UG: { currency: "UGX", currencySymbol: "USh" },
  EG: { currency: "EGP", currencySymbol: "E£" },
  ET: { currency: "ETB", currencySymbol: "Br" },
  RW: { currency: "RWF", currencySymbol: "FRw" },
  US: { currency: "USD", currencySymbol: "$" },
  GB: { currency: "GBP", currencySymbol: "£" },
  IN: { currency: "INR", currencySymbol: "₹" },
};

const COUNTRY_NAMES: Record<string, string> = {
  ZA: "South Africa",
  NG: "Nigeria",
  KE: "Kenya",
  GH: "Ghana",
  TZ: "Tanzania",
  UG: "Uganda",
  EG: "Egypt",
  ET: "Ethiopia",
  RW: "Rwanda",
  US: "United States",
  GB: "United Kingdom",
  IN: "India",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Try ip-api.com (free, no key needed, 45 req/min)
    const ipRes = await fetch("http://ip-api.com/json/?fields=countryCode,country");
    
    let countryCode = "ZA"; // default fallback
    let countryName = "South Africa";

    if (ipRes.ok) {
      const data = await ipRes.json();
      if (data.countryCode) {
        countryCode = data.countryCode;
        countryName = data.country || COUNTRY_NAMES[countryCode] || countryCode;
      }
    }

    const currencyInfo = COUNTRY_CURRENCY[countryCode] || { currency: "USD", currencySymbol: "$" };

    return new Response(
      JSON.stringify({
        countryCode,
        countryName,
        ...currencyInfo,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        countryCode: "ZA",
        countryName: "South Africa",
        currency: "ZAR",
        currencySymbol: "R",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
