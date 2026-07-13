/**
 * WebRTCService — orchestrates a single peer-to-peer consultation.
 *
 * Responsibilities:
 *   - Own exactly ONE RTCPeerConnection at a time. Close the old one before
 *     creating a new one; never leak listeners or send duplicate offers.
 *   - Add every local audio + video track from MediaService to the PC.
 *   - Route Supabase signalling messages through perfect-negotiation logic
 *     (doctor = impolite initiator, patient = polite peer).
 *   - Deliver remote tracks as soon as ontrack fires — do not wait for ICE
 *     gathering to complete.
 *   - Handle reconnection: disconnected → wait → restart-ICE → recreate PC.
 *   - Emit high-level events (`statuschange`, `remotestream`, `error`) that
 *     React components bind to via `useConsultation`.
 *
 * This service is intentionally React-agnostic. It only touches DOM through
 * the `MediaService` stream references it is given.
 */

import { ICE_SERVERS } from "./iceConfig";
import { MediaService } from "./mediaService";
import { SignalingService } from "./signalingService";
import { ConnectionDiagnostics } from "./connectionDiagnostics";
import type { CallStatus, SignalMessage } from "./types";

type Listener<T> = (payload: T) => void;

interface EventMap {
  statuschange: CallStatus;
  remotestream: MediaStream;
  error: { message: string; recoverable: boolean };
  ended: void;
}

const CONNECT_TIMEOUT_MS = 20_000;
const RECONNECT_GRACE_MS = 3_000;
const MAX_ICE_RESTARTS = 2;
const MAX_PC_RECREATIONS = 2;

export interface WebRTCServiceOptions {
  appointmentId: string;
  localUserId: string;
  remoteUserId: string;
  isInitiator: boolean;
  media: MediaService;
  signaling: SignalingService;
  diagnostics: ConnectionDiagnostics;
}

export class WebRTCService {
  private pc: RTCPeerConnection | null = null;
  private remoteStream = new MediaStream();
  private status: CallStatus = "idle";

  private makingOffer = false;
  private isSettingRemoteAnswerPending = false;
  private pendingCandidates: RTCIceCandidateInit[] = [];
  private startedInitialNegotiation = false;
  private remotePresent = false;
  private iceRestartCount = 0;
  private pcRecreationCount = 0;
  private connectTimeout: ReturnType<typeof setTimeout> | null = null;
  private reconnectGrace: ReturnType<typeof setTimeout> | null = null;
  private healthTimer: ReturnType<typeof setInterval> | null = null;
  private disposed = false;

  private readonly listeners: { [K in keyof EventMap]: Set<Listener<EventMap[K]>> } = {
    statuschange: new Set(),
    remotestream: new Set(),
    error: new Set(),
    ended: new Set(),
  };

  private readonly polite: boolean;

  constructor(private readonly opts: WebRTCServiceOptions) {
    this.polite = !opts.isInitiator;
  }

  on<K extends keyof EventMap>(event: K, cb: Listener<EventMap[K]>): () => void {
    this.listeners[event].add(cb);
    return () => this.listeners[event].delete(cb);
  }

  private emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void {
    for (const cb of this.listeners[event]) (cb as Listener<EventMap[K]>)(payload);
  }

  private setStatus(next: CallStatus): void {
    if (this.status === next) return;
    this.status = next;
    this.emit("statuschange", next);
    this.armConnectTimeout(next);
  }

  private armConnectTimeout(status: CallStatus): void {
    if (
      status === "connected" ||
      status === "connected-waiting-remote-audio" ||
      status === "connected-remote-camera-off" ||
      status === "microphone-not-transmitting" ||
      status === "remote-sound-blocked" ||
      status === "connection-timeout" ||
      status === "ended"
    ) {
      if (this.connectTimeout) { clearTimeout(this.connectTimeout); this.connectTimeout = null; }
      return;
    }
    if (status !== "connecting" && status !== "reconnecting") return;
    if (this.connectTimeout) clearTimeout(this.connectTimeout);
    this.connectTimeout = setTimeout(() => {
      if (this.status !== "connected") this.setStatus("connection-timeout");
    }, CONNECT_TIMEOUT_MS);
  }

