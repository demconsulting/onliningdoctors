import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FROM = "Doctors Onlining <assist@doctorsonlining.com>";
const REPLY_TO = "assist@doctorsonlining.com";
const SITE_URL = "https://doctorsonlining.com";
const LOGO_URL = "https://doctorsonlining.com/icon-192.png";
const BRAND = "#1a73e8";
const SUPPORT_EMAIL = "assist@doctorsonlining.com";

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

function emailShell(title: string, bodyHtml: string, footerExtra = ""): string {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f4f7fb;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">
    <div style="text-align:center;padding:8px 0 20px;">
      <a href="${SITE_URL}" style="text-decoration:none;">
        <img src="${LOGO_URL}" alt="Doctors Onlining" width="56" height="56" style="display:inline-block;border-radius:12px;" />
      </a>
    </div>
    <div style="background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e2e8f0;">
      <h1 style="margin:0 0 16px;font-size:22px;color:${BRAND};">${esc(title)}</h1>
      ${bodyHtml}
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0;" />
      <p style="font-size:12px;color:#64748b;margin:0 0 6px;">Need help? Contact <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND};">${SUPPORT_EMAIL}</a></p>
      ${footerExtra}
      <p style="font-size:12px;color:#94a3b8;margin:10px 0 0;">© ${new Date().getFullYear()} Doctors Onlining · <a href="${SITE_URL}" style="color:${BRAND};">doctorsonlining.com</a></p>
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
    const { appointment_id, kind, minutes_before } = body as { appointment_id?: string; kind?: string; minutes_before?: number };
    const minBefore = kind === "reminder" && Number.isFinite(Number(minutes_before)) && Number(minutes_before) > 0
      ? Math.round(Number(minutes_before))
      : null;
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

    const typeSuffix = kind === "reminder" && minBefore != null ? `reminder_${minBefore}` : kind;
    const patientType = `${typeSuffix}_patient`;
    const doctorType = `${typeSuffix}_doctor`;

    // Dedup check
    const { data: existing } = await service
      .from("booking_email_log")
      .select("email_type, status")
      .eq("appointment_id", appointment_id)
      .in("email_type", [patientType, doctorType]);
    const sentTypes = new Set(
      (existing || []).filter((r: any) => r.status === "sent").map((r: any) => r.email_type)
    );

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

    const isReminder = kind === "reminder";
    const patientTitle = isReminder ? "Reminder: Your appointment starts soon" : "Appointment Confirmed";
    const doctorTitle = isReminder ? "Reminder: Upcoming appointment" : "New Appointment Booked";

    const detailsRow = (label: string, value: string) =>
      `<tr><td style="padding:8px 0;color:#64748b;width:130px;">${esc(label)}</td><td style="padding:8px 0;font-weight:600;">${value}</td></tr>`;

    const ctaButton = isVideo
      ? `<p style="text-align:center;margin:24px 0;"><a href="${esc(joinLink)}" style="background:${BRAND};color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">Join Consultation</a></p>
         <p style="font-size:12px;color:#64748b;text-align:center;margin:0;">Or copy this link: <a href="${esc(joinLink)}" style="color:${BRAND};">${esc(joinLink)}</a></p>`
      : "";

    const patientHtml = emailShell(patientTitle, `
      <p style="margin:0 0 12px;">Hi ${esc(patientName)},</p>
      <p style="margin:0 0 16px;">${isReminder ? "This is a friendly reminder about your upcoming consultation." : "Your consultation has been successfully booked."}</p>
      <table style="width:100%;border-collapse:collapse;margin:8px 0 4px;">
        ${detailsRow("Doctor", `Dr. ${esc(doctorName)}`)}
        ${detailsRow("Date", esc(date))}
        ${detailsRow("Time", esc(time))}
        ${detailsRow("Type", esc(consultationType))}
      </table>
      ${ctaButton}
    `);

    const doctorHtml = emailShell(doctorTitle, `
      <p style="margin:0 0 12px;">Hi Dr. ${esc(doctorName)},</p>
      <p style="margin:0 0 16px;">${isReminder ? "You have a consultation starting soon." : "A new appointment has been booked with you."}</p>
      <table style="width:100%;border-collapse:collapse;margin:8px 0 4px;">
        ${detailsRow("Patient", esc(patientName))}
        ${detailsRow("Date", esc(date))}
        ${detailsRow("Time", esc(time))}
        ${detailsRow("Type", esc(consultationType))}
        ${appt.reason ? detailsRow("Reason", esc(appt.reason)) : ""}
      </table>
      ${ctaButton}
    `);

    // Subjects per spec
    const patientSubject = isReminder
      ? `Doctors Onlining – Reminder: Appointment with Dr. ${doctorName}`
      : `Doctors Onlining – Appointment Confirmed`;
    const doctorSubject = isReminder
      ? `Doctors Onlining – Reminder: Appointment with ${patientName}`
      : `Doctors Onlining – New Appointment Booked`;

    const results: Record<string, unknown> = {};

    // Patient
    if (patientEmail && !sentTypes.has(patientType)) {
      const r = await sendResend(RESEND_API_KEY, patientEmail, patientSubject, patientHtml);
      await service.from("booking_email_log").insert({
        appointment_id, email_type: patientType, recipient: patientEmail,
        resend_id: r.id || null, status: r.error ? "failed" : "sent", error: r.error || null,
      });
      results.patient = r;
    } else {
      results.patient = { skipped: !patientEmail ? "no_email" : "already_sent" };
    }

    // Doctor
    if (doctorEmail && !sentTypes.has(doctorType)) {
      const r = await sendResend(RESEND_API_KEY, doctorEmail, doctorSubject, doctorHtml);
      await service.from("booking_email_log").insert({
        appointment_id, email_type: doctorType, recipient: doctorEmail,
        resend_id: r.id || null, status: r.error ? "failed" : "sent", error: r.error || null,
      });
      results.doctor = r;
    } else {
      results.doctor = { skipped: !doctorEmail ? "no_email" : "already_sent" };
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
