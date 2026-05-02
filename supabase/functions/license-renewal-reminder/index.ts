import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // SECURITY: Only allow invocation by trusted callers (Supabase Cron / admins).
  // Require an Authorization header containing either the service-role key or
  // a configured CRON_SECRET. This prevents anonymous attackers from spamming
  // doctors with renewal notifications.
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const cronSecret = Deno.env.get("CRON_SECRET") || "";
  const isAuthorized =
    token.length > 0 && (token === serviceKey || (cronSecret && token === cronSecret));

  if (!isAuthorized) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get all verified doctors in South Africa
    const { data: doctors, error } = await supabase
      .from("doctors")
      .select("profile_id, profile:profiles!doctors_profile_id_fkey(full_name, country)")
      .eq("is_verified", true);

    if (error) throw error;

    const saDoctors = (doctors || []).filter(
      (d: any) => d.profile?.country === "South Africa"
    );

    let notified = 0;

    // Determine how many days until March 31
    const now = new Date();
    const year = now.getFullYear();
    let renewalDate = new Date(year, 2, 31); // March 31 current year
    if (now > renewalDate) {
      renewalDate = new Date(year + 1, 2, 31); // Next year
    }
    const daysUntil = Math.ceil(
      (renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Send reminders at 30 days, 14 days, 7 days, and 1 day before
    const reminderDays = [30, 14, 7, 1];
    if (!reminderDays.includes(daysUntil)) {
      return new Response(
        JSON.stringify({ message: `No reminder needed today. ${daysUntil} days until renewal.`, notified: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    for (const doc of saDoctors) {
      const name = (doc as any).profile?.full_name || "Doctor";
      await supabase.from("notifications").insert({
        user_id: doc.profile_id,
        title: "License Renewal Reminder",
        message: `Hi ${name}, your HPCSA license renewal is due on 31 March (${daysUntil} day${daysUntil === 1 ? "" : "s"} away). Please ensure your registration is up to date.`,
        type: "reminder",
        link: "/doctor",
      });
      notified++;
    }

    return new Response(
      JSON.stringify({ message: `Sent ${notified} renewal reminders (${daysUntil} days before deadline)` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("License renewal reminder error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
