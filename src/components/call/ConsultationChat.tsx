/**
 * ConsultationChat — pure view component. Message state, realtime
 * subscription and unread counting live in `useConsultationChat` inside
 * the parent page so switching between the desktop side panel and mobile
 * bottom-sheet drawer never loses history.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, MessageSquare, X } from "lucide-react";
import type { ChatMessage } from "@/services/webrtc/useConsultationChat";

interface ConsultationChatProps {
  messages: ChatMessage[];
  localUserId: string;
  remoteName: string;
  maxLength: number;
  onSend: (draft: string) => Promise<{ ok: boolean; error?: string }>;
  onClose: () => void;
}

const formatTime = (iso: string) => {
  try { return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
  catch { return ""; }
};

const ConsultationChat = ({
  messages, localUserId, remoteName, maxLength, onSend, onClose,
}: ConsultationChatProps) => {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to newest message.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const scroller = el.closest("[data-radix-scroll-area-viewport]") as HTMLElement | null;
    (scroller ?? el).scrollTo({ top: (scroller ?? el).scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = useCallback(async () => {
    if (!draft.trim()) return;
    setSending(true);
    const res = await onSend(draft);
    setSending(false);
    if (res.ok) setDraft("");
  }, [draft, onSend]);

  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-card">
      <header className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <MessageSquare className="h-4 w-4" aria-hidden="true" />
          Chat with {remoteName || "participant"}
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close chat">
          <X className="h-4 w-4" />
        </Button>
      </header>

      <ScrollArea className="flex-1">
        <div ref={scrollRef} className="flex flex-col gap-2 px-3 py-3">
          {messages.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">
              Messages sent here are visible to the doctor, patient, and authorised admins only.
            </p>
          ) : (
            messages.map((m) => {
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
          onChange={(e) => setDraft(e.target.value.slice(0, maxLength))}
          placeholder="Type a message…"
          maxLength={maxLength}
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
