import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SITE_URL = "https://doctorsonlining.com";
const FROM = "Doctors Onlining <assist@doctorsonlining.com>";
const REPLY_TO = "assist@doctorsonlining.com";
const LOGO_URL = "https://doctorsonlining.com/icon-192.png";
const BRAND = "#1a73e8";

function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function resetEmailHtml(actionLink: string): string {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f4f7fb;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">
    <div style="text-align:center;padding:8px 0 20px;">
      <a href="${SITE_URL}" style="text-decoration:none;"><img src="${LOGO_URL}" alt="Doctors Onlining" width="56" height="56" style="display:inline-block;border-radius:12px;" /></a>
    </div>
    <div style="background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e2e8f0;">
      <h1 style="margin:0 0 16px;font-size:22px;color:${BRAND};">Reset your password</h1>
      <p style="margin:0 0 16px;line-height:1.6;">We received a request to reset your Doctors Onlining password.</p>
      <p style="text-align:center;margin:28px 0;"><a href="${esc(actionLink)}" style="background:${BRAND};color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">Set new password</a></p>
      <p style="font-size:13px;color:#64748b;line-height:1.6;margin:0 0 12px;">If the button doesn't work, copy and paste this link into your browser:</p>
      <p style="font-size:12px;line-height:1.5;word-break:break-all;margin:0;"><a href="${esc(actionLink)}" style="color:${BRAND};">${esc(actionLink)}</a></p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0;" />
      <p style="font-size:12px;color:#64748b;margin:0;">If you didn't request this, you can safely ignore this email.</p>
      <p style="font-size:12px;color:#94a3b8;margin:10px 0 0;">© ${new Date().getFullYear()} Doctors Onlining · <a href="${SITE_URL}" style="color:${BRAND};">doctorsonlining.com</a></p>
    </div>
  </div></body></html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");

    const { email } = await req.json().catch(() => ({}));
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return new Response(JSON.stringify({ error: "A valid email address is required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await serviceClient.auth.admin.generateLink({
      type: "recovery",
      email: normalizedEmail,
      options: { redirectTo: `${SITE_URL}/reset-password` },
    });

    if (error || !data.properties?.action_link) {
      console.error("Password reset link generation failed:", error?.message || "No action link returned");
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to: [normalizedEmail],
        reply_to: REPLY_TO,
        subject: "Reset your Doctors Onlining password",
        html: resetEmailHtml(data.properties.action_link),
      }),
    });
    const resendData = await resendResponse.json().catch(() => ({}));

    await serviceClient.from("booking_email_log").insert({
      appointment_id: "00000000-0000-0000-0000-000000000000",
      email_type: "password_reset",
      recipient: normalizedEmail,
      resend_id: resendData?.id || null,
      status: resendResponse.ok ? "sent" : "failed",
      error: resendResponse.ok ? null : `[${resendResponse.status}] ${JSON.stringify(resendData)}`,
    });

    if (!resendResponse.ok) {
      console.error("Password reset email failed:", resendData);
      return new Response(JSON.stringify({ error: "Could not send the reset email. Please try again." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("send-password-reset-email error:", error);
    return new Response(JSON.stringify({ error: "Could not send the reset email. Please try again." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});