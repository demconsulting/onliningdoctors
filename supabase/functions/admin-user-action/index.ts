import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ELEVATED = new Set(["platform_admin", "super_admin"]);
const ALLOWED_ACTIONS = new Set([
  "view", "suspend", "unsuspend", "deactivate", "reactivate",
  "archive", "delete", // delete = permanent
]);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: uErr } = await supabase.auth.getUser();
    if (uErr || !user) return json({ error: "Unauthorized" }, 401);

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: roleRows } = await service
      .from("user_roles").select("role").eq("user_id", user.id);
    const callerRoles = new Set((roleRows || []).map(r => String(r.role)));
    const isAdmin = callerRoles.has("admin");
    const isElevated = [...callerRoles].some(r => ELEVATED.has(r));

    const body = await req.json().catch(() => ({}));
    const { action, target_user_id, reason, notes, confirmed } = body || {};

    if (!action || !ALLOWED_ACTIONS.has(action)) return json({ error: "Invalid action" }, 400);
    if (!target_user_id) return json({ error: "target_user_id required" }, 400);
    if (target_user_id === user.id) return json({ error: "You cannot perform this action on your own account" }, 400);

    // View is open to any admin
    if (action === "view") {
      if (!isAdmin && !isElevated) return json({ error: "Forbidden" }, 403);
      const { data: profile } = await service.from("profiles").select("*").eq("id", target_user_id).maybeSingle();
      const { data: targetRoles } = await service.from("user_roles").select("role").eq("user_id", target_user_id);
      const { data: authUser } = await service.auth.admin.getUserById(target_user_id);
      const { data: deps } = await service.rpc("user_delete_dependencies", { _user_id: target_user_id });
      return json({ profile, roles: targetRoles, email: authUser?.user?.email, dependencies: deps });
    }

    // Mutating actions require a reason
    if (!reason || String(reason).trim().length < 5) {
      return json({ error: "A reason of at least 5 characters is required" }, 400);
    }

    // Destructive actions (archive, delete, deactivate) require elevated role + explicit confirmation
    const destructive = ["archive", "delete", "deactivate"].includes(action);
    if (destructive) {
      if (!isElevated) return json({ error: "Only platform_admin or super_admin can perform this action" }, 403);
      if (!confirmed) return json({ error: "Confirmation checkbox required" }, 400);
    } else {
      if (!isAdmin && !isElevated) return json({ error: "Forbidden" }, 403);
    }

    // Prevent acting on another elevated admin unless caller is super_admin
    const { data: targetRoleRows } = await service
      .from("user_roles").select("role").eq("user_id", target_user_id);
    const targetRoles = new Set((targetRoleRows || []).map(r => String(r.role)));
    const targetIsElevated = [...targetRoles].some(r => ELEVATED.has(r));
    if (targetIsElevated && !callerRoles.has("super_admin")) {
      return json({ error: "Only super_admin can modify another elevated admin" }, 403);
    }

    // Get previous status
    const { data: profileBefore } = await service
      .from("profiles").select("account_status, full_name").eq("id", target_user_id).maybeSingle();
    const previous_status = profileBefore?.account_status || "active";
    let new_status: string | null = previous_status;

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || null;
    const ua = req.headers.get("user-agent") || null;

    if (action === "delete") {
      const { data: deps } = await service.rpc("user_delete_dependencies", { _user_id: target_user_id });
      const total = Object.values(deps || {}).reduce((a: number, v: any) => a + Number(v || 0), 0);
      if (total > 0) {
        return json({
          error: "This user has linked healthcare or transaction records and cannot be permanently deleted. Archive instead.",
          dependencies: deps,
        }, 409);
      }
      // Hard delete: auth.users + roles + profile (cascade where present)
      await service.from("user_roles").delete().eq("user_id", target_user_id);
      await service.from("profiles").delete().eq("id", target_user_id);
      await service.auth.admin.deleteUser(target_user_id);
      new_status = "deleted";
    } else if (action === "suspend") {
      await service.from("profiles")
        .update({ account_status: "suspended", is_suspended: true, suspension_reason: reason })
        .eq("id", target_user_id);
      if (targetRoles.has("doctor")) {
        await service.from("doctors")
          .update({ is_suspended: true, is_available: false, suspension_reason: reason })
          .eq("profile_id", target_user_id);
      }
      new_status = "suspended";
    } else if (action === "unsuspend" || action === "reactivate") {
      await service.from("profiles")
        .update({ account_status: "active", is_suspended: false, suspension_reason: null })
        .eq("id", target_user_id);
      if (targetRoles.has("doctor")) {
        await service.from("doctors")
          .update({ is_suspended: false, suspension_reason: null })
          .eq("profile_id", target_user_id);
      }
      // Re-enable auth login
      try { await service.auth.admin.updateUserById(target_user_id, { ban_duration: "none" } as any); } catch (_) {}
      new_status = "active";
    } else if (action === "deactivate") {
      await service.from("profiles")
        .update({ account_status: "deactivated", is_suspended: true, suspension_reason: reason })
        .eq("id", target_user_id);
      if (targetRoles.has("doctor")) {
        await service.from("doctors")
          .update({ is_suspended: true, is_available: false, suspension_reason: reason })
          .eq("profile_id", target_user_id);
      }
      // Revoke login: ban for ~100 years
      try { await service.auth.admin.updateUserById(target_user_id, { ban_duration: "876000h" } as any); } catch (_) {}
      new_status = "deactivated";
    } else if (action === "archive") {
      await service.from("profiles")
        .update({ account_status: "archived", is_suspended: true, suspension_reason: reason })
        .eq("id", target_user_id);
      if (targetRoles.has("doctor")) {
        await service.from("doctors")
          .update({ is_suspended: true, is_available: false, suspension_reason: reason })
          .eq("profile_id", target_user_id);
      }
      try { await service.auth.admin.updateUserById(target_user_id, { ban_duration: "876000h" } as any); } catch (_) {}
      new_status = "archived";
    }

    // Audit log
    await service.from("admin_user_action_logs").insert({
      admin_user_id: user.id,
      target_user_id,
      action_type: action,
      reason: String(reason).trim(),
      notes: notes ? String(notes).trim() : null,
      previous_status,
      new_status,
      ip_address: ip,
      user_agent: ua,
    });

    return json({ success: true, new_status });
  } catch (err) {
    console.error("admin-user-action error:", err);
    return json({ error: "An internal error occurred. Please try again." }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
