import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are the AI Support Assistant for "Doctor Onlining", an online medical consultation platform.

ROLE: You help visitors and patients with platform questions, booking guidance, payment help, technical support, and general inquiries.

STRICT RULES:
1. You must NEVER diagnose medical conditions, prescribe medications, interpret symptoms, or provide medical treatment advice.
2. You must NEVER reveal admin data, internal notes, system configurations, or database details.
3. If a user mentions ANY emergency symptoms (chest pain, difficulty breathing, severe bleeding, loss of consciousness, suicide/self-harm, seizures, severe allergic reactions, or any life-threatening situation), IMMEDIATELY instruct them to call emergency services (911/112/999) and go to the nearest emergency room. Do NOT continue the conversation about their symptoms after giving this instruction.
4. If you are unsure about something, say so honestly and offer to connect them with human support using the handoffToHuman tool.
5. Only answer using your FAQ knowledge base (via searchFaq tool) and approved tools. Do not make up information about the platform.
6. CRITICAL POLICY: An appointment is ONLY confirmed after payment_status = successful. Unpaid, pending, failed, or cancelled payments must NOT be treated as confirmed bookings. Always emphasize this.

PERSONALITY: Professional, empathetic, clear, and helpful. Use simple language. Be concise but thorough. Use emojis sparingly for warmth.

