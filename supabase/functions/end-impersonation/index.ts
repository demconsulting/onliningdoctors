// Edge function: end-impersonation
// Stamps ended_at on the open impersonation log row.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const token = auth.slice("Bearer ".length);

    const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const { data: claimsData, error: claimsErr } = await callerClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) return json({ error: "Unauthorized" }, 401);
    const callerId = claimsData.claims.sub as string;

    const body = (await req.json().catch(() => ({}))) as { log_id?: string };
    const logId = String(body.log_id || "").trim();
    if (!UUID.test(logId)) return json({ error: "Invalid log_id" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Fetch the log; allow close if caller is either the impersonated target,
    // the original admin, or a platform/super admin restoring.
    const { data: logRow, error: fetchErr } = await admin
      .from("admin_impersonation_logs")
      .select("id, admin_user_id, target_user_id, ended_at")
      .eq("id", logId)
      .maybeSingle();
    if (fetchErr) return json({ error: fetchErr.message }, 500);
    if (!logRow) return json({ error: "Log not found" }, 404);

    if (logRow.ended_at) return json({ ok: true, already_ended: true });

    let authorized =
      callerId === logRow.target_user_id || callerId === logRow.admin_user_id;
    if (!authorized) {
      const { data: roles } = await admin
        .from("user_roles")
        .select("role")
        .eq("user_id", callerId);
      authorized = (roles ?? []).some(
        (r) => r.role === "platform_admin" || r.role === "super_admin",
      );
    }
    if (!authorized) return json({ error: "Forbidden" }, 403);

    const { error: updErr } = await admin
      .from("admin_impersonation_logs")
      .update({ ended_at: new Date().toISOString() })
      .eq("id", logId)
      .is("ended_at", null);
    if (updErr) return json({ error: updErr.message }, 500);

    return json({ ok: true });
  } catch (e) {
    console.error("end-impersonation error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
