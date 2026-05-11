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

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function defaultHtml(message: string): string {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f4f7fb;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">
    <div style="text-align:center;padding:8px 0 20px;">
      <img src="${LOGO_URL}" alt="Doctors Onlining" width="56" height="56" style="display:inline-block;border-radius:12px;" />
    </div>
    <div style="background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e2e8f0;">
      <h1 style="margin:0 0 16px;font-size:22px;color:${BRAND};">Test Email</h1>
      <p style="margin:0 0 12px;line-height:1.6;">${esc(message)}</p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0;" />
      <p style="font-size:12px;color:#94a3b8;margin:0;">© ${new Date().getFullYear()} Doctors Onlining · <a href="${SITE_URL}" style="color:${BRAND};">doctorsonlining.com</a></p>
    </div>
  </div></body></html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: userData } = await service.auth.getUser(token);
    const userId = userData?.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roles } = await service
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin");

    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { to, subject, message, html } = body as {
      to?: string; subject?: string; message?: string; html?: string;
    };

    if (!to || !subject || (!message && !html)) {
      return new Response(JSON.stringify({ error: "Missing to, subject, or message/html" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const finalHtml = html && html.trim().length > 0 ? html : defaultHtml(message || "");

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [to], reply_to: REPLY_TO, subject, html: finalHtml }),
    });
    const data = await res.json().catch(() => ({}));

    // Log to booking_email_log so it shows alongside other emails
    await service.from("booking_email_log").insert({
      appointment_id: "00000000-0000-0000-0000-000000000000",
      email_type: "admin_test",
      recipient: to,
      resend_id: data?.id || null,
      status: res.ok ? "sent" : "failed",
      error: res.ok ? null : `[${res.status}] ${JSON.stringify(data)}`,
    });

    if (!res.ok) {
      return new Response(JSON.stringify({ error: data, status: res.status }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("send-test-email error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
