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
1. You must NEVER diagnose medical conditions, prescribe medications, interpret symptoms, or provide medical treatment advice. If a user asks a medical question or describes symptoms, clearly state: "I can help with booking and platform support, but I cannot diagnose symptoms or give treatment advice. Please book a consultation with a doctor for medical advice."
2. You must NEVER reveal admin data, internal notes, system configurations, or database details.
3. If a user mentions ANY emergency symptoms (chest pain, difficulty breathing, severe bleeding, loss of consciousness, suicide/self-harm, seizures, severe allergic reactions, stroke symptoms, overdose, or any life-threatening situation), IMMEDIATELY respond with: "⚠️ This may be a medical emergency. Please seek immediate emergency medical assistance or go to the nearest emergency facility now. Call your local emergency number (911/112/999) immediately. This assistant cannot provide emergency medical care." Do NOT continue the conversation about their symptoms after giving this instruction.
4. If you are unsure about something, say so honestly and offer to connect them with human support using the handoffToHuman tool.
5. Only answer using your FAQ knowledge base (via searchFaq tool) and approved tools. Do not make up information about the platform.
6. CRITICAL POLICY: An appointment is ONLY confirmed after payment_status = successful. Unpaid, pending, failed, cancelled, expired, or refunded payments must NOT be treated as confirmed bookings. Always emphasize this when relevant.

APPOINTMENT STATUS FLOW:
- pending_payment → awaiting payment
- confirmed → payment successful, ready for consultation
- completed → consultation finished
- cancelled → appointment cancelled
- no_show → patient did not attend

PAYMENT STATUS FLOW:
- pending → payment initiated but not completed
- successful → payment confirmed
- failed → payment attempt failed
- cancelled → payment was cancelled
- expired → payment link expired
- refunded → payment was refunded

PERSONALITY: Professional, empathetic, clear, and helpful. Use simple language. Be concise but thorough. Use emojis sparingly for warmth.

AUTHENTICATION AWARENESS:
- When userId is provided, the user is logged in — you can check their appointments, payments, and offer personalized help.
- When userId is null, the user is a visitor — answer general FAQs, show specialties, show public doctor info, guide booking flow, and allow support ticket creation. Do NOT attempt to look up personal data.

