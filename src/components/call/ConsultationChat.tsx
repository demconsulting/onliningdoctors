/**
 * ConsultationChat — real-time text chat inside a live consultation.
 *
 * Uses Supabase Realtime on the new `consultation_messages` table. Both the
 * doctor and the patient can see and send messages; sanitisation strips HTML,
 * empty messages are rejected, and length is capped.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, MessageSquare, X } from "lucide-react";
import type { ConsultationRole } from "@/services/webrtc/types";

const MAX_LEN = 1000;

interface ChatMessage {
  id: string;
  appointment_id: string;
  sender_id: string;
  sender_role: string;
  message: string;
  created_at: string;
  read_at: string | null;
}

const sanitize = (raw: string) =>
  raw.replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, MAX_LEN);

const formatTime = (iso: string) => {
  try { return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
  catch { return ""; }
};

interface ConsultationChatProps {
  appointmentId: string;
  localUserId: string;
  localRole: ConsultationRole;
  remoteName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUnreadChange?: (count: number) => void;
}

const ConsultationChat = ({
  appointmentId, localUserId, localRole, remoteName, open, onOpenChange, onUnreadChange,
}: ConsultationChatProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("consultation_messages")
        .select("*")
        .eq("appointment_id", appointmentId)
        .order("created_at", { ascending: true })
        .limit(500);
      if (!cancelled && Array.isArray(data)) setMessages(data as ChatMessage[]);
    })();
    return () => { cancelled = true; };
  }, [appointmentId]);

  // Realtime subscription for INSERTs on this appointment
  useEffect(() => {
    const channel = supabase
      .channel(`consultation-chat-${appointmentId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "consultation_messages",
          filter: `appointment_id=eq.${appointmentId}`,
        },
        (payload) => {
          const row = payload.new as ChatMessage;
          setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [appointmentId]);

  // Auto-scroll + unread accounting
  useEffect(() => {
    if (open) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
      setUnread(0);
    } else {
      const last = messages[messages.length - 1];
      if (last && last.sender_id !== localUserId) setUnread((u) => u + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  useEffect(() => {
    if (open) setUnread(0);
  }, [open]);

  useEffect(() => { onUnreadChange?.(unread); }, [unread, onUnreadChange]);

  const send = useCallback(async () => {
    const clean = sanitize(draft);
    if (!clean) return;
    setSending(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("consultation_messages").insert({
      appointment_id: appointmentId,
      sender_id: localUserId,
      sender_role: localRole,
      message: clean,
    });
    setSending(false);
    if (!error) setDraft("");
  }, [appointmentId, localUserId, localRole, draft]);

  const grouped = useMemo(() => messages, [messages]);

  if (!open) return null;

  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-card">
      <header className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <MessageSquare className="h-4 w-4" aria-hidden="true" />
          Chat with {remoteName || "participant"}
        </div>
        <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} aria-label="Close chat">
          <X className="h-4 w-4" />
        </Button>
      </header>

      <ScrollArea className="flex-1">
        <div ref={scrollRef} className="flex flex-col gap-2 px-3 py-3">
          {grouped.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">
              Messages sent here are visible to the doctor, patient, and authorised admins only.
            </p>
          ) : (
            grouped.map((m) => {
              const own = m.sender_id === localUserId;
              return (
                <div key={m.id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                      own ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.message}</p>
                    <p className={`mt-1 text-[10px] ${own ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      {m.sender_role === "doctor" ? "Doctor" : "Patient"} · {formatTime(m.created_at)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      <form
        className="flex items-center gap-2 border-t border-border px-3 py-2"
        onSubmit={(e) => { e.preventDefault(); void send(); }}
      >
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, MAX_LEN))}
          placeholder="Type a message…"
          maxLength={MAX_LEN}
          aria-label="Message"
        />
        <Button type="submit" size="icon" disabled={sending || !draft.trim()} aria-label="Send message">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
};

export default ConsultationChat;
