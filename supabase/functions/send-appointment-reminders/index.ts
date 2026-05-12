import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_MINUTES = [60, 5, 1];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Cron/service-role only
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const cronSecret = Deno.env.get("CRON_SECRET") || "";
  const authorized = token.length > 0 && (token === serviceKey || (cronSecret && token === cronSecret));
  if (!authorized) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Read configurable reminder minutes from site_content
    const { data: cfg } = await service
      .from("site_content")
      .select("value")
      .eq("key", "appointment_reminder_minutes")
      .maybeSingle();

    let minutes: number[] = DEFAULT_MINUTES;
    const raw = (cfg?.value as { minutes?: unknown } | null)?.minutes;
    if (Array.isArray(raw)) {
      const parsed = raw
        .map((n) => Number(n))
        .filter((n) => Number.isFinite(n) && n > 0 && n <= 24 * 60);
      if (parsed.length) minutes = parsed;
    }

    const now = Date.now();
    const results: any[] = [];

    for (const m of minutes) {
      // Window: appointments scheduled m minutes from now (±30s tolerance for cron drift)
      const center = now + m * 60 * 1000;
      const lower = new Date(center - 30 * 1000).toISOString();
      const upper = new Date(center + 30 * 1000).toISOString();

      const { data: appts, error } = await service
        .from("appointments")
        .select("id")
        .eq("status", "confirmed")
        .gte("scheduled_at", lower)
        .lte("scheduled_at", upper);
      if (error) throw error;

      for (const apt of appts || []) {
        // Skip if already sent for this minute bucket
        const { data: log } = await service
          .from("booking_email_log")
          .select("id")
          .eq("appointment_id", apt.id)
          .eq("email_type", `reminder_${m}_patient`)
          .maybeSingle();
        if (log) continue;

        const r = await service.functions.invoke("send-booking-email", {
          body: { appointment_id: apt.id, kind: "reminder", minutes_before: m },
        });
        results.push({ id: apt.id, minutes_before: m, ok: !r.error });
      }
    }

    return new Response(JSON.stringify({ processed: results.length, minutes, results }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("send-appointment-reminders error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
