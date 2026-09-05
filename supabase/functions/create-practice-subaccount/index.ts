import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PAYSTACK_BASE = "https://api.paystack.co";
const ADMIN_ROLES = ["admin", "super_admin", "platform_admin"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller identity with their JWT
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ADMIN_ROLES);

    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const practiceId = typeof body.practice_id === "string" ? body.practice_id : null;
    const bankCodeOverride = typeof body.bank_code === "string" ? body.bank_code.trim() : null;
    const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
    const bankInput = {
      bank_name: str(body.bank_name),
      account_name: str(body.account_name),
      account_number: str(body.account_number),
    };

    if (!practiceId) {
      return new Response(JSON.stringify({ error: "practice_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: practice, error: practiceError } = await serviceClient
      .from("practices")
      .select("id, practice_name, email, bank_name, account_name, account_number, status, paystack_subaccount_code")
      .eq("id", practiceId)
      .maybeSingle();

    if (practiceError || !practice) {
      return new Response(JSON.stringify({ error: "Practice not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (practice.status !== "approved") {
      return new Response(JSON.stringify({ error: "Practice must be approved before creating a payout account" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (practice.paystack_subaccount_code) {
      return new Response(JSON.stringify({
        success: true,
        already_exists: true,
        subaccount_code: practice.paystack_subaccount_code,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Admin may supply/patch missing bank details with the request
    const merged = {
      bank_name: bankInput.bank_name ?? practice.bank_name,
      account_name: bankInput.account_name ?? practice.account_name,
      account_number: bankInput.account_number ?? practice.account_number,
    };

    if (!merged.bank_name || !merged.account_number || !merged.account_name) {
      return new Response(JSON.stringify({
        error: "Practice bank details are incomplete. Add the bank name, account holder name and account number for this practice, then retry.",
        needs_bank_details: true,
        missing: Object.entries(merged).filter(([, v]) => !v).map(([k]) => k),
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (bankInput.bank_name || bankInput.account_name || bankInput.account_number) {
      await serviceClient.from("practices").update({ ...merged, updated_at: new Date().toISOString() }).eq("id", practiceId);
    }
    practice.bank_name = merged.bank_name;
    practice.account_name = merged.account_name;
    practice.account_number = merged.account_number;

    // Resolve the Paystack secret for the current mode (same logic as paystack-payment)
    const { data: configRow } = await serviceClient
      .from("payment_gateway_configs")
      .select("*")
      .eq("context", "doctorsonlining")
      .eq("provider", "paystack")
      .maybeSingle();
    const mode = ((configRow as Record<string, unknown> | null)?.mode as string) || "test";
    const PAYSTACK_SECRET = mode === "live"
      ? (Deno.env.get("PAYSTACK_LIVE_SECRET_KEY") || Deno.env.get("PAYSTACK_SECRET_KEY"))
      : (Deno.env.get("PAYSTACK_TEST_SECRET_KEY") || Deno.env.get("PAYSTACK_SECRET_KEY"));

    if (!PAYSTACK_SECRET) {
      return new Response(JSON.stringify({ error: `Paystack ${mode} secret key not configured` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve the settlement bank code
    let bankCode = bankCodeOverride;
    if (!bankCode) {
      const banksRes = await fetch(`${PAYSTACK_BASE}/bank?country=south%20africa&perPage=200`, {
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
      });
      const banksData = await banksRes.json();
      if (!banksData.status) {
        return new Response(JSON.stringify({ error: "Could not load Paystack bank list" }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
      const target = normalize(practice.bank_name);
      const aliases: Record<string, string[]> = {
        fnb: ["firstnationalbank"],
        firstnationalbank: ["fnb"],
        absa: ["absabank"],
        std: ["standardbank"],
        standard: ["standardbank"],
        sbsa: ["standardbank"],
        nedbank: ["nedbank"],
        capitec: ["capitecbank"],
        tyme: ["tymebank"],
        investec: ["investecbank"],
        discovery: ["discoverybank"],
        africanbank: ["africanbank"],
        bidvest: ["bidvestbank"],
        sasfin: ["sasfinbank"],
      };
      const candidates = [target, ...(aliases[target] || [])];
      const banks = banksData.data as Array<{ name: string; code: string }>;
      const match = banks.find((b) => candidates.includes(normalize(b.name)))
        || banks.find((b) => {
          const n = normalize(b.name);
          return candidates.some((c) => n.includes(c) || c.includes(n));
        });

      if (!match) {
        return new Response(JSON.stringify({
          error: `Could not match "${practice.bank_name}" to a Paystack bank. Provide a bank_code override.`,
          needs_bank_code: true,
        }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      bankCode = match.code;
    }

    // Create the Paystack subaccount
    const subRes = await fetch(`${PAYSTACK_BASE}/subaccount`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        business_name: practice.practice_name,
        settlement_bank: bankCode,
        account_number: practice.account_number,
        percentage_charge: 0,
        primary_contact_email: practice.email,
      }),
    });
    const subData = await subRes.json();

    if (!subData.status) {
      console.error("Paystack subaccount creation failed:", subData);
      return new Response(JSON.stringify({ error: subData.message || "Paystack subaccount creation failed" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const subaccountCode = subData.data.subaccount_code as string;

    const { error: updateError } = await serviceClient
      .from("practices")
      .update({
        paystack_subaccount_code: subaccountCode,
        is_payout_verified: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", practiceId);

    if (updateError) {
      console.error("Failed to save subaccount code:", updateError);
      return new Response(JSON.stringify({
        error: "Subaccount created on Paystack but failed to save: " + updateError.message,
        subaccount_code: subaccountCode,
      }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({
      success: true,
      subaccount_code: subaccountCode,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("create-practice-subaccount error:", error);
    return new Response(JSON.stringify({ error: error.message || "Unexpected error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
