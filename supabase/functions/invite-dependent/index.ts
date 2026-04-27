import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SITE_URL = "https://doctorsonlining.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Unauthorized" }, 401);
    }

    // Verify caller
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const guardianId = userData.user.id;
    const guardianName = userData.user.user_metadata?.full_name || userData.user.email || "Your family member";

    const body = await req.json();
    const dependentId = body?.dependent_id;
    if (!dependentId || typeof dependentId !== "string") {
      return json({ error: "dependent_id is required" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: dep, error: depErr } = await admin
      .from("dependents")
      .select("*")
      .eq("id", dependentId)
      .eq("guardian_id", guardianId)
      .maybeSingle();

    if (depErr || !dep) return json({ error: "Dependent not found" }, 404);
    if (dep.is_minor) return json({ error: "Minor dependents do not need a login" }, 400);
    if (!dep.email) return json({ error: "Dependent has no email" }, 400);
    if (!dep.allow_login) return json({ error: "Login is not enabled for this dependent" }, 400);

    // Generate token
    const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    await admin
      .from("dependents")
      .update({
        invitation_token: token,
        invitation_sent_at: new Date().toISOString(),
        invitation_status: "pending",
      })
      .eq("id", dependentId);

    const acceptUrl = `${SITE_URL}/dependent-invite?token=${token}`;

    const html = `
      <!doctype html>
      <html><body style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; background:#f6f9fc; padding:24px;">
        <div style="max-width:560px; margin:0 auto; background:#fff; border-radius:12px; padding:32px; border:1px solid #e6ecf2;">
          <h1 style="color:#0f766e; font-size:22px; margin:0 0 12px;">You've been added as a family member</h1>
          <p style="color:#1f2937; font-size:15px; line-height:1.6;">Hi ${escapeHtml(dep.full_name)},</p>
          <p style="color:#1f2937; font-size:15px; line-height:1.6;">
            <strong>${escapeHtml(guardianName)}</strong> has added you as a dependent on their Doctors Onlining family account.
            They've enabled login for you so you can manage your own consultations and medical records.
          </p>
          <p style="color:#1f2937; font-size:15px; line-height:1.6;">
            Click the button below to create your password and accept the invitation.
            You'll also be asked whether you consent to share your medical records with your family account holder.
          </p>
          <p style="text-align:center; margin:28px 0;">
            <a href="${acceptUrl}" style="background:#0d9488; color:#fff; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:600; display:inline-block;">Accept invitation</a>
          </p>
          <p style="color:#6b7280; font-size:13px;">If the button doesn't work, copy and paste this link:<br/>${acceptUrl}</p>
          <hr style="border:none; border-top:1px solid #e5e7eb; margin:24px 0;" />
          <p style="color:#6b7280; font-size:12px;">If you weren't expecting this invitation, you can safely ignore this email.</p>
        </div>
      </body></html>
    `;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Doctors Onlining <noreply@doctorsonlining.com>",
        to: [dep.email],
        subject: `${guardianName} invited you to Doctors Onlining`,
        html,
      }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      console.error("Resend error:", errText);
      return json({ error: "Failed to send email", details: errText }, 500);
    }

    return json({ success: true });
  } catch (err) {
    console.error(err);
    return json({ error: (err as Error).message }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
