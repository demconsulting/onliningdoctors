/**
 * SignalingService — Supabase-backed WebRTC signalling and presence.
 *
 * Wraps two Supabase Realtime channels:
 *   1. A postgres_changes subscription on `webrtc_signaling_messages`
 *      (INSERTs addressed to us for this appointment).
 *   2. A presence channel keyed by `call-room:${appointmentId}` so both
 *      participants know when the other has joined or left, and duplicate
 *      tabs are detected.
 *
 * Messages sent by the local user are ignored automatically (we filter by
 * receiver_id in the subscription, and defensively drop anything whose
 * sender_id matches the local user).
 */

import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { SignalMessage, SignalMessageType } from "./types";

export interface PresenceEntry {
  user_id: string;
  tab_id: string;
  joined_at: number;
}

export interface SignalingCallbacks {
  onMessage: (msg: SignalMessage) => void;
  onRemotePresence: (present: boolean) => void;
  onDuplicateTab: () => void;
}

export class SignalingService {
  private signalChannel: RealtimeChannel | null = null;
  private presenceChannel: RealtimeChannel | null = null;
  private readonly tabId = Math.random().toString(36).slice(2) + Date.now().toString(36);
  private disposed = false;

  constructor(
    private readonly appointmentId: string,
    private readonly localUserId: string,
    private readonly remoteUserId: string,
  ) {}

  async send(type: SignalMessageType, payload: Record<string, unknown>): Promise<{ error?: string }> {
    const { error } = await supabase.from("webrtc_signaling_messages").insert({
      appointment_id: this.appointmentId,
      sender_id: this.localUserId,
      receiver_id: this.remoteUserId,
      type,
      // JSONB column — cast for the untyped signalling payload envelope.
      payload: payload as unknown as never,
    });
    return { error: error?.message };
  }

  /** Delete signalling rows belonging to this consultation and this user. */
  async cleanup(): Promise<void> {
    await supabase
      .from("webrtc_signaling_messages")
      .delete()
      .eq("appointment_id", this.appointmentId)
      .or(`sender_id.eq.${this.localUserId},receiver_id.eq.${this.localUserId}`);
  }

  subscribe(callbacks: SignalingCallbacks): void {
    this.subscribeSignals(callbacks);
    this.subscribePresence(callbacks);
  }

  private subscribeSignals(cb: SignalingCallbacks): void {
    this.signalChannel = supabase
      .channel(`signaling-${this.appointmentId}-${this.localUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "webrtc_signaling_messages",
          filter: `receiver_id=eq.${this.localUserId}`,
        },
        (payload) => {
          if (this.disposed) return;
          const row = payload.new as SignalMessage;
          if (row.appointment_id !== this.appointmentId) return;
          // Defensive: ignore anything we somehow sent to ourselves.
          if (row.sender_id === this.localUserId) return;
          if (row.sender_id !== this.remoteUserId) return;
          cb.onMessage(row);
        },
      )
      .subscribe();
  }

  private subscribePresence(cb: SignalingCallbacks): void {
    const room = `call-room:${this.appointmentId}`;
    const channel = supabase.channel(room, { config: { presence: { key: this.localUserId } } });
    this.presenceChannel = channel;

    const evaluate = () => {
      if (this.disposed) return;
      const state = channel.presenceState() as Record<string, PresenceEntry[]>;
      const localEntries = state[this.localUserId] ?? [];
      const remoteEntries = state[this.remoteUserId] ?? [];

      const otherTabs = localEntries.filter((e) => e.tab_id !== this.tabId);
      if (otherTabs.length > 0) {
        cb.onDuplicateTab();
        return;
      }
      cb.onRemotePresence(remoteEntries.length > 0);
    };

    channel
      .on("presence", { event: "sync" }, evaluate)
      .on("presence", { event: "join" }, evaluate)
      .on("presence", { event: "leave" }, evaluate)
      .subscribe(async (state) => {
        if (state === "SUBSCRIBED" && !this.disposed) {
          await channel.track({ user_id: this.localUserId, tab_id: this.tabId, joined_at: Date.now() });
        }
      });
  }

  async dispose(): Promise<void> {
    this.disposed = true;
    if (this.signalChannel) { await supabase.removeChannel(this.signalChannel); this.signalChannel = null; }
    if (this.presenceChannel) {
      try { await this.presenceChannel.untrack(); } catch { /* ignore */ }
      await supabase.removeChannel(this.presenceChannel);
      this.presenceChannel = null;
    }
  }
}
