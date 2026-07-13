/**
 * useConsultationChat — Supabase Realtime subscription for a consultation's
 * text chat. Kept as a hook so the parent page can subscribe once and remount
 * the visual chat panel freely (desktop side panel / mobile Sheet drawer)
 * without losing message history or unread counts.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ConsultationRole } from "@/services/webrtc/types";

export interface ChatMessage {
  id: string;
  appointment_id: string;
  sender_id: string;
  sender_role: string;
  message: string;
  created_at: string;
  read_at: string | null;
}

const MAX_LEN = 1000;

const sanitize = (raw: string) =>
  raw.replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, MAX_LEN);

export interface UseConsultationChatOptions {
  appointmentId: string;
  localUserId: string;
  localRole: ConsultationRole;
  /** Whether the chat is visible; unread counts only accumulate when hidden. */
  visible: boolean;
}

export interface ConsultationChatState {
  messages: ChatMessage[];
  unread: number;
  send: (draft: string) => Promise<{ ok: boolean; error?: string }>;
  markRead: () => void;
  maxLength: number;
  subscriptionStatus: "idle" | "subscribing" | "subscribed" | "error";
  subscriptionError?: string;
}

export const useConsultationChat = ({
  appointmentId, localUserId, localRole, visible,
}: UseConsultationChatOptions): ConsultationChatState => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unread, setUnread] = useState(0);
  const [subscriptionStatus, setSubscriptionStatus] = useState<ConsultationChatState["subscriptionStatus"]>("idle");
  const [subscriptionError, setSubscriptionError] = useState<string | undefined>();
  const visibleRef = useRef(visible);
  visibleRef.current = visible;

  // Initial load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!appointmentId || !localUserId) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("consultation_messages")
        .select("*")
        .eq("appointment_id", appointmentId)
        .order("created_at", { ascending: true })
        .limit(500);
      if (error && !cancelled) setSubscriptionError(error.message);
      if (!cancelled && Array.isArray(data)) setMessages(data as ChatMessage[]);
    })();
    return () => { cancelled = true; };
  }, [appointmentId, localUserId]);

  // Realtime subscription; runs for the lifetime of the consultation page.
  useEffect(() => {
    if (!appointmentId || !localUserId) return;
    setSubscriptionStatus("subscribing");
    setSubscriptionError(undefined);
    const channel = supabase
      .channel(`consultation-chat-${appointmentId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "consultation_messages", filter: `appointment_id=eq.${appointmentId}` },
        (payload) => {
          const row = payload.new as ChatMessage;
          setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
          if (!visibleRef.current && row.sender_id !== localUserId) {
            setUnread((u) => u + 1);
          }
        },
      )
      .subscribe((status, err) => {
        if (status === "SUBSCRIBED") setSubscriptionStatus("subscribed");
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setSubscriptionStatus("error");
          setSubscriptionError(err?.message ?? "Chat realtime subscription failed.");
        }
      });
    return () => { supabase.removeChannel(channel); setSubscriptionStatus("idle"); };
  }, [appointmentId, localUserId]);

  useEffect(() => { if (visible) setUnread(0); }, [visible]);

  const send = useCallback(async (draft: string) => {
    const clean = sanitize(draft);
    if (!clean) return { ok: false, error: "Message is empty." };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("consultation_messages").insert({
      appointment_id: appointmentId,
      sender_id: localUserId,
      sender_role: localRole,
      message: clean,
    });
    return { ok: !error, error: error?.message };
  }, [appointmentId, localUserId, localRole]);

  const markRead = useCallback(() => setUnread(0), []);

  return { messages, unread, send, markRead, maxLength: MAX_LEN, subscriptionStatus, subscriptionError };
};
