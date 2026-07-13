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

  recordLocalMedia(stream: MediaStream | null): void {
    const audioTrack = stream?.getAudioTracks()[0] ?? null;
    this.update({
      selectedMicrophone: audioTrack?.label,
      localAudioTrackExists: Boolean(audioTrack),
      localAudioTrackEnabled: audioTrack?.enabled,
      localAudioTrackMuted: audioTrack?.muted,
      localAudioTrackReadyState: audioTrack?.readyState,
      localAudioTrackLabel: audioTrack?.label,
      hasLocalAudio: !!audioTrack && audioTrack.readyState === "live",
    });
  }

  recordRemoteMediaElement(state: {
    muted?: boolean;
    volume?: number;
    playbackState?: DiagnosticsSnapshot["remoteMediaPlaybackState"];
  }): void {
    this.update({
      remoteMediaElementMuted: state.muted,
      remoteMediaElementVolume: state.volume,
      remoteMediaPlaybackState: state.playbackState,
    });
  }

  recordChatSubscription(status: NonNullable<DiagnosticsSnapshot["chatSubscriptionStatus"]>, error?: string): void {
    this.update({ chatSubscriptionStatus: status, chatSubscriptionError: error });
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
      const audioSender = senders.find((s) => s.track?.kind === "audio") ?? null;
      const localAudioTrack = audioSender?.track ?? null;
      const hasLocalAudio = !!localAudioTrack && localAudioTrack.readyState === "live";
      const hasLocalVideo = senders.some((s) => s.track?.kind === "video" && s.track?.readyState === "live");
      this.update({
        hasRemoteAudio, hasRemoteVideo, hasLocalAudio, hasLocalVideo,
        localAudioTrackExists: Boolean(localAudioTrack),
        localAudioTrackEnabled: localAudioTrack?.enabled,
        localAudioTrackMuted: localAudioTrack?.muted,
        localAudioTrackReadyState: localAudioTrack?.readyState,
        localAudioTrackLabel: localAudioTrack?.label,
        selectedMicrophone: localAudioTrack?.label,
        audioSenderAttached: Boolean(audioSender?.track),
        audioSenderTrackId: audioSender?.track?.id,
        remoteAudioTrackReceived: hasRemoteAudio,
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
        let audioBytesSent: number | undefined;
        let audioBytesReceived: number | undefined;
        stats.forEach((report: unknown) => {
          const r = report as {
            type?: string;
            state?: string;
            currentRoundTripTime?: number;
            kind?: string;
            mediaType?: string;
            bytesSent?: number;
            bytesReceived?: number;
          };
          if (r.type === "candidate-pair" && r.state === "succeeded" && typeof r.currentRoundTripTime === "number") {
            this.update({ roundTripTimeMs: Math.round(r.currentRoundTripTime * 1000) });
          }
          if (r.type === "outbound-rtp" && (r.kind === "audio" || r.mediaType === "audio") && typeof r.bytesSent === "number") {
            audioBytesSent = r.bytesSent;
          }
          if (r.type === "inbound-rtp" && (r.kind === "audio" || r.mediaType === "audio") && typeof r.bytesReceived === "number") {
            audioBytesReceived = r.bytesReceived;
          }
        });
        this.update({ audioBytesSent, audioBytesReceived });
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
