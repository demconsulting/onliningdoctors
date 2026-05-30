import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FROM = "Doctors Onlining <assist@doctorsonlining.com>";

function missingItems(doctor: any, hasAvailability: boolean): string[] {
  const missing: string[] = [];
  if (!doctor.id_document_path) missing.push("ID Copy");
  if (!doctor.license_document_path) missing.push("HPCSA Document");
  if (!doctor.profile?.avatar_url) missing.push("Profile Photo");
  if (!doctor.consultation_fee || Number(doctor.consultation_fee) <= 0) missing.push("Consultation Fee");
  if (!hasAvailability) missing.push("Availability");
  return missing;
}

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

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: reminders } = await service
      .from("doctor_onboarding_reminders")
      .select("*")
      .eq("is_active", true)
      .order("delay_minutes", { ascending: true });

    if (!reminders?.length) {
      return new Response(JSON.stringify({ ok: true, sent: 0, reason: "no active reminders" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Unverified doctors (still onboarding)
    const { data: doctors } = await service
      .from("doctors")
      .select("id, profile_id, license_document_path, id_document_path, consultation_fee, created_at, is_verified, is_suspended, profile:profiles!doctors_profile_id_fkey(full_name, avatar_url)");

    if (!doctors?.length) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const onboarding = doctors.filter((d: any) => !d.is_verified && !d.is_suspended);
    let sent = 0;
    let skipped = 0;
    const now = Date.now();

    for (const d of onboarding as any[]) {
      // availability check
      const { count: availCount } = await service
        .from("doctor_availability")
        .select("id", { count: "exact", head: true })
        .eq("doctor_id", d.profile_id);
      const hasAvailability = (availCount ?? 0) > 0;

      const missing = missingItems(d, hasAvailability);
      if (missing.length === 0) { skipped++; continue; }

      const ageMin = (now - new Date(d.created_at).getTime()) / 60000;

      const { data: userData } = await service.auth.admin.getUserById(d.profile_id);
      const email = userData?.user?.email;
      if (!email) continue;
      const fullName = d.profile?.full_name || "Doctor";

      for (const r of reminders) {
        if (ageMin < r.delay_minutes) continue;

        // duplicate check
        const { data: existing } = await service
          .from("doctor_onboarding_email_log")
          .select("id")
          .eq("doctor_profile_id", d.profile_id)
          .eq("reminder_id", r.id)
          .eq("status", "sent")
          .maybeSingle();
        if (existing) continue;

        const vars = {
          doctor_name: fullName,
          missing_items: missing.map((m) => `• ${m}`).join("\n"),
        };
        const bodyText = render(r.body, vars);
        const subject = render(r.subject, vars);
        const html = `<div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#0f172a;white-space:pre-wrap;">${escapeHtml(bodyText)}
<p style="margin-top:24px;"><a href="https://doctorsonlining.com/doctor" style="background:#0d9488;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;">Complete my profile</a></p>
<p style="color:#64748b;font-size:13px;margin-top:24px;">— The Doctors Onlining Team</p></div>`;

        const resp = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from: FROM, to: [email], subject, html }),
        });
        const data = await resp.json();

        await service.from("doctor_onboarding_email_log").insert({
          doctor_profile_id: d.profile_id,
          email_type: "reminder",
          reminder_id: r.id,
          recipient: email,
          subject,
          status: resp.ok ? "sent" : "failed",
          error: resp.ok ? null : JSON.stringify(data),
          resend_id: resp.ok ? data.id : null,
        });
        if (resp.ok) sent++;
        // Send at most one reminder per doctor per run (the latest due not yet sent)
        if (resp.ok) break;
      }
    }

    return new Response(JSON.stringify({ ok: true, sent, completeSkipped: skipped }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("reminder processor error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
