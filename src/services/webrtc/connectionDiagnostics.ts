/**
 * ConnectionDiagnostics — polls `RTCPeerConnection.getStats()` and tracks
 * signalling events so the admin diagnostics panel can display live state.
 *
 * Never logs consultation notes, chat, or PHI — only WebRTC-level counters
 * and states.
 */

import type { DiagnosticsSnapshot } from "./types";

export class ConnectionDiagnostics {
  private snapshot: DiagnosticsSnapshot = {
    hasLocalAudio: false,
    hasLocalVideo: false,
    hasRemoteAudio: false,
    hasRemoteVideo: false,
    connectionState: "new",
    iceConnectionState: "new",
    signalingState: "closed",
    localCandidateCount: 0,
    remoteCandidateCount: 0,
  };
  private timer: ReturnType<typeof setInterval> | null = null;
  private listeners = new Set<(s: DiagnosticsSnapshot) => void>();

  subscribe(listener: (s: DiagnosticsSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => this.listeners.delete(listener);
  }

  get(): DiagnosticsSnapshot { return this.snapshot; }

  private emit(): void {
    const s = { ...this.snapshot };
    for (const l of this.listeners) l(s);
  }

  update(partial: Partial<DiagnosticsSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...partial };
    this.emit();
  }

  recordSignal(type: string): void {
    this.update({ lastSignalType: type, lastSignalAt: new Date().toISOString() });
  }

  recordError(err: unknown): void {
    const msg = err instanceof Error ? err.message : String(err);
    this.update({ lastError: msg });
  }

  recordLocalCandidate(): void { this.snapshot.localCandidateCount += 1; this.emit(); }
  recordRemoteCandidate(): void { this.snapshot.remoteCandidateCount += 1; this.emit(); }

  attach(pc: RTCPeerConnection): void {
    this.detach();
    const readTracks = () => {
      const receivers = pc.getReceivers();
      const hasRemoteAudio = receivers.some((r) => r.track?.kind === "audio" && r.track?.readyState === "live");
      const hasRemoteVideo = receivers.some((r) => r.track?.kind === "video" && r.track?.readyState === "live");
      const senders = pc.getSenders();
      const hasLocalAudio = senders.some((s) => s.track?.kind === "audio" && s.track?.readyState === "live");
      const hasLocalVideo = senders.some((s) => s.track?.kind === "video" && s.track?.readyState === "live");
      this.update({
        hasRemoteAudio, hasRemoteVideo, hasLocalAudio, hasLocalVideo,
        connectionState: pc.connectionState,
        iceConnectionState: pc.iceConnectionState,
        signalingState: pc.signalingState,
      });
    };

    this.timer = setInterval(async () => {
      if (pc.connectionState === "closed") { this.detach(); return; }
      readTracks();
      try {
        const stats = await pc.getStats();
        stats.forEach((report: unknown) => {
          const r = report as { type?: string; state?: string; currentRoundTripTime?: number };
          if (r.type === "candidate-pair" && r.state === "succeeded" && typeof r.currentRoundTripTime === "number") {
            this.update({ roundTripTimeMs: Math.round(r.currentRoundTripTime * 1000) });
          }
        });
      } catch { /* ignore transient getStats errors */ }
    }, 2000);

    readTracks();
  }

  detach(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  reset(): void {
    this.detach();
    this.snapshot = {
      hasLocalAudio: false, hasLocalVideo: false,
      hasRemoteAudio: false, hasRemoteVideo: false,
      connectionState: "new", iceConnectionState: "new", signalingState: "closed",
      localCandidateCount: 0, remoteCandidateCount: 0,
    };
    this.emit();
  }
}
