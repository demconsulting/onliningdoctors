import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Loader2, Bot, User, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const VISITOR_QUICK_ACTIONS = [
  { label: "📅 Book Appointment", message: "How do I book an appointment?" },
  { label: "💳 Payment Help", message: "I need help with a payment issue" },
  { label: "🩺 Doctor Specialties", message: "What doctor specialties are available?" },
  { label: "👨‍⚕️ Available Doctors", message: "Show me available doctors" },
  { label: "📹 Join Consultation", message: "How do I join my online consultation?" },
  { label: "📄 Upload Documents", message: "How do I upload medical documents?" },
  { label: "🔄 Reschedule or Cancel", message: "How do I reschedule or cancel an appointment?" },
  { label: "🔧 Technical Support", message: "I'm having technical issues" },
  { label: "👤 Speak to Support", message: "I'd like to speak to a human support agent" },
];

const PATIENT_QUICK_ACTIONS = [
  { label: "📋 My Appointments", message: "Show my upcoming appointments" },
  { label: "💳 My Payment Status", message: "Check my payment status" },
  { label: "📅 Book Appointment", message: "How do I book an appointment?" },
  { label: "📹 Join Consultation", message: "How do I join my consultation?" },
  { label: "📄 Upload Documents", message: "How do I upload medical documents?" },
  { label: "🩺 Doctor Specialties", message: "What doctor specialties are available?" },
  { label: "🔄 Reschedule or Cancel", message: "How do I reschedule or cancel?" },
  { label: "🔧 Technical Support", message: "I'm having technical issues" },
  { label: "👤 Speak to Support", message: "I'd like to speak to a human support agent" },
];

const DEFAULT_WELCOME =
  "👋 Hello! I'm the Doctor Onlining assistant. I can help with bookings, payments, doctor specialties, appointment status, and technical support.\n\nHow can I assist you today?";

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [welcomeMessage, setWelcomeMessage] = useState(DEFAULT_WELCOME);
  const [isEnabled, setIsEnabled] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load settings & auth
  useEffect(() => {
    const loadSettings = async () => {
      const { data } = await supabase
        .from("site_content")
        .select("value")
        .eq("key", "ai_assistant_settings")
        .single();
      if (data?.value) {
        const val = data.value as any;
        if (val.welcome_message) setWelcomeMessage(val.welcome_message);
        if (typeof val.enabled === "boolean") setIsEnabled(val.enabled);
      }
    };
    loadSettings();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id || null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Set welcome message when settings load
  useEffect(() => {
    setMessages([{ role: "assistant", content: welcomeMessage }]);
  }, [welcomeMessage]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  const quickActions = userId ? PATIENT_QUICK_ACTIONS : VISITOR_QUICK_ACTIONS;

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;
    const userMsg: Message = { role: "user", content: content.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const apiMessages = newMessages
        .filter((m) => !(m.role === "assistant" && m.content === welcomeMessage))
        .slice(-20)
        .map((m) => ({ role: m.role, content: m.content }));

      // Use the user's access token when logged in so the edge function can
      // derive userId from the verified JWT (never trust client-supplied id).
      const { data: { session } } = await supabase.auth.getSession();
      const bearer = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-assistant`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${bearer}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            messages: apiMessages,
            conversationId,
            sessionId,
            channel: userId ? "patient_dashboard" : "visitor",
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Failed to get response");
      }

      const data = await response.json();
      setConversationId(data.conversationId);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.content },
      ]);
    } catch (error: any) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I'm sorry, I'm having trouble connecting right now. Please try again in a moment, or contact our support team directly.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  if (!isEnabled) return null;

  const renderMessageContent = (content: string) => {
    // Simple markdown-like rendering for bold, links, and lists
    const lines = content.split("\n");
    return lines.map((line, i) => {
      // Bold
      let processed = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      // Links
      processed = processed.replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer" class="underline text-primary">$1</a>'
      );
      // Bullet points
      if (processed.startsWith("- ") || processed.startsWith("• ")) {
        return (
          <div key={i} className="flex gap-1.5 ml-1">
            <span className="text-primary mt-0.5">•</span>
            <span dangerouslySetInnerHTML={{ __html: processed.slice(2) }} />
          </div>
        );
      }
      if (processed.match(/^\d+\.\s/)) {
        return (
          <div key={i} className="ml-1">
            <span dangerouslySetInnerHTML={{ __html: processed }} />
          </div>
        );
      }
      if (line.trim() === "") return <br key={i} />;
      return <p key={i} dangerouslySetInnerHTML={{ __html: processed }} />;
    });
  };

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <Button
              onClick={() => setIsOpen(true)}
              size="icon"
              className="h-14 w-14 rounded-full shadow-lg shadow-primary/25"
            >
              <MessageCircle className="h-6 w-6" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-0 right-0 sm:bottom-6 sm:right-6 z-50 w-full sm:w-[400px] h-[100dvh] sm:h-auto sm:max-h-[620px] flex flex-col sm:rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="bg-primary px-4 py-3 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-primary-foreground font-display">
                    Support Assistant
                  </p>
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                    <p className="text-[10px] text-primary-foreground/70">
                      Online • {userId ? "Logged in" : "Visitor mode"}
                    </p>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0"
            >
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                      <Bot className="h-3 w-3 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted text-foreground rounded-bl-md"
                    }`}
                  >
                    <div className="space-y-1">{renderMessageContent(msg.content)}</div>
                  </div>
                  {msg.role === "user" && (
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                      <User className="h-3 w-3 text-primary" />
                    </div>
                  )}
                </div>
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <div className="flex gap-2 justify-start">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="h-3 w-3 text-primary" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}

              {/* Quick actions — shown only with welcome message */}
              {messages.length === 1 && !isLoading && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {quickActions.map((action, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(action.message)}
                      className="text-xs px-3 py-1.5 rounded-full border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Input */}
            <form
              onSubmit={handleSubmit}
              className="border-t border-border p-3 flex gap-2 flex-shrink-0"
            >
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your question..."
                disabled={isLoading}
                className="flex-1 text-sm"
              />
              <Button
                type="submit"
                size="icon"
                disabled={isLoading || !input.trim()}
                className="h-10 w-10 rounded-full flex-shrink-0"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>

            {/* Disclaimer */}
            <div className="px-3 pb-2 flex-shrink-0">
              <p className="text-[9px] text-muted-foreground text-center flex items-center justify-center gap-1">
                <AlertTriangle className="h-2.5 w-2.5" />
                Support information only. Not medical advice. For emergencies, call your local emergency number.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatWidget;
