import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Hardcoded fallback in case DB is unreachable
const FALLBACK_CURRENCIES: Record<string, { currency: string; currencySymbol: string }> = {
  ZA: { currency: "ZAR", currencySymbol: "R" },
  NG: { currency: "NGN", currencySymbol: "₦" },
  KE: { currency: "KES", currencySymbol: "KSh" },
  GH: { currency: "GHS", currencySymbol: "GH₵" },
  US: { currency: "USD", currencySymbol: "$" },
  GB: { currency: "GBP", currencySymbol: "£" },
  IN: { currency: "INR", currencySymbol: "₹" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Detect country via ip-api
    // Use HTTPS endpoint to prevent MITM tampering of the country/currency response.
    const ipRes = await fetch("https://ipapi.co/json/");
    
    let countryCode = "ZA";
    let countryName = "South Africa";

    if (ipRes.ok) {
      const data = await ipRes.json();
      if (data.countryCode) {
        countryCode = data.countryCode;
        countryName = data.country || countryCode;
      }
    }

    // Try to get currency from the countries table
    let currencyInfo = { currency: "USD", currencySymbol: "$" };
    
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const sb = createClient(supabaseUrl, supabaseKey);
      
      const { data: countryRow } = await sb
        .from("countries")
        .select("name, currency_code, currency_symbol")
        .eq("code", countryCode)
        .eq("is_active", true)
        .maybeSingle();
      
      if (countryRow) {
        countryName = countryRow.name || countryName;
        currencyInfo = { currency: countryRow.currency_code, currencySymbol: countryRow.currency_symbol };
      } else {
        // Fallback to hardcoded
        currencyInfo = FALLBACK_CURRENCIES[countryCode] || currencyInfo;
      }
    } catch {
      currencyInfo = FALLBACK_CURRENCIES[countryCode] || currencyInfo;
    }

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