  /** Called by consumer once the SignalingService is wired up. */
  async start(): Promise<void> {
    // Signalling subscription callbacks are set here so we own the perfect
    // negotiation state entirely inside this service.
    this.opts.signaling.subscribe({
      onMessage: (msg) => { void this.handleSignal(msg); },
      onRemotePresence: (present) => { void this.onRemotePresence(present); },
      onDuplicateTab: () => this.setStatus("duplicate-tab"),
    });
    this.createPeerConnection();
    this.setStatus(this.opts.isInitiator ? "waiting-remote" : "waiting-remote");
  }

  private createPeerConnection(): RTCPeerConnection {
    this.closePc();
    const pc = new RTCPeerConnection(ICE_SERVERS);
    this.pc = pc;
    this.remoteStream = new MediaStream();
    this.pendingCandidates = [];
    this.startedInitialNegotiation = false;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.opts.diagnostics.recordLocalCandidate();
        void this.opts.signaling.send("ice-candidate", { candidate: event.candidate.toJSON() });
      }
    };

    pc.ontrack = (event) => {
      // Attach remote tracks immediately — never wait for ICE.
      const stream = event.streams[0] ?? this.remoteStream;
      if (!event.streams[0]) stream.addTrack(event.track);
      this.remoteStream = stream;
      this.evaluateMediaHealth();
      this.emit("remotestream", stream);
    };

    pc.onnegotiationneeded = async () => {
      // Only the initiator triggers offers via onnegotiationneeded, and only
      // once the remote peer is present. Otherwise offers cross without a
      // listener and are dropped.
      if (!this.opts.isInitiator) return;
      if (!this.remotePresent) return;
      try {
        this.makingOffer = true;
        await pc.setLocalDescription();
        await this.opts.signaling.send("offer", { sdp: pc.localDescription });
      } catch (err) {
        this.opts.diagnostics.recordError(err);
      } finally {
        this.makingOffer = false;
      }
    };

    pc.oniceconnectionstatechange = () => {
      switch (pc.iceConnectionState) {
        case "checking":
          if (this.status !== "connected") this.setStatus("connecting");
          break;
        case "connected":
        case "completed":
          this.iceRestartCount = 0;
          this.pcRecreationCount = 0;
          this.evaluateMediaHealth();
          break;
        case "disconnected":
          this.scheduleReconnect();
          break;
        case "failed":
          void this.recoverFromFailure();
          break;
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") this.evaluateMediaHealth();
      if (pc.connectionState === "failed") void this.recoverFromFailure();
    };

    void this.attachLocalTracks(pc);
    this.opts.diagnostics.attach(pc);
    this.startHealthChecks();
    return pc;
  }

  private async attachLocalTracks(pc: RTCPeerConnection): Promise<void> {
    const stream = this.opts.media.getStream();
    if (!stream) {
      this.opts.diagnostics.recordLocalMedia(null);
      return;
    }
    const audioTrack = stream.getAudioTracks()[0] ?? null;
    if (audioTrack) {
      audioTrack.enabled = true;
      console.info("[WebRTCService] attaching local audio track", {
        exists: Boolean(audioTrack),
        enabled: audioTrack.enabled,
        muted: audioTrack.muted,
        readyState: audioTrack.readyState,
        label: audioTrack.label,
      });
    }
    for (const track of stream.getTracks()) {
      // Add every local track (audio + video). If a track is muted the
      // *enabled* flag flips but the track stays on the peer connection,
      // so the remote still sees the sender.
      const existingSender = pc.getSenders().find((sender) => sender.track?.kind === track.kind);
      if (existingSender) {
        await existingSender.replaceTrack(track);
      } else {
        pc.addTrack(track, stream);
      }
    }
    this.opts.diagnostics.recordLocalMedia(stream);
    this.evaluateMediaHealth();
  }

  async refreshLocalTracks(): Promise<void> {
    if (!this.pc) return;
    await this.attachLocalTracks(this.pc);
  }

  private startHealthChecks(): void {
    if (this.healthTimer) clearInterval(this.healthTimer);
    this.healthTimer = setInterval(() => this.evaluateMediaHealth(), 1000);
  }

  private hasConnectedTransport(): boolean {
    const pc = this.pc;
    if (!pc) return false;
    return pc.connectionState === "connected" || pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed";
  }

  private evaluateMediaHealth(): void {
    const pc = this.pc;
    if (!pc || !this.hasConnectedTransport()) return;
    const localAudioTrack = this.opts.media.getAudioTrack();
    const localMicLive = !!localAudioTrack && localAudioTrack.enabled && !localAudioTrack.muted && localAudioTrack.readyState === "live";
    const audioSender = pc.getSenders().find((sender) => sender.track?.kind === "audio") ?? null;
    const audioSenderActive = !!audioSender?.track && audioSender.track.readyState === "live";
    const remoteTracks = this.remoteStream.getTracks();
    const remoteAudioReceived = remoteTracks.some((track) => track.kind === "audio" && track.readyState === "live");
    const remoteVideoReceived = remoteTracks.some((track) => track.kind === "video" && track.readyState === "live");

    this.opts.diagnostics.update({
      localAudioTrackExists: Boolean(localAudioTrack),
      localAudioTrackEnabled: localAudioTrack?.enabled,
      localAudioTrackMuted: localAudioTrack?.muted,
      localAudioTrackReadyState: localAudioTrack?.readyState,
      selectedMicrophone: localAudioTrack?.label,
      audioSenderAttached: Boolean(audioSender?.track),
      audioSenderTrackId: audioSender?.track?.id,
      remoteAudioTrackReceived: remoteAudioReceived,
      hasRemoteAudio: remoteAudioReceived,
      hasRemoteVideo: remoteVideoReceived,
    });

    if (!localMicLive || !audioSenderActive) {
      this.setStatus("microphone-not-transmitting");
      return;
    }
    if (!remoteAudioReceived) {
      this.setStatus("connected-waiting-remote-audio");
      return;
    }
    if (!remoteVideoReceived) {
      this.setStatus("connected-remote-camera-off");
      return;
    }
    this.setStatus("connected");
  }

  private async onRemotePresence(present: boolean): Promise<void> {
    this.remotePresent = present;
    if (!present) {
      // Peer left — reset negotiation flag so a rejoin triggers a fresh offer.
      this.startedInitialNegotiation = false;
      this.setStatus("waiting-remote");
      return;
    }
    if (!this.pc) this.createPeerConnection();
    if (this.status !== "connected") this.setStatus("connecting");
    if (this.opts.isInitiator && !this.startedInitialNegotiation) {
      this.startedInitialNegotiation = true;
      await this.createInitialOffer();
    }
  }

  private async createInitialOffer(): Promise<void> {
    const pc = this.pc;
    if (!pc) return;
    try {
      this.makingOffer = true;
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await this.opts.signaling.send("offer", { sdp: pc.localDescription });
    } catch (err) {
      this.opts.diagnostics.recordError(err);
      this.emit("error", { message: "Could not start the call. Retrying…", recoverable: true });
    } finally {
      this.makingOffer = false;
    }
  }

  private async handleSignal(msg: SignalMessage): Promise<void> {
    this.opts.diagnostics.recordSignal(msg.type);
    if (msg.type === "leave" || msg.type === "hang-up") {
      this.setStatus("ended");
      this.emit("ended", undefined);
      return;
    }
    if (msg.type === "restart-ice") {
      if (this.opts.isInitiator && this.pc) {
        try { this.pc.restartIce(); } catch { /* ignore */ }
      }
      return;
    }

    if (!this.pc) this.createPeerConnection();
    const pc = this.pc!;

    try {
      if (msg.type === "offer") {
        const description = msg.payload.sdp as RTCSessionDescriptionInit;
        const readyForOffer =
          !this.makingOffer && (pc.signalingState === "stable" || this.isSettingRemoteAnswerPending);
        const collision = !readyForOffer;
        if (collision && !this.polite) return; // impolite ignores colliding offers
        await pc.setRemoteDescription(description);
        await this.flushCandidates();
        await pc.setLocalDescription();
        await this.opts.signaling.send("answer", { sdp: pc.localDescription });
      } else if (msg.type === "answer") {
        this.isSettingRemoteAnswerPending = true;
        await pc.setRemoteDescription(msg.payload.sdp as RTCSessionDescriptionInit);
        this.isSettingRemoteAnswerPending = false;
        await this.flushCandidates();
      } else if (msg.type === "ice-candidate") {
        this.opts.diagnostics.recordRemoteCandidate();
        const candidate = msg.payload.candidate as RTCIceCandidateInit;
        if (!pc.remoteDescription) {
          this.pendingCandidates.push(candidate);
        } else {
          try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); }
          catch (err) { this.opts.diagnostics.recordError(err); }
        }
      }
    } catch (err) {
      this.opts.diagnostics.recordError(err);
    }
  }

  private async flushCandidates(): Promise<void> {
    const pc = this.pc;
    if (!pc || !pc.remoteDescription) return;
    const queue = this.pendingCandidates.splice(0);
    for (const c of queue) {
      try { await pc.addIceCandidate(new RTCIceCandidate(c)); }
      catch (err) { this.opts.diagnostics.recordError(err); }
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectGrace) return;
    this.setStatus("reconnecting");
    this.reconnectGrace = setTimeout(() => {
      this.reconnectGrace = null;
      if (this.disposed) return;
      const state = this.pc?.iceConnectionState;
      if (state === "connected" || state === "completed") return;
      void this.recoverFromFailure();
    }, RECONNECT_GRACE_MS);
  }

  private async recoverFromFailure(): Promise<void> {
    if (this.disposed) return;
    if (this.iceRestartCount < MAX_ICE_RESTARTS) {
      this.iceRestartCount += 1;
      this.setStatus("reconnecting");
      try {
        this.pc?.restartIce();
        // Ask the peer to restart on their side too, so the exchange happens.
        await this.opts.signaling.send("restart-ice", {});
        if (this.opts.isInitiator && this.pc) {
          this.makingOffer = true;
          const offer = await this.pc.createOffer({ iceRestart: true });
          await this.pc.setLocalDescription(offer);
          await this.opts.signaling.send("offer", { sdp: this.pc.localDescription });
          this.makingOffer = false;
        }
        return;
      } catch (err) {
        this.opts.diagnostics.recordError(err);
      }
    }
    if (this.pcRecreationCount < MAX_PC_RECREATIONS) {
      this.pcRecreationCount += 1;
      this.setStatus("reconnecting");
      this.createPeerConnection();
      if (this.opts.isInitiator && this.remotePresent) {
        this.startedInitialNegotiation = false;
        await this.createInitialOffer();
        this.startedInitialNegotiation = true;
      }
      return;
    }
    this.setStatus("connection-failed");
    this.emit("error", { message: "Unable to reach the other participant.", recoverable: false });
  }

  /** Manually retry after a hard failure or user-triggered retry button. */
  async retry(): Promise<void> {
    this.iceRestartCount = 0;
    this.pcRecreationCount = 0;
    this.startedInitialNegotiation = false;
    this.createPeerConnection();
    if (this.opts.isInitiator && this.remotePresent) {
      await this.createInitialOffer();
      this.startedInitialNegotiation = true;
    } else {
      this.setStatus("waiting-remote");
    }
  }

  toggleAudio(enabled: boolean): void { this.opts.media.setAudioEnabled(enabled); }
  toggleVideo(enabled: boolean): void { this.opts.media.setVideoEnabled(enabled); }

  setRemotePlaybackBlocked(blocked: boolean): void {
    if (blocked) this.setStatus("remote-sound-blocked");
    else this.evaluateMediaHealth();
  }

  recordRemoteMediaElement(state: Parameters<ConnectionDiagnostics["recordRemoteMediaElement"]>[0]): void {
    this.opts.diagnostics.recordRemoteMediaElement(state);
  }

  /** Peer connection sender for the outgoing video track (screen-share swap). */
  getVideoSender(): RTCRtpSender | null {
    return this.pc?.getSenders().find((s) => s.track?.kind === "video") ?? null;
  }

  getPeerConnection(): RTCPeerConnection | null { return this.pc; }

  async hangUp(): Promise<void> {
    if (this.status === "ended") return;
    try { await this.opts.signaling.send("leave", {}); } catch { /* best effort */ }
    this.setStatus("ended");
    this.emit("ended", undefined);
    await this.dispose();
  }

  async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;
    if (this.connectTimeout) { clearTimeout(this.connectTimeout); this.connectTimeout = null; }
    if (this.reconnectGrace) { clearTimeout(this.reconnectGrace); this.reconnectGrace = null; }
    this.closePc();
    this.opts.diagnostics.detach();
    try { await this.opts.signaling.cleanup(); } catch { /* ignore */ }
    await this.opts.signaling.dispose();
  }

  private closePc(): void {
    if (this.healthTimer) { clearInterval(this.healthTimer); this.healthTimer = null; }
    if (!this.pc) return;
    this.pc.onicecandidate = null;
    this.pc.ontrack = null;
    this.pc.onnegotiationneeded = null;
    this.pc.oniceconnectionstatechange = null;
    this.pc.onconnectionstatechange = null;
    try { this.pc.close(); } catch { /* ignore */ }
    this.pc = null;
  }
}
