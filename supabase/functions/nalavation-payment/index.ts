import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PAYSTACK_BASE = "https://api.paystack.co";
const CONTEXT = "nalavation";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Nalavation-specific gateway configuration
    const { data: cfg } = await admin
      .from("payment_gateway_configs")
      .select("*")
      .eq("context", CONTEXT)
      .eq("provider", "paystack")
      .maybeSingle();

    const mode = (cfg?.mode as string) || "test";
    const SECRET =
      mode === "live"
        ? Deno.env.get("NALAVATION_PAYSTACK_LIVE_SECRET_KEY") || Deno.env.get("PAYSTACK_LIVE_SECRET_KEY") || Deno.env.get("PAYSTACK_SECRET_KEY")
        : Deno.env.get("NALAVATION_PAYSTACK_TEST_SECRET_KEY") || Deno.env.get("PAYSTACK_TEST_SECRET_KEY") || Deno.env.get("PAYSTACK_SECRET_KEY");

    if (!SECRET) return json({ error: `Nalavation Paystack ${mode} secret key not configured` }, 500);

    const rawBody = await req.text();
    let body: Record<string, any> = {};
    try { body = rawBody ? JSON.parse(rawBody) : {}; } catch { /* ignore */ }
    const action = typeof body.action === "string" ? body.action : new URL(req.url).searchParams.get("action");

    // --- Webhook (no auth) ---
    if (action === "webhook") {
      const signature = req.headers.get("x-paystack-signature");
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey("raw", encoder.encode(SECRET), { name: "HMAC", hash: "SHA-512" }, false, ["sign"]);
      const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
      const expected = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
      if (signature !== expected) return json({ error: "Invalid signature" }, 401);

      if (body.event === "charge.success") {
        const reference = body.data.reference;
        const paid = (body.data.amount ?? 0) / 100;
        const { data: payment } = await admin
          .from("payments")
          .select("id, amount, website_invoice_id")
          .eq("paystack_reference", reference)
          .eq("business_unit", CONTEXT)
          .maybeSingle();

        if (payment) {
          const matches = Math.abs(Number(payment.amount) - paid) <= 0.01;
          await admin
            .from("payments")
            .update({
              status: matches ? "success" : "failed",
              paid_at: new Date().toISOString(),
              payment_method: body.data.channel,
              metadata: { ...body.data, amount_match: matches },
            })
            .eq("id", payment.id);

          if (matches && payment.website_invoice_id) {
            await admin
              .from("website_invoices")
              .update({ status: "paid", paid_at: new Date().toISOString(), payment_reference: reference })
              .eq("id", payment.website_invoice_id);
          }
        }
      }
      return json({ received: true });
    }

    // --- Authenticated actions ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: "Unauthorized" }, 401);

    // --- Doctor requests a Nalavation service from DoctorsOnlining ---
    if (action === "request_service") {
      const { service_code, notes, practice_name, contact_name, contact_phone } = body;
      if (typeof service_code !== "string" || !service_code) return json({ error: "service_code is required" }, 400);

      const { data: service } = await admin
        .from("service_catalogue")
        .select("code,name,category,price,currency,billing_cycle,is_active")
        .eq("code", service_code)
        .maybeSingle();
      if (!service || !service.is_active) return json({ error: "Unknown or inactive service" }, 400);

      const { data: profile } = await admin
        .from("profiles")
        .select("full_name,email,phone")
        .eq("id", user.id)
        .maybeSingle();

      const { data: request, error } = await admin
        .from("nalavation_service_requests")
        .insert({
          requester_user_id: user.id,
          source_platform: "doctorsonlining",
          business_unit: CONTEXT,
          service_code: service.code,
          service_name: service.name,
          category: service.category,
          amount: service.price,
          currency: service.currency,
          billing_cycle: service.billing_cycle,
          practice_name: practice_name ?? null,
          contact_name: contact_name ?? profile?.full_name ?? null,
          contact_email: profile?.email ?? null,
          contact_phone: contact_phone ?? profile?.phone ?? null,
          notes: notes ?? null,
          status: "new",
        })
        .select("id")
        .single();

      if (error) return json({ error: error.message }, 400);
      return json({ request_id: request.id, status: "new" });
    }

    // --- Initialize a Nalavation service / invoice payment ---
    if (action === "initialize") {
      const { website_invoice_id, callback_url } = body;
      if (!website_invoice_id) return json({ error: "website_invoice_id is required" }, 400);

      const { data: invoice } = await admin
        .from("website_invoices")
        .select("id,total_amount,currency,doctor_id,project_id,category,status")
        .eq("id", website_invoice_id)
        .maybeSingle();
      if (!invoice) return json({ error: "Invoice not found" }, 404);
      if (invoice.status === "paid") return json({ error: "Invoice already paid" }, 400);
      if (invoice.doctor_id !== user.id) return json({ error: "Forbidden" }, 403);

      const amount = Number(invoice.total_amount || 0);
      if (!Number.isFinite(amount) || amount <= 0) return json({ error: "Invoice amount is invalid" }, 400);

      const currencies = (cfg?.supported_currencies as string[]) || ["ZAR"];
      const currency = currencies.includes(String(invoice.currency)) ? String(invoice.currency) : currencies[0];

      const { data: profile } = await admin.from("profiles").select("email").eq("id", user.id).maybeSingle();
      const email = body.email || profile?.email;
      if (!email) return json({ error: "No billing email on file" }, 400);

      const reference = `nala_${invoice.id}_${Date.now()}`;
      const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
        method: "POST",
        headers: { Authorization: `Bearer ${SECRET}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          amount: Math.round(amount * 100),
          ...(mode !== "test" ? { currency } : {}),
          reference,
          callback_url: callback_url || undefined,
          channels: (cfg?.payment_methods as string[]) || ["card"],
          metadata: { context: CONTEXT, website_invoice_id: invoice.id, project_id: invoice.project_id, doctor_id: invoice.doctor_id },
        }),
      });
      const data = await res.json();
      if (!data.status) {
        console.error("Nalavation Paystack init failed:", data);
        return json({ error: data.message || "Failed to initialize payment" }, 400);
      }

      await admin.from("payments").insert({
        business_unit: CONTEXT,
        payer_id: user.id,
        doctor_id: invoice.doctor_id,
        project_id: invoice.project_id,
        website_invoice_id: invoice.id,
        service_code: invoice.category,
        amount,
        currency,
        status: "pending",
        paystack_reference: reference,
        paystack_access_code: data.data.access_code,
        fee_bearer: (cfg?.fee_bearer as string) || "customer",
        transaction_type: "nalavation_service",
      });

      return json({ authorization_url: data.data.authorization_url, access_code: data.data.access_code, reference });
    }

    // --- Verify ---
    if (action === "verify") {
      const { reference } = body;
      if (!reference) return json({ error: "Reference required" }, 400);

      const { data: payment } = await admin
        .from("payments")
        .select("id, amount, payer_id, website_invoice_id")
        .eq("paystack_reference", reference)
        .eq("business_unit", CONTEXT)
        .maybeSingle();
      if (!payment) return json({ error: "Payment not found" }, 404);
      if (payment.payer_id !== user.id) return json({ error: "Forbidden" }, 403);

      const res = await fetch(`${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(String(reference))}`, {
        headers: { Authorization: `Bearer ${SECRET}` },
      });
      const data = await res.json();
      if (!data.status) return json({ error: data.message || "Verification failed" }, 400);

      const tx = data.data;
      const paid = (tx.amount ?? 0) / 100;
      const matches = Math.abs(Number(payment.amount) - paid) <= 0.01;
      const status = tx.status === "success" && matches ? "success" : "failed";

      await admin
        .from("payments")
        .update({
          status,
          paid_at: tx.paid_at || null,
          payment_method: tx.channel || null,
          fee_amount: tx.fees ? tx.fees / 100 : null,
          metadata: { ...tx, amount_match: matches },
        })
        .eq("id", payment.id);

      if (status === "success" && payment.website_invoice_id) {
        await admin
          .from("website_invoices")
          .update({ status: "paid", paid_at: tx.paid_at || new Date().toISOString(), payment_reference: reference })
          .eq("id", payment.website_invoice_id);
      }

      return json({ status, amount: paid, currency: tx.currency, paid_at: tx.paid_at, channel: tx.channel });
    }

    return json({ error: "Unknown action. Use: request_service, initialize, verify or webhook" }, 400);
  } catch (error: unknown) {
    console.error("nalavation-payment error:", error);
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