TOOL USAGE:
- Use searchFaq for any platform questions before answering from memory.
- Use getDoctorSpecialties and getDoctorsBySpecialty when users ask about available doctors.
- Use getAppointmentStatus and getPaymentStatus only when users provide specific IDs and are authenticated.
- Use createSupportTicket when users want to submit a formal support request.
- Use handoffToHuman when you cannot help or the user explicitly asks for human support.`;

const tools = [
  {
    type: "function",
    function: {
      name: "searchFaq",
      description:
        "Search the FAQ knowledge base for answers to user questions about the platform, booking, payments, consultations, privacy, technical issues, etc. Always use this first before answering platform questions.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query to find relevant FAQ articles",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getDoctorSpecialties",
      description:
        "Get the list of all medical specialties available on the platform",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "getDoctorsBySpecialty",
      description: "Get a list of verified doctors filtered by a specific medical specialty",
      parameters: {
        type: "object",
        properties: {
          specialty: {
            type: "string",
            description: "The specialty name to filter doctors by",
          },
        },
        required: ["specialty"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getAppointmentStatus",
      description:
        "Check the status of a specific appointment. The user must be authenticated and provide their appointment ID.",
      parameters: {
        type: "object",
        properties: {
          appointmentId: {
            type: "string",
            description: "The appointment UUID to check",
          },
        },
        required: ["appointmentId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getPaymentStatus",
      description:
        "Check the status of a specific payment. The user must be authenticated and provide their payment ID.",
      parameters: {
        type: "object",
        properties: {
          paymentId: {
            type: "string",
            description: "The payment UUID to check",
          },
        },
        required: ["paymentId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "createSupportTicket",
      description:
        "Create a support ticket/contact submission for issues that need human attention. Collect user name, email, and issue description.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "User's full name" },
          email: { type: "string", description: "User's email address" },
          issue: {
            type: "string",
            description: "Detailed description of the issue",
          },
        },
        required: ["name", "email", "issue"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "handoffToHuman",
      description:
        "Escalate the conversation to human support when the AI cannot adequately help or the user explicitly requests human assistance.",
      parameters: {
        type: "object",
        properties: {
          reason: {
            type: "string",
            description: "Reason for escalating to human support",
          },
        },
        required: ["reason"],
      },
    },
  },
];

async function executeTool(
  supabase: ReturnType<typeof createClient>,
  toolName: string,
  args: Record<string, string>,
  userId: string | null,
  conversationId: string
) {
  switch (toolName) {
    case "searchFaq": {
      const { data } = await supabase
        .from("faq_articles")
        .select("title, content, category")
        .eq("is_published", true)
        .order("sort_order");
      return data || [];
    }

    case "getDoctorSpecialties": {
      const { data } = await supabase
        .from("specialties")
        .select("name, description, icon");
      return data || [];
    }

    case "getDoctorsBySpecialty": {
      const { data: specialties } = await supabase
        .from("specialties")
        .select("id, name")
        .ilike("name", `%${args.specialty}%`)
        .limit(1);

      if (!specialties || specialties.length === 0)
        return { message: "No specialty found matching that name. Try getDoctorSpecialties to see available specialties." };

      const { data: doctors } = await supabase
        .from("doctors")
        .select(
          "id, title, bio, rating, total_reviews, is_available, consultation_fee, experience_years, profile_id, profiles!inner(full_name)"
        )
        .eq("specialty_id", specialties[0].id)
        .eq("is_verified", true)
        .limit(10);

      return {
        specialty: specialties[0].name,
        doctors: (doctors || []).map((d: any) => ({
          name: `${d.title || ""} ${d.profiles?.full_name || "Doctor"}`.trim(),
          rating: d.rating,
          reviews: d.total_reviews,
          available: d.is_available,
          fee: d.consultation_fee,
          experience_years: d.experience_years,
          profileId: d.profile_id,
        })),
      };
    }

    case "getAppointmentStatus": {
      if (!userId)
        return {
          error:
            "You need to be logged in to check appointment status. Please log in first.",
        };

      const { data } = await supabase
        .from("appointments")
        .select("id, status, scheduled_at, duration_minutes, reason")
        .eq("id", args.appointmentId)
        .or(`patient_id.eq.${userId},doctor_id.eq.${userId}`)
        .single();

      if (!data)
        return {
          error: "Appointment not found or you don't have access to view it.",
        };
      return data;
    }

    case "getPaymentStatus": {
      if (!userId)
        return {
          error:
            "You need to be logged in to check payment status. Please log in first.",
        };

      const { data } = await supabase
        .from("payments")
        .select(
          "id, status, amount, currency, payment_method, paid_at, created_at"
        )
        .eq("id", args.paymentId)
        .or(`patient_id.eq.${userId},doctor_id.eq.${userId}`)
        .single();

      if (!data)
        return {
          error: "Payment not found or you don't have access to view it.",
        };
      return data;
    }

    case "createSupportTicket": {
      const { error } = await supabase.from("contact_submissions").insert({
        name: args.name,
        email: args.email,
        message: args.issue,
        subject: "AI Assistant Support Ticket",
      });

      if (error)
        return {
          error: "Failed to create support ticket. Please try again.",
        };
      return {
        success: true,
        message:
          "Support ticket created successfully. Our team will respond to your email shortly.",
      };
    }

    case "handoffToHuman": {
      const { error } = await supabase.from("ai_handoffs").insert({
        conversation_id: conversationId,
        reason: args.reason,
      });

      if (error) {
        console.error("Handoff insert error:", error);
      }

      // Notify admins
      const { data: admins } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (admins) {
        for (const admin of admins) {
          await supabase.from("notifications").insert({
            user_id: admin.user_id,
            title: "AI Chat Escalation",
            message: `A conversation has been escalated to human support. Reason: ${args.reason}`,
            type: "support",
            link: "/admin",
          });
        }
      }

      return {
        success: true,
        message:
          "Your conversation has been escalated to our human support team. They will review it and get back to you shortly.",
      };
    }

    default:
      return { error: "Unknown tool" };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { messages, conversationId, sessionId, userId } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY)
      throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create or reuse conversation
    let convId = conversationId;
    if (!convId) {
      const { data: conv } = await supabase
        .from("ai_conversations")
        .insert({
          session_id: sessionId || crypto.randomUUID(),
          user_id: userId || null,
          status: "active",
        })
        .select("id")
        .single();
      convId = conv?.id;
    }

    // Save user message
    const lastUserMsg = messages[messages.length - 1];
    if (lastUserMsg?.role === "user") {
      await supabase.from("ai_messages").insert({
        conversation_id: convId,
        role: "user",
        content: lastUserMsg.content,
      });
    }

    // Limit history to last 20 messages
    const recentMessages = messages.slice(-20);

    // Build messages for AI
    const aiMessages: any[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...recentMessages,
    ];

    // Tool calling loop (max 5 iterations)
    let finalContent = "";
    for (let i = 0; i < 5; i++) {
      const response = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: aiMessages,
            tools,
            stream: false,
          }),
        }
      );

      if (!response.ok) {
        const status = response.status;
        const text = await response.text();
        if (status === 429) {
          return new Response(
            JSON.stringify({
              error:
                "The assistant is currently busy. Please try again in a moment.",
            }),
            {
              status: 429,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        if (status === 402) {
          return new Response(
            JSON.stringify({
              error:
                "AI service temporarily unavailable. Please try again later.",
            }),
            {
              status: 402,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        console.error("AI gateway error:", status, text);
        throw new Error(`AI gateway error: ${status}`);
      }

      const data = await response.json();
      const choice = data.choices?.[0];
      const message = choice?.message;
      if (!message) throw new Error("No response from AI");

      // If there are tool calls, execute them
      if (message.tool_calls && message.tool_calls.length > 0) {
        aiMessages.push(message);

        for (const toolCall of message.tool_calls) {
          let args: Record<string, string> = {};
          try {
            args = JSON.parse(toolCall.function.arguments);
          } catch {
            args = {};
          }

          const result = await executeTool(
            supabase,
            toolCall.function.name,
            args,
            userId,
            convId
          );

          // Log tool usage
          await supabase.from("ai_audit_logs").insert({
            conversation_id: convId,
            action: `tool_call:${toolCall.function.name}`,
            details: { args, result },
          });

          aiMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(result),
          });
        }
        continue;
      }

      // No tool calls — final response
      finalContent = message.content || "";
      break;
    }

    // Save assistant message
    await supabase.from("ai_messages").insert({
      conversation_id: convId,
      role: "assistant",
      content: finalContent,
    });

    return new Response(
      JSON.stringify({ content: finalContent, conversationId: convId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("chat-assistant error:", e);
    return new Response(
      JSON.stringify({
        error:
          e instanceof Error
            ? e.message
            : "An error occurred. Please try again.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