TOOL USAGE:
- Use searchFaq for any platform questions before answering from memory.
- Use getDoctorSpecialties and getDoctorsBySpecialty when users ask about available doctors.
- Use getDoctorAvailability when users ask about a specific doctor's schedule.
- Use getAppointmentStatus when authenticated users ask about a specific appointment.
- Use getPaymentStatus when authenticated users ask about payment for an appointment.
- Use getUserUpcomingAppointments when authenticated users ask about their upcoming appointments.
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
      name: "getDoctorAvailability",
      description: "Get the next available appointment slots for a specific doctor. Returns their weekly schedule.",
      parameters: {
        type: "object",
        properties: {
          doctorId: {
            type: "string",
            description: "The doctor's profile ID (UUID)",
          },
        },
        required: ["doctorId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getAppointmentStatus",
      description:
        "Check the status of a specific appointment. The user must be authenticated.",
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
        "Check the payment status for a specific appointment. The user must be authenticated.",
      parameters: {
        type: "object",
        properties: {
          appointmentId: {
            type: "string",
            description: "The appointment UUID to check payment for",
          },
        },
        required: ["appointmentId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getUserUpcomingAppointments",
      description: "Get the logged-in user's upcoming/active appointments. The user must be authenticated.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "createSupportTicket",
      description:
        "Create a support ticket for issues that need human attention. Collect user name, email, subject, and detailed message.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "User's full name" },
          email: { type: "string", description: "User's email address" },
          subject: { type: "string", description: "Subject of the support request" },
          message: { type: "string", description: "Detailed description of the issue" },
        },
        required: ["name", "email", "message"],
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
      // Search faq_articles by title, content, question, answer, and keywords
      const query = (args.query || "").toLowerCase();
      const { data } = await supabase
        .from("faq_articles")
        .select("title, content, category, question, answer, keywords")
        .eq("is_published", true)
        .order("sort_order");

      if (!data || data.length === 0) return { results: [], message: "No FAQ articles found." };

      // Simple relevance scoring
      const scored = data.map((article: any) => {
        let score = 0;
        const fields = [
          article.title, article.content, article.question, article.answer
        ].filter(Boolean).map((f: string) => f.toLowerCase());

        for (const field of fields) {
          if (field.includes(query)) score += 3;
          for (const word of query.split(/\s+/)) {
            if (word.length > 2 && field.includes(word)) score += 1;
          }
        }

        // Check keywords array
        if (article.keywords && Array.isArray(article.keywords)) {
          for (const kw of article.keywords) {
            if (query.includes(kw.toLowerCase())) score += 2;
          }
        }

        return { ...article, score };
      });

      const results = scored
        .filter((a: any) => a.score > 0)
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, 5)
        .map(({ score, ...rest }: any) => rest);

      return results.length > 0
        ? { results }
        : { results: data.slice(0, 3), message: "No exact match found, showing general articles." };
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
          "id, title, bio, rating, total_reviews, is_available, consultation_fee, experience_years, languages, profile_id, profiles!inner(full_name, avatar_url)"
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
          languages: d.languages,
          profileId: d.profile_id,
        })),
      };
    }

    case "getDoctorAvailability": {
      const doctorId = args.doctorId;
      if (!doctorId) return { error: "Doctor ID is required." };

      // Get doctor info
      const { data: doctor } = await supabase
        .from("doctors")
        .select("title, is_available, profiles!inner(full_name)")
        .eq("profile_id", doctorId)
        .single();

      if (!doctor) return { error: "Doctor not found." };

      // Get availability slots
      const { data: slots } = await supabase
        .from("doctor_availability")
        .select("day_of_week, start_time, end_time, is_available, slot_duration_minutes")
        .eq("doctor_id", doctorId)
        .eq("is_available", true)
        .order("day_of_week");

      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

      return {
        doctor: `${doctor.title || ""} ${(doctor as any).profiles?.full_name || "Doctor"}`.trim(),
        isCurrentlyAvailable: doctor.is_available,
        weeklySchedule: (slots || []).map((s: any) => ({
          day: dayNames[s.day_of_week],
          startTime: s.start_time,
          endTime: s.end_time,
          slotDuration: s.slot_duration_minutes,
        })),
      };
    }

    case "getAppointmentStatus": {
      if (!userId)
        return { error: "You need to be logged in to check appointment status. Please log in first." };

      const { data } = await supabase
        .from("appointments")
        .select("id, status, scheduled_at, duration_minutes, reason, doctor_id, profiles!appointments_doctor_id_fkey(full_name)")
        .eq("id", args.appointmentId)
        .or(`patient_id.eq.${userId},doctor_id.eq.${userId}`)
        .single();

      if (!data)
        return { error: "Appointment not found or you don't have access to view it." };

      return {
        id: data.id,
        status: data.status,
        scheduledAt: data.scheduled_at,
        durationMinutes: data.duration_minutes,
        reason: data.reason,
        doctor: (data as any).profiles?.full_name || "Doctor",
      };
    }

    case "getPaymentStatus": {
      if (!userId)
        return { error: "You need to be logged in to check payment status. Please log in first." };

      const { data } = await supabase
        .from("payments")
        .select("id, status, amount, currency, payment_method, paid_at, created_at")
        .eq("appointment_id", args.appointmentId)
        .or(`patient_id.eq.${userId},doctor_id.eq.${userId}`)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!data)
        return { error: "No payment found for this appointment, or you don't have access to view it." };

      return {
        paymentId: data.id,
        status: data.status,
        amount: data.amount,
        currency: data.currency,
        method: data.payment_method,
        paidAt: data.paid_at,
        isConfirmed: data.status === "successful",
      };
    }

    case "getUserUpcomingAppointments": {
      if (!userId)
        return { error: "You need to be logged in to view your appointments. Please log in first." };

      const { data } = await supabase
        .from("appointments")
        .select("id, status, scheduled_at, duration_minutes, reason, doctor_id, profiles!appointments_doctor_id_fkey(full_name)")
        .eq("patient_id", userId)
        .in("status", ["confirmed", "awaiting_payment", "pending"])
        .gte("scheduled_at", new Date().toISOString())
        .order("scheduled_at")
        .limit(5);

      if (!data || data.length === 0)
        return { message: "You have no upcoming appointments." };

      return {
        appointments: data.map((a: any) => ({
          id: a.id,
          status: a.status,
          scheduledAt: a.scheduled_at,
          durationMinutes: a.duration_minutes,
          reason: a.reason,
          doctor: a.profiles?.full_name || "Doctor",
        })),
      };
    }

    case "createSupportTicket": {
      const { error } = await supabase.from("support_tickets").insert({
        user_id: userId || null,
        name: args.name,
        email: args.email,
        subject: args.subject || "AI Assistant Support Request",
        message: args.message,
        source: "ai_agent",
      });

      if (error) {
        console.error("Support ticket error:", error);
        return { error: "Failed to create support ticket. Please try again." };
      }

      // Also notify admins
      const { data: admins } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (admins) {
        for (const admin of admins) {
          await supabase.from("notifications").insert({
            user_id: admin.user_id,
            title: "New Support Ticket (AI)",
            message: `Support ticket from ${args.name}: ${args.subject || args.message.slice(0, 80)}`,
            type: "support",
            link: "/admin",
          });
        }
      }

      return {
        success: true,
        message: "Support ticket created successfully. Our team will respond to your email shortly.",
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

      // Update conversation status
      await supabase
        .from("ai_conversations")
        .update({ status: "escalated" })
        .eq("id", conversationId);

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
        message: "Your conversation has been escalated to our human support team. They will review it and get back to you shortly.",
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
    const { messages, conversationId, sessionId, channel } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY)
      throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // SECURITY: Derive userId from the JWT — never trust a client-supplied
    // userId (which would let any unauthenticated caller impersonate any user
    // and read their appointments / payments via the service-role client).
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization") || "";
    if (authHeader.toLowerCase().startsWith("bearer ")) {
      const jwt = authHeader.slice(7).trim();
      try {
        const anonClient = createClient(
          supabaseUrl,
          Deno.env.get("SUPABASE_ANON_KEY")!,
          { global: { headers: { Authorization: `Bearer ${jwt}` } } }
        );
        const { data, error } = await anonClient.auth.getUser();
        if (!error && data?.user?.id) {
          userId = data.user.id;
        }
      } catch (_) {
        userId = null;
      }
    }

    // Create or reuse conversation
    let convId = conversationId;
    if (!convId) {
      const { data: conv } = await supabase
        .from("ai_conversations")
        .insert({
          session_id: sessionId || crypto.randomUUID(),
          user_id: userId || null,
          status: "active",
          channel: channel || (userId ? "patient_dashboard" : "visitor"),
        })
        .select("id")
        .single();
      convId = conv?.id;
    } else {
      // SECURITY: Verify the caller owns this conversation before writing to it.
      // Without this check, any caller could inject messages into any conversation
      // because we use the service-role client (which bypasses RLS) below.
      const { data: convRow, error: convErr } = await supabase
        .from("ai_conversations")
        .select("id, user_id")
        .eq("id", convId)
        .maybeSingle();

      if (convErr || !convRow) {
        return new Response(
          JSON.stringify({ error: "Conversation not found." }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const ownerId = (convRow as { user_id: string | null }).user_id;
      // Authenticated callers must own the conversation. Anonymous callers may
      // only continue conversations that have no owner (visitor sessions).
      const isOwner = userId ? ownerId === userId : ownerId === null;
      if (!isOwner) {
        return new Response(
          JSON.stringify({ error: "Forbidden" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update last activity
      await supabase
        .from("ai_conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", convId);
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

    // Add auth context to system prompt
    const authContext = userId
      ? `\n\nCURRENT USER: The user is logged in (userId: ${userId}). You can access their personal appointment and payment data using the appropriate tools.`
      : `\n\nCURRENT USER: The user is NOT logged in. Do not attempt to look up personal data. Guide them to log in if they need account-specific information.`;

    // SECURITY: Sanitize client-supplied message history to prevent prompt
    // injection. Only allow `user` / `assistant` roles, coerce content to a
    // string, and cap per-message length. This blocks attempts to inject
    // fake `system` or `tool` messages that could override the system prompt.
    const recentMessages = (Array.isArray(messages) ? messages : [])
      .slice(-20)
      .filter((m: any) => m && (m.role === "user" || m.role === "assistant"))
      .map((m: any) => ({
        role: m.role as "user" | "assistant",
        content: String(m.content ?? "").slice(0, 4000),
      }));

    // Build messages for AI
    const aiMessages: any[] = [
      { role: "system", content: SYSTEM_PROMPT + authContext },
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
            JSON.stringify({ error: "The assistant is currently busy. Please try again in a moment." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (status === 402) {
          return new Response(
            JSON.stringify({ error: "AI service temporarily unavailable. Please try again later." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
            user_id: userId || null,
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
        error: e instanceof Error ? e.message : "An error occurred. Please try again.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
