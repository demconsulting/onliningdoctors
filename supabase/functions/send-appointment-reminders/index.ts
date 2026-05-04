import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Window: appointments scheduled between 55 and 65 minutes from now
    const now = Date.now();
    const lower = new Date(now + 55 * 60 * 1000).toISOString();
    const upper = new Date(now + 65 * 60 * 1000).toISOString();

    const { data: appts, error } = await service
      .from("appointments")
      .select("id")
      .eq("status", "confirmed")
      .gte("scheduled_at", lower)
      .lte("scheduled_at", upper);

    if (error) throw error;

    const results: any[] = [];
    for (const apt of appts || []) {
      // Skip if reminder already sent
      const { data: log } = await service
        .from("booking_email_log")
        .select("id")
        .eq("appointment_id", apt.id)
        .eq("email_type", "reminder_patient")
        .maybeSingle();
      if (log) continue;

      const r = await service.functions.invoke("send-booking-email", {
        body: { appointment_id: apt.id, kind: "reminder" },
      });
      results.push({ id: apt.id, ok: !r.error });
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
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
