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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Not authenticated");

    const { appointment_id } = await req.json();
    if (!appointment_id) throw new Error("appointment_id is required");

    // Fetch the consultation notes — RLS ensures only doctor/patient can access
    const { data: notes, error: notesError } = await supabase
      .from("consultation_notes")
      .select("content, appointment_id, doctor_id")
      .eq("appointment_id", appointment_id)
      .single();

    if (notesError || !notes) throw new Error("Consultation notes not found");
    if (!notes.content || notes.content.trim().length < 10) {
      throw new Error("Notes are too short to summarize");
    }

    // Only the doctor who wrote the notes can generate a summary
    if (notes.doctor_id !== user.id) {
      throw new Error("Only the consulting doctor can generate a summary");
    }

    // Call Lovable AI for structured summary
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a medical consultation summarizer. Given a doctor's consultation notes, produce a clear, structured summary with these sections:

**Chief Complaint:** (reason for visit)
**Key Findings:** (symptoms, observations)
**Assessment:** (diagnosis or differential)
**Plan:** (treatment, prescriptions, follow-up)
**Important Notes:** (allergies, warnings, anything critical)

Be concise but thorough. Use medical terminology where appropriate. If a section has no relevant info, write "Not documented." Do NOT fabricate information not present in the notes.`,
          },
          {
            role: "user",
            content: `Please summarize these consultation notes:\n\n${notes.content}`,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "AI rate limit exceeded, please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please top up in Lovable settings." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      throw new Error("Failed to generate summary");
    }

    const aiData = await aiResponse.json();
    const summary = aiData.choices?.[0]?.message?.content;

    if (!summary) throw new Error("AI returned empty summary");

    // Save summary to consultation_notes
    const { error: updateError } = await supabase
      .from("consultation_notes")
      .update({ summary })
      .eq("appointment_id", appointment_id);

    if (updateError) throw new Error(`Failed to save summary: ${updateError.message}`);

    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("summarize-consultation error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
