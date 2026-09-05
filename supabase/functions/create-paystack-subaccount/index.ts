import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PAYSTACK_BASE = "https://api.paystack.co";
const ADMIN_ROLES = ["admin", "super_admin", "platform_admin"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return json({ error: "Unauthorized" }, 401);

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ADMIN_ROLES);
    if (!roles || roles.length === 0) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
    const doctorId = str(body.doctor_id);
    const bankCodeOverride = str(body.bank_code);
    const bankInput = {
      bank_name: str(body.bank_name),
      account_name: str(body.account_name),
      account_number: str(body.account_number),
    };

    if (!doctorId) return json({ error: "doctor_id is required" }, 400);

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: doctor, error: doctorError } = await serviceClient
      .from("doctors")
      .select("profile_id, practice_type, is_verified, bank_name, account_name, account_number, paystack_subaccount_code, license_number")
      .eq("profile_id", doctorId)
      .maybeSingle();

    if (doctorError || !doctor) return json({ error: "Doctor not found" }, 404);

    if (doctor.practice_type !== "independent") {
      return json({
        error: "This doctor is a group practice member — payouts route to the practice subaccount.",
      }, 400);
    }

    if (!doctor.is_verified) {
      return json({ error: "Approve the doctor before creating a payout account" }, 400);
    }

    if (doctor.paystack_subaccount_code) {
      return json({ success: true, already_exists: true, subaccount_code: doctor.paystack_subaccount_code });
    }

    const merged = {
      bank_name: bankInput.bank_name ?? doctor.bank_name,
      account_name: bankInput.account_name ?? doctor.account_name,
      account_number: bankInput.account_number ?? doctor.account_number,
    };

    if (!merged.bank_name || !merged.account_name || !merged.account_number) {
      return json({
        error: "Doctor bank details are incomplete. Add the bank name, account holder name and account number, then retry.",
        needs_bank_details: true,
        missing: Object.entries(merged).filter(([, v]) => !v).map(([k]) => k),
      }, 400);
    }

    if (bankInput.bank_name || bankInput.account_name || bankInput.account_number) {
      await serviceClient
        .from("doctors")
        .update({ ...merged, updated_at: new Date().toISOString() })
        .eq("profile_id", doctorId);
    }

    const { data: profile } = await serviceClient
      .from("profiles")
      .select("full_name, email")
      .eq("id", doctorId)
      .maybeSingle();

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
    if (!PAYSTACK_SECRET) return json({ error: `Paystack ${mode} secret key not configured` }, 500);

    let bankCode = bankCodeOverride;
    if (!bankCode) {
      const banksRes = await fetch(`${PAYSTACK_BASE}/bank?country=south%20africa&perPage=200`, {
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
      });
      const banksData = await banksRes.json();
      if (!banksData.status) return json({ error: "Could not load Paystack bank list" }, 502);
      const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
      const target = normalize(merged.bank_name);
      const match = (banksData.data as Array<{ name: string; code: string }>).find((b) => {
        const n = normalize(b.name);
        return n === target || n.includes(target) || target.includes(n);
      });
      if (!match) {
        return json({
          error: `Could not match "${merged.bank_name}" to a Paystack bank. Provide a bank_code override.`,
          needs_bank_code: true,
        }, 400);
      }
      bankCode = match.code;
    }

    const subRes = await fetch(`${PAYSTACK_BASE}/subaccount`, {
      method: "POST",
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        business_name: merged.account_name || profile?.full_name || "Independent Doctor",
        settlement_bank: bankCode,
        account_number: merged.account_number,
        percentage_charge: 0,
        primary_contact_email: profile?.email || undefined,
        primary_contact_name: profile?.full_name || undefined,
        metadata: { doctor_id: doctorId, hpcsa_number: doctor.license_number },
      }),
    });
    const subData = await subRes.json();
    if (!subData.status) {
      console.error("Paystack subaccount creation failed:", subData);
      return json({ error: subData.message || "Paystack subaccount creation failed" }, 502);
    }

    const subaccountCode = subData.data.subaccount_code as string;

    const { error: updateError } = await serviceClient
      .from("doctors")
      .update({
        paystack_subaccount_code: subaccountCode,
        is_payout_verified: true,
        updated_at: new Date().toISOString(),
      })
      .eq("profile_id", doctorId);

    if (updateError) {
      console.error("Failed to save subaccount on doctor:", updateError);
      return json({ error: "Subaccount created but could not be saved", subaccount_code: subaccountCode }, 500);
    }

    return json({ success: true, subaccount_code: subaccountCode, mode });
  } catch (e) {
    console.error("create-paystack-subaccount error", e);
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
