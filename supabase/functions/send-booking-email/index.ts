import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FROM = "Doctors Onlining <notify@doctorsonlining.com>";
const REPLY_TO = "assist@doctorsonlining.com";
const SITE_URL = "https://doctorsonlining.com";

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function fmtDate(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }),
    time: d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC",
  };
}

function emailShell(title: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f6f9fb;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">
    <div style="background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e2e8f0;">
      <h1 style="margin:0 0 16px;font-size:22px;color:#0d9488;">${esc(title)}</h1>
      ${bodyHtml}
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0;" />
      <p style="font-size:12px;color:#64748b;margin:0;">Doctors Onlining — Reply to <a href="mailto:${REPLY_TO}" style="color:#0d9488;">${REPLY_TO}</a></p>
    </div>
  </div></body></html>`;
}

async function sendResend(apiKey: string, to: string, subject: string, html: string): Promise<{ id?: string; error?: string }> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [to], reply_to: REPLY_TO, subject, html }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: `[${res.status}] ${JSON.stringify(data)}` };
  return { id: data.id };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const body = await req.json().catch(() => ({}));
    const { appointment_id, kind } = body as { appointment_id?: string; kind?: string };
    if (!appointment_id || !["booking_confirmation", "reminder"].includes(kind || "")) {
      return new Response(JSON.stringify({ error: "Missing appointment_id or invalid kind" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Load appointment
    const { data: appt, error: aptErr } = await service
      .from("appointments")
      .select("id, patient_id, doctor_id, scheduled_at, duration_minutes, reason, status")
      .eq("id", appointment_id)
      .maybeSingle();

    if (aptErr || !appt) {
      return new Response(JSON.stringify({ error: "Appointment not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (kind === "reminder" && appt.status !== "confirmed") {
      return new Response(JSON.stringify({ skipped: "not_confirmed" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (kind === "booking_confirmation" && !["pending", "confirmed"].includes(appt.status)) {
      return new Response(JSON.stringify({ skipped: `status_${appt.status}` }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const patientType = `${kind}_patient`;
    const doctorType = `${kind}_doctor`;

    // Dedup check
    const { data: existing } = await service
      .from("booking_email_log")
      .select("email_type")
      .eq("appointment_id", appointment_id)
      .in("email_type", [patientType, doctorType]);
    const sentTypes = new Set((existing || []).map((r: any) => r.email_type));

    // Get profiles
    const [{ data: patientProfile }, { data: doctorProfile }, patientUser, doctorUser] = await Promise.all([
      service.from("profiles").select("full_name").eq("id", appt.patient_id).maybeSingle(),
      service.from("profiles").select("full_name").eq("id", appt.doctor_id).maybeSingle(),
      service.auth.admin.getUserById(appt.patient_id),
      service.auth.admin.getUserById(appt.doctor_id),
    ]);

    const patientEmail = patientUser.data?.user?.email || "";
    const doctorEmail = doctorUser.data?.user?.email || "";
    const patientName = patientProfile?.full_name || "Patient";
    const doctorName = doctorProfile?.full_name || "Doctor";
    const { date, time } = fmtDate(appt.scheduled_at);
    const consultationType = "Video Consultation";
    const isVideo = /video/i.test(consultationType);
    const joinLink = `${SITE_URL}/call/${appt.id}`;

    const intro = kind === "reminder" ? "Reminder: Your appointment starts in 1 hour" : "Your appointment is booked";
    const doctorIntro = kind === "reminder" ? "Reminder: Upcoming appointment in 1 hour" : "New appointment booked";

    const patientHtml = emailShell(intro, `
      <p>Hi ${esc(patientName)},</p>
      <p>${kind === "reminder" ? "This is a friendly reminder about your upcoming consultation." : "Your consultation has been successfully booked."}</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px 0;color:#64748b;">Doctor</td><td style="padding:8px 0;font-weight:600;">Dr. ${esc(doctorName)}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;">Date</td><td style="padding:8px 0;font-weight:600;">${esc(date)}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;">Time</td><td style="padding:8px 0;font-weight:600;">${esc(time)}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;">Type</td><td style="padding:8px 0;font-weight:600;">${esc(consultationType)}</td></tr>
      </table>
      ${isVideo ? `<p style="text-align:center;margin:24px 0;"><a href="${esc(joinLink)}" style="background:#0d9488;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Join Consultation</a></p>` : ""}
    `);

    const doctorHtml = emailShell(doctorIntro, `
      <p>Hi Dr. ${esc(doctorName)},</p>
      <p>${kind === "reminder" ? "You have a consultation starting in 1 hour." : "A new appointment has been booked with you."}</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px 0;color:#64748b;">Patient</td><td style="padding:8px 0;font-weight:600;">${esc(patientName)}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;">Date</td><td style="padding:8px 0;font-weight:600;">${esc(date)}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;">Time</td><td style="padding:8px 0;font-weight:600;">${esc(time)}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;">Type</td><td style="padding:8px 0;font-weight:600;">${esc(consultationType)}</td></tr>
        ${appt.reason ? `<tr><td style="padding:8px 0;color:#64748b;">Reason</td><td style="padding:8px 0;">${esc(appt.reason)}</td></tr>` : ""}
      </table>
      <p style="text-align:center;margin:24px 0;"><a href="${esc(joinLink)}" style="background:#0d9488;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Join Consultation</a></p>
    `);

    const subjectSuffix = kind === "reminder" ? " (in 1 hour)" : "";
    const results: Record<string, unknown> = {};

    // Patient
    if (patientEmail && !sentTypes.has(patientType)) {
      const subj = (kind === "reminder" ? "Reminder: Consultation with Dr. " : "Appointment confirmed with Dr. ") + doctorName + subjectSuffix;
      const r = await sendResend(RESEND_API_KEY, patientEmail, subj, patientHtml);
      await service.from("booking_email_log").insert({
        appointment_id, email_type: patientType, recipient: patientEmail,
        resend_id: r.id || null, status: r.error ? "failed" : "sent", error: r.error || null,
      });
      results.patient = r;
    }

    // Doctor
    if (doctorEmail && !sentTypes.has(doctorType)) {
      const subj = (kind === "reminder" ? "Reminder: Appointment with " : "New appointment: ") + patientName + subjectSuffix;
      const r = await sendResend(RESEND_API_KEY, doctorEmail, subj, doctorHtml);
      await service.from("booking_email_log").insert({
        appointment_id, email_type: doctorType, recipient: doctorEmail,
        resend_id: r.id || null, status: r.error ? "failed" : "sent", error: r.error || null,
      });
      results.doctor = r;
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("send-booking-email error:", error);
    return new Response(
      JSON.stringify({ error: "An internal error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
