import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claimsData.claims.sub;
    const { data: roles } = await supabase
      .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin");
    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const recipients: { email: string; name?: string; prospectId?: string }[] = Array.isArray(body.recipients) ? body.recipients : [];
    const subject: string = String(body.subject || "").slice(0, 200);
    const html: string = String(body.html || body.message || "").slice(0, 20000);
    const templateKey: string | undefined = body.templateKey;

    if (!recipients.length || !subject || !html) {
      return new Response(JSON.stringify({ error: "Missing recipients, subject, or message" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const serviceClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const results: any[] = [];

    for (const r of recipients) {
      if (!r.email) continue;
      const personalized = html.replace(/\{\{name\}\}/g, escapeHtml(r.name || "Doctor"));
      const wrapped = `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #0f172a;">${personalized}<p style="color:#6b7280;font-size:12px;margin-top:32px;">— Doctors Onlining Recruitment Team</p></div>`;
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "Doctors Onlining <onboarding@resend.dev>",
            to: [r.email],
            subject,
            html: wrapped,
          }),
        });
        const data = await res.json();
        const ok = res.ok;
        results.push({ email: r.email, ok, id: data?.id, error: ok ? null : data });

        if (r.prospectId) {
          await serviceClient.from("recruitment_communications").insert({
            prospect_id: r.prospectId,
            channel: "email",
            direction: "outbound",
            subject,
            body: html,
            template_key: templateKey || null,
            delivery_status: ok ? "sent" : "failed",
            outcome: ok ? null : JSON.stringify(data).slice(0, 500),
            created_by: userId,
          });
        }
      } catch (e: any) {
        results.push({ email: r.email, ok: false, error: e?.message });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("send-recruitment-email error:", error);
    return new Response(JSON.stringify({ error: error?.message || "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
