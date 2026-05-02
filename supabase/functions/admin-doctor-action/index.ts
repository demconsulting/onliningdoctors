import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify admin
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");

    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, doctor_id, profile_id, reason } = body;

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (action === "reject_delete") {
      if (!doctor_id || !profile_id) {
        return new Response(JSON.stringify({ error: "doctor_id and profile_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get doctor info for audit log before deleting
      const { data: doctorInfo } = await serviceClient
        .from("doctors")
        .select("*, profile:profiles!doctors_profile_id_fkey(full_name, email:phone, country)")
        .eq("id", doctor_id)
        .single();

      // Delete doctor record (cascade will handle related records)
      const { error: delDoctorErr } = await serviceClient
        .from("doctors")
        .delete()
        .eq("id", doctor_id);

      if (delDoctorErr) throw delDoctorErr;

      // Delete user_roles for this profile
      const { error: delRolesErr } = await serviceClient
        .from("user_roles")
        .delete()
        .eq("user_id", profile_id);

      if (delRolesErr) console.error("Failed to delete roles:", delRolesErr);

      // Delete profile
      const { error: delProfileErr } = await serviceClient
        .from("profiles")
        .delete()
        .eq("id", profile_id);

      if (delProfileErr) console.error("Failed to delete profile:", delProfileErr);

      // Delete auth user
      const { error: delAuthErr } = await serviceClient.auth.admin.deleteUser(profile_id);
      if (delAuthErr) console.error("Failed to delete auth user:", delAuthErr);

      // Log to audit_logs using service client
      await serviceClient.from("audit_logs").insert({
        user_id: user.id,
        action: "reject_delete",
        table_name: "doctors",
        record_id: doctor_id,
        details: {
          reason: reason || "Doctor application rejected",
          doctor_name: doctorInfo?.profile?.full_name || "Unknown",
          doctor_country: doctorInfo?.profile?.country || null,
        },
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("admin-doctor-action error:", error);
    return new Response(
      JSON.stringify({ error: "An internal error occurred. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
