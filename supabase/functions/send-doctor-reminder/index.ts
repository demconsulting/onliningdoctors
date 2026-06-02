import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FROM = "Doctors Onlining <assist@doctorsonlining.com>";

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
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: claimsData } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    const adminId = claimsData?.claims?.sub as string | undefined;
    if (!adminId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: roles } = await userClient.from("user_roles").select("role").eq("user_id", adminId).eq("role", "admin");
    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const {
      doctorProfileId,
      reminderId,
      reminderType,         // optional label (e.g. "custom", "welcome", "hpcsa_upload")
      subject: customSubject,
      message: customMessage,
      testRecipient,        // optional override for "Send test"
    } = body as {
      doctorProfileId?: string;
      reminderId?: string;
      reminderType?: string;
      subject?: string;
      message?: string;
      testRecipient?: string;
    };

    if (!doctorProfileId && !testRecipient) {
      return new Response(JSON.stringify({ error: "doctorProfileId or testRecipient required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Resolve subject/body
    let subject = customSubject || "";
    let bodyText = customMessage || "";
    let resolvedReminderId: string | null = reminderId || null;

    if (reminderId) {
      const { data: r } = await service.from("doctor_onboarding_reminders").select("subject, body").eq("id", reminderId).single();
      if (r) { subject = subject || r.subject; bodyText = bodyText || r.body; }
    }

    if (!subject || !bodyText) {
      return new Response(JSON.stringify({ error: "Subject and message required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Resolve recipient + doctor name + missing items
    let recipient = testRecipient || "";
    let doctorName = "Doctor";
    let doctorIdForLog = doctorProfileId || null;

    if (doctorProfileId) {
      const [{ data: userData }, { data: profile }, { data: doctor }, { count: availCount }] = await Promise.all([
        service.auth.admin.getUserById(doctorProfileId),
        service.from("profiles").select("full_name, avatar_url").eq("id", doctorProfileId).single(),
        service.from("doctors").select("id_document_path, license_document_path, consultation_fee").eq("profile_id", doctorProfileId).single(),
        service.from("doctor_availability").select("id", { count: "exact", head: true }).eq("doctor_id", doctorProfileId),
      ]);
      doctorName = profile?.full_name || "Doctor";
      if (!recipient) recipient = userData?.user?.email || "";

      const missing: string[] = [];
      if (!doctor?.id_document_path) missing.push("ID Copy");
      if (!doctor?.license_document_path) missing.push("HPCSA Document");
      if (!profile?.avatar_url) missing.push("Profile Photo");
      if (!doctor?.consultation_fee || Number(doctor.consultation_fee) <= 0) missing.push("Consultation Fee");
      if ((availCount ?? 0) === 0) missing.push("Availability");

      const vars = { doctor_name: doctorName, missing_items: missing.map((m) => `• ${m}`).join("\n") || "All required information is complete." };
      subject = render(subject, vars);
      bodyText = render(bodyText, vars);
    }

    if (!recipient) {
      return new Response(JSON.stringify({ error: "Could not resolve recipient email" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const html = `<div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#0f172a;white-space:pre-wrap;">${escapeHtml(bodyText)}
<p style="margin-top:24px;"><a href="https://doctorsonlining.com/doctor" style="background:#0d9488;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;">Complete my profile</a></p>
<p style="color:#64748b;font-size:13px;margin-top:24px;">— The Doctors Onlining Team</p></div>`;

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [recipient], subject, html }),
    });
    const data = await resp.json();

    // Log to onboarding email log (only when associated with a doctor)
    if (doctorIdForLog) {
      await service.from("doctor_onboarding_email_log").insert({
        doctor_profile_id: doctorIdForLog,
        doctor_name: doctorName,
        email_type: reminderType || (reminderId ? "reminder" : "manual"),
        reminder_id: resolvedReminderId,
        recipient,
        subject,
        status: resp.ok ? "sent" : "failed",
        error: resp.ok ? null : JSON.stringify(data),
        resend_id: resp.ok ? data.id : null,
        created_by: adminId,
      });
    }

    if (!resp.ok) {
      return new Response(JSON.stringify({ error: data }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ ok: true, id: data.id, recipient }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("send-doctor-reminder error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
