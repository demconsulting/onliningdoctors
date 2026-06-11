import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function escapeHtml(input: string): string {
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const FIELD_LABELS: Record<string, string> = {
  full_name: "Full Name",
  license_number: "HPCSA Registration Number",
  specialty_id: "Specialty",
  education: "Qualifications",
  license_document_path: "HPCSA Document",
  id_document_path: "ID Document",
  practice_name: "Practice Name",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const doctorId = claims.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const changedFields = Array.isArray(body?.changedFields) ? body.changedFields : [];
    if (changedFields.length === 0) {
      return new Response(JSON.stringify({ skipped: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Confirm caller is a doctor
    const { data: roles } = await service
      .from("user_roles").select("role").eq("user_id", doctorId);
    const isDoctor = (roles || []).some((r: any) => r.role === "doctor");
    if (!isDoctor) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Doctor info
    const { data: profile } = await service.from("profiles")
      .select("full_name").eq("id", doctorId).single();
    const { data: doctorRow } = await service.from("doctors")
      .select("license_number").eq("profile_id", doctorId).single();

    // Admin user IDs
    const { data: adminRoles } = await service
      .from("user_roles").select("user_id").eq("role", "admin");
    const adminIds: string[] = Array.from(new Set((adminRoles || []).map((r: any) => r.user_id)));
    if (adminIds.length === 0) {
      return new Response(JSON.stringify({ success: true, admins: 0 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve admin emails via auth admin API
    const adminEmails: string[] = [];
    for (const id of adminIds) {
      const { data } = await service.auth.admin.getUserById(id);
      if (data?.user?.email) adminEmails.push(data.user.email);
    }
    if (adminEmails.length === 0) {
      return new Response(JSON.stringify({ success: true, admins: 0 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const doctorName = profile?.full_name || "A doctor";
    const hpcsa = doctorRow?.license_number || "—";
    const submittedAt = new Date().toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" });
    const fieldList = (changedFields as string[])
      .map((f) => FIELD_LABELS[f] || f.replace(/_/g, " "))
      .join(", ");

    const origin = req.headers.get("origin") || "https://doctorsonlining.com";
    const reviewLink = `${origin}/admin?section=profile-reviews`;

    const safeName = escapeHtml(doctorName);
    const safeHpcsa = escapeHtml(hpcsa);
    const safeFields = escapeHtml(fieldList);
    const safeWhen = escapeHtml(submittedAt);

    const html = `
      <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #0f172a;">
        <h2 style="color: #0891b2; margin: 0 0 16px;">Doctor Profile Change Requires Review</h2>
        <p>A doctor has submitted profile changes that require approval.</p>
        <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
          <tr><td style="padding: 8px 0; color: #64748b; width: 140px;">Doctor</td><td><strong>${safeName}</strong></td></tr>
          <tr><td style="padding: 8px 0; color: #64748b;">HPCSA</td><td>${safeHpcsa}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b;">Fields Changed</td><td>${safeFields}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b;">Submitted</td><td>${safeWhen}</td></tr>
        </table>
        <p style="margin: 24px 0;">
          <a href="${reviewLink}" style="background: #0891b2; color: #ffffff; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 600;">
            Review Request
          </a>
        </p>
        <p style="color: #6b7280; font-size: 13px; margin-top: 24px;">
          The doctor's current approved profile remains visible to patients until your review.
        </p>
      </div>`;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "onboarding@resend.dev",
        to: adminEmails,
        subject: "Doctor Profile Change Requires Review",
        html,
      }),
    });
    const resendData = await resendRes.json();
    if (!resendRes.ok) {
      throw new Error(`Resend error [${resendRes.status}]: ${JSON.stringify(resendData)}`);
    }

    return new Response(JSON.stringify({ success: true, admins: adminEmails.length, id: resendData.id }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("notify-admins-profile-change error:", error);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
