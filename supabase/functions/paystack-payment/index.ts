import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PAYSTACK_BASE = "https://api.paystack.co";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Determine mode from config to pick the right secret key
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: configRow } = await supabaseAdmin
      .from("site_content")
      .select("value")
      .eq("key", "paystack_config")
      .maybeSingle();
    const paymentConfig = (configRow?.value as Record<string, unknown>) || {};
    const envMode = (paymentConfig.mode as string) || "test";

    // Use mode-specific secret keys, with fallback to generic PAYSTACK_SECRET_KEY
    const PAYSTACK_SECRET = envMode === "live"
      ? (Deno.env.get("PAYSTACK_LIVE_SECRET_KEY") || Deno.env.get("PAYSTACK_SECRET_KEY"))
      : (Deno.env.get("PAYSTACK_TEST_SECRET_KEY") || Deno.env.get("PAYSTACK_SECRET_KEY"));

    if (!PAYSTACK_SECRET) {
      return new Response(
        JSON.stringify({ error: `Paystack ${envMode} secret key not configured` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Paystack environment mode:", envMode);

    const url = new URL(req.url);
    let action = url.searchParams.get("action");

    // Clone request body for potential re-reading; parse once
    const rawBody = await req.text();
    let bodyJson: Record<string, unknown> = {};
    try { bodyJson = rawBody ? JSON.parse(rawBody) : {}; } catch { /* ignore */ }

    // Allow action from body as well (for supabase.functions.invoke which doesn't support query params easily)
    if (!action && typeof bodyJson.action === "string") {
      action = bodyJson.action;
    }

    // --- Webhook: verify event from Paystack (no auth needed) ---
    if (action === "webhook") {
      const signature = req.headers.get("x-paystack-signature");

      // Verify signature using HMAC SHA512
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(PAYSTACK_SECRET),
        { name: "HMAC", hash: "SHA-512" },
        false,
        ["sign"]
      );
      const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
      const expectedSig = Array.from(new Uint8Array(sig))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      if (signature !== expectedSig) {
        console.error("Invalid Paystack webhook signature");
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const event = bodyJson as Record<string, any>;
      console.log("Paystack webhook event:", event.event);

      if (event.event === "charge.success") {
        const reference = event.data.reference;
        const serviceClient = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        // Update payment status
        const { data: paymentRows } = await serviceClient
          .from("payments")
          .update({
            status: "success",
            paid_at: new Date().toISOString(),
            payment_method: event.data.channel,
            metadata: event.data,
          })
          .eq("paystack_reference", reference)
          .select("appointment_id");

        // Confirm the appointment now that payment succeeded
        if (paymentRows && paymentRows.length > 0 && paymentRows[0].appointment_id) {
          await serviceClient
            .from("appointments")
            .update({ status: "confirmed" })
            .eq("id", paymentRows[0].appointment_id)
            .eq("status", "awaiting_payment");
        }

        console.log("Payment updated for reference:", reference);
      }

      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- All other actions require auth ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Initialize payment ---
    if (action === "initialize") {
      const { appointment_id, currency, email, doctor_id, callback_url } =
        bodyJson as any;

      if (!appointment_id || !email || !doctor_id) {
        return new Response(
          JSON.stringify({ error: "Missing required fields" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // SECURITY: Always derive the amount server-side from the appointment's
      // pricing tier or the doctor's consultation fee. NEVER trust a
      // client-supplied amount, which would allow underpayment bypass.
      const serverFeeClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const { data: apptRow, error: apptErr } = await serverFeeClient
        .from("appointments")
        .select("id, patient_id, doctor_id, pricing_tier_id")
        .eq("id", appointment_id)
        .single();

      if (apptErr || !apptRow) {
        return new Response(
          JSON.stringify({ error: "Appointment not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // The caller must own the appointment
      if (apptRow.patient_id !== user.id) {
        return new Response(
          JSON.stringify({ error: "Forbidden" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (apptRow.doctor_id !== doctor_id) {
        return new Response(
          JSON.stringify({ error: "Doctor mismatch for appointment" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Resolve fee from pricing tier first, then fall back to consultation_fee
      let serverAmount: number | null = null;
      if (apptRow.pricing_tier_id) {
        const { data: tier } = await serverFeeClient
          .from("doctor_pricing_tiers")
          .select("price, doctor_id, is_active")
          .eq("id", apptRow.pricing_tier_id)
          .single();
        if (tier && tier.doctor_id === doctor_id && tier.is_active) {
          serverAmount = Number(tier.price);
        }
      }
      if (serverAmount === null || !Number.isFinite(serverAmount)) {
        const { data: doctorRow } = await serverFeeClient
          .from("doctors")
          .select("consultation_fee")
          .eq("profile_id", doctor_id)
          .single();
        if (doctorRow?.consultation_fee != null) {
          serverAmount = Number(doctorRow.consultation_fee);
        }
      }

      if (!serverAmount || serverAmount <= 0) {
        return new Response(
          JSON.stringify({ error: "Doctor's consultation fee is not configured" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const amount = serverAmount;

      // Load payment config for fee_bearer
      const { data: configData } = await supabase
        .from("site_content")
        .select("value")
        .eq("key", "paystack_config")
        .maybeSingle();

      const payConfig = configData?.value as Record<string, unknown> | null;
      const feeBearer = (payConfig?.fee_bearer as string) || "patient";
      const mode = (payConfig?.mode as string) || "test";

      // In test mode, Paystack typically only supports NGN.
      // In live mode, use the admin-configured supported currencies.
      const adminCurrencies = (payConfig?.supported_currencies as string[]) || ["NGN"];
      const requestedCurrency = (currency || "NGN").toUpperCase();
      const finalCurrency = mode === "test"
        ? "NGN"
        : adminCurrencies.includes(requestedCurrency)
          ? requestedCurrency
          : adminCurrencies[0] || "NGN";

      console.log("Payment init:", { mode, requestedCurrency, finalCurrency });

      // Convert amount to kobo/pesewas (smallest unit)
      const amountInSmallestUnit = Math.round(Number(amount) * 100);

      const reference = `pay_${appointment_id}_${Date.now()}`;

      // Initialize transaction on Paystack
      const paystackRes = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          amount: amountInSmallestUnit,
          ...(mode !== "test" ? { currency: finalCurrency } : {}),
          reference,
          callback_url: callback_url || undefined,
          channels: (payConfig?.payment_methods as string[]) || ["card"],
          metadata: {
            appointment_id,
            doctor_id,
            patient_id: user.id,
            custom_fields: [
              { display_name: "Appointment ID", variable_name: "appointment_id", value: appointment_id },
            ],
          },
          ...(feeBearer === "patient" ? { bearer: "account" } : {}),
        }),
      });

      const paystackData = await paystackRes.json();

      if (!paystackData.status) {
        console.error("Paystack init failed:", paystackData);
        return new Response(
          JSON.stringify({ error: paystackData.message || "Failed to initialize payment" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create payment record
      const serviceClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      await serviceClient.from("payments").insert({
        appointment_id,
        patient_id: user.id,
        doctor_id,
        amount: Number(amount),
        currency: finalCurrency,
        status: "pending",
        paystack_reference: reference,
        paystack_access_code: paystackData.data.access_code,
        fee_bearer: feeBearer,
      });

      return new Response(
        JSON.stringify({
          authorization_url: paystackData.data.authorization_url,
          access_code: paystackData.data.access_code,
          reference,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Verify payment ---
    if (action === "verify") {
      const { reference } = bodyJson as any;
      if (!reference) {
        return new Response(
          JSON.stringify({ error: "Reference required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const paystackRes = await fetch(
        `${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`,
        {
          headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
        }
      );

      const paystackData = await paystackRes.json();

      if (!paystackData.status) {
        return new Response(
          JSON.stringify({ error: paystackData.message || "Verification failed" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const txData = paystackData.data;
      const serviceClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const newStatus = txData.status === "success" ? "success" : "failed";

      const { data: paymentRows } = await serviceClient
        .from("payments")
        .update({
          status: newStatus,
          paid_at: txData.paid_at || null,
          payment_method: txData.channel || null,
          fee_amount: txData.fees ? txData.fees / 100 : null,
          metadata: txData,
        })
        .eq("paystack_reference", reference)
        .select("appointment_id");

      // Confirm the appointment if payment succeeded
      if (newStatus === "success" && paymentRows && paymentRows.length > 0 && paymentRows[0].appointment_id) {
        await serviceClient
          .from("appointments")
          .update({ status: "confirmed" })
          .eq("id", paymentRows[0].appointment_id)
          .eq("status", "awaiting_payment");
      }

      return new Response(
        JSON.stringify({
          status: newStatus,
          amount: txData.amount / 100,
          currency: txData.currency,
          paid_at: txData.paid_at,
          channel: txData.channel,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action. Use: initialize, verify, or webhook" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("paystack-payment error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
