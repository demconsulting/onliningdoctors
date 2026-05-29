// Edge function: impersonate-user
// Allows platform_admin / super_admin to obtain a real Supabase session
// for any target user, password-less, while logging the action.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

interface Body {
  target_user_id?: string;
  reason?: string;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }
    const token = auth.slice("Bearer ".length);

    // Verify caller identity.
    const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const { data: claimsData, error: claimsErr } = await callerClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) return json({ error: "Unauthorized" }, 401);
    const adminUserId = claimsData.claims.sub as string;

    // Parse + validate input.
    const body = (await req.json().catch(() => ({}))) as Body;
    const targetUserId = String(body.target_user_id || "").trim();
    const reason = String(body.reason || "").trim();
    if (!UUID.test(targetUserId)) return json({ error: "Invalid target_user_id" }, 400);
    if (reason.length < 5 || reason.length > 1000) {
      return json({ error: "Reason must be 5–1000 characters" }, 400);
    }
    if (targetUserId === adminUserId) {
      return json({ error: "Cannot impersonate yourself" }, 400);
    }

    // Service-role client for elevated checks and writes.
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Authorization: caller must have platform_admin or super_admin.
    const { data: roles, error: roleErr } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", adminUserId);
    if (roleErr) return json({ error: roleErr.message }, 500);
    const allowed = (roles ?? []).some((r) =>
      r.role === "platform_admin" || r.role === "super_admin"
    );
    if (!allowed) return json({ error: "Forbidden: requires platform_admin or super_admin" }, 403);

    // Resolve target user email.
    const { data: targetData, error: targetErr } = await admin.auth.admin.getUserById(targetUserId);
    if (targetErr || !targetData?.user?.email) {
      return json({ error: "Target user not found or has no email" }, 404);
    }
    const targetEmail = targetData.user.email;

    // Pull a display name from profiles if present.
    const { data: profile } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", targetUserId)
      .maybeSingle();
    const targetName = (profile?.full_name as string | undefined) || targetEmail;

    // Capture request metadata.
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      null;
    const ua = req.headers.get("user-agent") || null;

    // Insert audit row FIRST so we never mint a session without a log.
    const { data: logRow, error: logErr } = await admin
      .from("admin_impersonation_logs")
      .insert({
        admin_user_id: adminUserId,
        target_user_id: targetUserId,
        reason,
        ip_address: ip,
        user_agent: ua,
      })
      .select("id")
      .single();
    if (logErr || !logRow) return json({ error: logErr?.message || "Failed to log" }, 500);

    // Generate a magic link, then exchange the hashed token for a real session.
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: targetEmail,
    });
    if (linkErr || !linkData?.properties?.hashed_token) {
      return json({ error: linkErr?.message || "Failed to generate link" }, 500);
    }

    const anonClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data: otpData, error: otpErr } = await anonClient.auth.verifyOtp({
      type: "magiclink",
      token_hash: linkData.properties.hashed_token,
    });
    if (otpErr || !otpData?.session) {
      return json({ error: otpErr?.message || "Failed to mint session" }, 500);
    }

    return json({
      log_id: logRow.id,
      access_token: otpData.session.access_token,
      refresh_token: otpData.session.refresh_token,
      expires_at: otpData.session.expires_at,
      target: {
        id: targetUserId,
        email: targetEmail,
        full_name: targetName,
      },
    });
  } catch (e) {
    console.error("impersonate-user error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
