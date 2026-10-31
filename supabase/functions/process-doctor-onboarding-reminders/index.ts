import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { missingItems, hasUsableAvailability, nextDueReminder } from "./rules.ts";

const FROM = "Doctors Onlining <assist@doctorsonlining.com>";

// Deployment reconciliation uses only server-owned credentials, never caller input.
// It repairs the existing cron even when its old public token is rejected below.
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
if (!supabaseUrl || !serviceKey) throw new Error("Supabase server configuration missing");
const service = createClient(supabaseUrl, serviceKey);
const { error: scheduleError } = await service.rpc("configure_doctor_reminder_schedule", {
  _service_authorization: serviceKey,
});
if (scheduleError) console.error("Doctor reminder schedule reconciliation failed", scheduleError.code);

function escapeHtml(s: string) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function render(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY missing");

    // SECURITY: restrict to cron/service-role callers or platform admins so this
    // job cannot be triggered anonymously to mass-email doctors.
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const cronSecret = Deno.env.get("CRON_SECRET") || "";
    let authorized = !!token && (token === serviceKey || (!!cronSecret && token === cronSecret));
    if (!authorized && token) {
      const { data: authData } = await service.auth.getUser(token);
      const uid = authData?.user?.id;
      if (uid) {
        const { data: adminFlag } = await service.rpc("has_role", { _user_id: uid, _role: "admin" });
        authorized = adminFlag === true;
      }
    }
    if (!authorized) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    if (!body || typeof body !== "object" || (body.dryRun !== undefined && typeof body.dryRun !== "boolean")) {
      return new Response(JSON.stringify({ error: "dryRun must be a boolean" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: reminders, error: remindersError } = await service
      .from("doctor_onboarding_reminders")
      .select("*")
      .eq("is_active", true)
      .order("delay_minutes", { ascending: true });
    if (remindersError) throw new Error("Could not load reminder settings");

    if (!reminders?.length) {
      return new Response(JSON.stringify({ ok: true, sent: 0, reason: "no active reminders" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Unverified doctors (still onboarding)
    const { data: doctors, error: doctorsError } = await service
      .from("doctors")
      .select("id, profile_id, license_document_path, id_document_path, consultation_fee, created_at, is_verified, is_suspended, profile:profiles!doctors_profile_id_fkey(full_name, avatar_url)");
    if (doctorsError) throw new Error("Could not load doctors");

    if (!doctors?.length) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const onboarding = doctors.filter((d: any) => !d.is_verified && !d.is_suspended);
    let sent = 0;
    let skipped = 0;
    let failed = 0;
    let due = 0;
    const now = Date.now();

    for (const d of onboarding as any[]) {
      // availability check
      const { data: availability, error: availabilityError } = await service
        .from("doctor_availability")
        .select("is_available, start_time, end_time")
        .eq("doctor_id", d.profile_id);
      if (availabilityError) throw new Error("Could not check doctor scheduling");
      const hasAvailability = hasUsableAvailability(availability ?? []);

      const missing = missingItems(d, hasAvailability);
      if (missing.length === 0) { skipped++; continue; }

      const ageMin = (now - new Date(d.created_at).getTime()) / 60000;

      const { data: previous, error: previousError } = await service.from("doctor_onboarding_email_log")
        .select("reminder_id").eq("doctor_profile_id", d.profile_id).in("status", ["sent", "delivered", "opened", "clicked"]);
      if (previousError) throw new Error("Could not check previous reminders");
      const sentIds = new Set<string>((previous ?? []).map(log => log.reminder_id).filter((id): id is string => typeof id === "string"));
      const r = nextDueReminder(reminders, sentIds, ageMin);
      if (!r) continue;
      due++;
      if (body.dryRun === true) continue;
      const { data: userData, error: userError } = await service.auth.admin.getUserById(d.profile_id);
      if (userError) { failed++; continue; }
      const email = userData?.user?.email;
      if (!email) continue;
      const fullName = d.profile?.full_name || "Doctor";

        const vars = {
          doctor_name: fullName,
          missing_items: missing.map((m) => `• ${m}`).join("\n"),
        };
        const bodyText = render(r.body, vars);
        const subject = render(r.subject, vars);
        const html = `<div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#0f172a;white-space:pre-wrap;">${escapeHtml(bodyText)}
<p style="margin-top:24px;"><a href="https://doctorsonlining.com/doctor-dashboard" style="background:#0d9488;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;">Complete my profile</a></p>
<p style="color:#64748b;font-size:13px;margin-top:24px;">— The Doctors Onlining Team</p></div>`;

        const resp = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from: FROM, to: [email], subject, html }),
        });
        const data = await resp.json();

        const { error: logError } = await service.from("doctor_onboarding_email_log").insert({
          doctor_profile_id: d.profile_id,
          doctor_name: fullName,
          email_type: "reminder",
          reminder_id: r.id,
          recipient: email,
          subject,
          status: resp.ok ? "sent" : "failed",
          error: resp.ok ? null : JSON.stringify(data),
          resend_id: resp.ok ? data.id : null,
        });
        if (logError) throw new Error("Could not record reminder result");
        if (resp.ok) sent++;
        else { failed++; console.error("Doctor reminder provider rejected send", resp.status); }
    }

    console.info("Doctor reminders processed", JSON.stringify({ sent, failed, due, completeSkipped: skipped, dryRun: body.dryRun === true }));
    return new Response(JSON.stringify({ ok: failed === 0, sent, failed, due, completeSkipped: skipped, dryRun: body.dryRun === true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("reminder processor error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
