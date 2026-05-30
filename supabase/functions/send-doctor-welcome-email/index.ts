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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY missing");

    const { doctorProfileId } = await req.json();
    if (!doctorProfileId || typeof doctorProfileId !== "string") {
      return new Response(JSON.stringify({ error: "doctorProfileId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Ensure this is a real doctor and welcome not yet sent
    const { data: doctor } = await service
      .from("doctors")
      .select("id, profile_id, welcome_email_sent_at")
      .eq("profile_id", doctorProfileId)
      .maybeSingle();

    if (!doctor) {
      return new Response(JSON.stringify({ error: "Not a doctor" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (doctor.welcome_email_sent_at) {
      return new Response(JSON.stringify({ success: true, skipped: "already sent" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: userData } = await service.auth.admin.getUserById(doctorProfileId);
    const email = userData?.user?.email;
    if (!email) throw new Error("No email for user");

    const { data: profile } = await service.from("profiles")
      .select("full_name").eq("id", doctorProfileId).maybeSingle();
    const name = escapeHtml(profile?.full_name || "Doctor");

    const subject = "Welcome to Doctors Onlining";
    const html = `<div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#0f172a;">
      <h2 style="color:#0d9488;margin:0 0 12px;">Welcome to Doctors Onlining, Dr ${name}</h2>
      <p>Thank you for registering. To activate your account and start consulting, please complete your onboarding:</p>
      <ul style="line-height:1.8;">
        <li>Upload your ID copy</li>
        <li>Upload your HPCSA certificate / registration</li>
        <li>Add a professional profile photo</li>
        <li>Set your consultation fee</li>
        <li>Set your availability schedule</li>
      </ul>
      <p style="margin-top:20px;">
        <a href="https://doctorsonlining.com/doctor" style="background:#0d9488;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;">Complete my profile</a>
      </p>
      <p style="color:#64748b;font-size:13px;margin-top:28px;">Need help? Reply to this email and our team will assist.<br/>— The Doctors Onlining Team</p>
    </div>`;

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [email], subject, html }),
    });
    const data = await resp.json();

    if (resp.ok) {
      await service.from("doctors")
        .update({ welcome_email_sent_at: new Date().toISOString() })
        .eq("profile_id", doctorProfileId);
      await service.from("doctor_onboarding_email_log").insert({
        doctor_profile_id: doctorProfileId,
        email_type: "welcome",
        recipient: email,
        subject,
        status: "sent",
        resend_id: data.id,
      });
      return new Response(JSON.stringify({ success: true, id: data.id }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      await service.from("doctor_onboarding_email_log").insert({
        doctor_profile_id: doctorProfileId,
        email_type: "welcome",
        recipient: email,
        subject,
        status: "failed",
        error: JSON.stringify(data),
      });
      throw new Error(`Resend ${resp.status}: ${JSON.stringify(data)}`);
    }
  } catch (e) {
    console.error("welcome email error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
