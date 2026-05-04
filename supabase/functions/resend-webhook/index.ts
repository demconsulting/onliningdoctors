import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { timingSafeEqual } from "https://deno.land/std@0.168.0/crypto/timing_safe_equal.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature",
};

const VALID_EVENTS = [
  "email.sent",
  "email.delivered",
  "email.opened",
  "email.bounced",
  "email.complained",
];

async function verifyWebhookSignature(
  payload: string,
  svixId: string | null,
  svixTimestamp: string | null,
  svixSignature: string | null,
  secret: string
): Promise<boolean> {
  if (!svixId || !svixTimestamp || !svixSignature) return false;

  // Reject stale/replayed webhooks: require timestamp within ±5 minutes
  const FIVE_MIN_MS = 5 * 60 * 1000;
  const tsSeconds = parseInt(svixTimestamp, 10);
  if (!Number.isFinite(tsSeconds)) return false;
  if (Math.abs(Date.now() - tsSeconds * 1000) > FIVE_MIN_MS) {
    console.error("Webhook timestamp outside freshness window");
    return false;
  }

  // Resend uses Svix for webhooks
  // Secret comes as "whsec_<base64>" — strip prefix
  const secretBytes = Uint8Array.from(
    atob(secret.startsWith("whsec_") ? secret.slice(6) : secret),
    (c) => c.charCodeAt(0)
  );

  const toSign = `${svixId}.${svixTimestamp}.${payload}`;
  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(toSign));
  const expectedSig = btoa(String.fromCharCode(...new Uint8Array(signature)));

  // svix-signature can contain multiple sigs separated by space: "v1,<sig1> v1,<sig2>"
  const signatures = svixSignature.split(" ");
  for (const sig of signatures) {
    const [, sigValue] = sig.split(",");
    if (!sigValue) continue;
    const a = new TextEncoder().encode(expectedSig);
    const b = new TextEncoder().encode(sigValue);
    if (a.length === b.length && timingSafeEqual(a, b)) {
      return true;
    }
  }
  return false;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const WEBHOOK_SECRET = Deno.env.get("RESEND_WEBHOOK_SECRET");
    if (!WEBHOOK_SECRET) {
      throw new Error("RESEND_WEBHOOK_SECRET is not configured");
    }

    const rawBody = await req.text();

    // Verify signature
    const svixId = req.headers.get("svix-id");
    const svixTimestamp = req.headers.get("svix-timestamp");
    const svixSignature = req.headers.get("svix-signature");

    const isValid = await verifyWebhookSignature(
      rawBody,
      svixId,
      svixTimestamp,
      svixSignature,
      WEBHOOK_SECRET
    );

    if (!isValid) {
      console.error("Webhook signature verification failed");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const event = JSON.parse(rawBody);
    const eventType = event.type;

    if (!VALID_EVENTS.includes(eventType)) {
      console.log(`Ignoring unhandled event type: ${eventType}`);
      return new Response(JSON.stringify({ status: "ignored" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = event.data || {};
    const emailAddresses: string[] = data.to || [];
    const email = emailAddresses[0] || data.email || "";
    const messageId = data.email_id || "";

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Insert event record
    const { error: insertError } = await serviceClient
      .from("email_events")
      .insert({
        email,
        event_type: eventType,
        message_id: messageId,
        metadata: data,
      });

    if (insertError) {
      console.error("Failed to insert email event:", insertError);
      throw insertError;
    }

    // Business logic based on event type
    if (eventType === "email.bounced" && email) {
      // Flag bounced emails — update profile if user exists
      const { data: profiles } = await serviceClient
        .from("profiles")
        .select("id")
        .limit(1);

      // Look up user by email via auth admin
      const { data: usersData } = await serviceClient.auth.admin.listUsers({
        perPage: 1,
        page: 1,
      });

      // Find user with matching email
      const bouncedUser = usersData?.users?.find(
        (u) => u.email?.toLowerCase() === email.toLowerCase()
      );

      if (bouncedUser) {
        // Create a notification for admins about the bounced email
        const { data: adminRoles } = await serviceClient
          .from("user_roles")
          .select("user_id")
          .eq("role", "admin");

        if (adminRoles) {
          for (const admin of adminRoles) {
            await serviceClient.from("notifications").insert({
              user_id: admin.user_id,
              title: "Email Bounced",
              message: `Email to ${email} bounced. The address may be invalid.`,
              type: "moderation",
              link: "/admin",
            });
          }
        }
      }
    }

    console.log(`Processed event: ${eventType} for ${email}`);

    return new Response(JSON.stringify({ status: "success" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Webhook processing error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
