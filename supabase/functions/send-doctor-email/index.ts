import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    // Verify caller is admin
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

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    // Check admin role
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin");

    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { doctorProfileId, verified } = await req.json();

    if (!doctorProfileId || typeof verified !== "boolean") {
      return new Response(JSON.stringify({ error: "Missing doctorProfileId or verified" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get doctor's email from auth via service role
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: userData, error: userError } = await serviceClient.auth.admin.getUserById(doctorProfileId);
    if (userError || !userData?.user?.email) {
      throw new Error("Could not find doctor email");
    }

    const { data: profile } = await serviceClient
      .from("profiles")
      .select("full_name")
      .eq("id", doctorProfileId)
      .single();

    const doctorName = profile?.full_name || "Doctor";
    const doctorEmail = userData.user.email;

    const subject = verified
      ? "Your Account Has Been Verified ✅"
      : "Account Verification Update";

    const htmlBody = verified
      ? `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #16a34a;">Congratulations, ${doctorName}!</h2>
          <p>Your doctor account has been <strong>verified</strong> by our admin team. You are now visible to patients and can start accepting appointments.</p>
          <p>Log in to your dashboard to set up your availability and pricing.</p>
          <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">— The Medical Team</p>
        </div>`
      : `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #dc2626;">Verification Update</h2>
          <p>Dear ${doctorName},</p>
          <p>Your doctor account verification has been <strong>revoked</strong>. Your profile is no longer visible to patients.</p>
          <p>If you believe this is an error, please contact our support team.</p>
          <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">— The Medical Team</p>
        </div>`;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "onboarding@resend.dev",
        to: [doctorEmail],
        subject,
        html: htmlBody,
      }),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      throw new Error(`Resend API error [${resendRes.status}]: ${JSON.stringify(resendData)}`);
    }

    return new Response(JSON.stringify({ success: true, id: resendData.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error sending doctor email:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
