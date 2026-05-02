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

    // Verify caller is admin
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

    // Support action from query param or body
    const url = new URL(req.url);
    let action = url.searchParams.get("action");
    let bodyData: any = null;

    if (req.method === "POST" || req.method === "PUT" || req.method === "PATCH") {
      try {
        bodyData = await req.json();
        if (bodyData?.action) action = bodyData.action;
      } catch { /* no body */ }
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Action: send password reset email
    if (action === "reset-password") {
      const email = bodyData?.email;
      if (!email) {
        return new Response(JSON.stringify({ error: "Email required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // SECURITY: Use a hardcoded, application-owned redirect URL to prevent
      // open-redirect attacks via a tampered Origin header.
      const ALLOWED_REDIRECT_ORIGINS = new Set<string>([
        "https://doctorsonlining.com",
        "https://onliningdoctors.lovable.app",
      ]);
      const requestOrigin = req.headers.get("origin") || "";
      const safeOrigin = ALLOWED_REDIRECT_ORIGINS.has(requestOrigin)
        ? requestOrigin
        : "https://doctorsonlining.com";

      const { error: resetError } = await serviceClient.auth.resetPasswordForEmail(email, {
        redirectTo: `${safeOrigin}/reset-password`,
      });

      if (resetError) throw resetError;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Default: list all users with emails
    const { data: { users }, error: listError } = await serviceClient.auth.admin.listUsers({
      perPage: 1000,
    });

    if (listError) throw listError;

    const emailMap = (users || []).map((u) => ({
      id: u.id,
      email: u.email,
    }));

    return new Response(JSON.stringify({ users: emailMap }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("admin-users error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
