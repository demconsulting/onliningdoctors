/** Shared WebRTC types. */

export type ConsultationRole = "doctor" | "patient";

export type SignalMessageType =
  | "offer"
  | "answer"
  | "ice-candidate"
  | "restart-ice"
  | "hang-up"
  | "leave";

export interface SignalMessage {
  id: string;
  appointment_id: string;
  sender_id: string;
  receiver_id: string;
  type: SignalMessageType;
  payload: Record<string, unknown>;
  created_at: string;
}

export type CallStatus =
  | "idle"
  | "requesting-media"
  | "permission-denied"
  | "waiting-remote"
  | "connecting"
  | "connected"
  | "connected-waiting-remote-audio"
  | "connected-remote-camera-off"
  | "microphone-not-transmitting"
  | "remote-sound-blocked"
  | "poor-network"
  | "reconnecting"
  | "connection-timeout"
  | "connection-failed"
  | "ended"
  | "duplicate-tab";

export interface DiagnosticsSnapshot {
  hasLocalAudio: boolean;
  hasLocalVideo: boolean;
  hasRemoteAudio: boolean;
  hasRemoteVideo: boolean;
  selectedMicrophone?: string;
  localAudioTrackExists?: boolean;
  localAudioTrackEnabled?: boolean;
  localAudioTrackMuted?: boolean;
  localAudioTrackReadyState?: MediaStreamTrackState;
  localAudioTrackLabel?: string;
  audioSenderAttached?: boolean;
  audioSenderTrackId?: string;
  audioBytesSent?: number;
  remoteAudioTrackReceived?: boolean;
  audioBytesReceived?: number;
  remoteMediaElementMuted?: boolean;
  remoteMediaElementVolume?: number;
  remoteMediaPlaybackState?: "playing" | "paused" | "blocked" | "not-ready";
  chatSubscriptionStatus?: "idle" | "subscribing" | "subscribed" | "error";
  chatSubscriptionError?: string;
  connectionState: RTCPeerConnectionState | "closed" | "new";
  iceConnectionState: RTCIceConnectionState | "new";
  signalingState: RTCSignalingState | "closed";
  localCandidateCount: number;
  remoteCandidateCount: number;
  lastSignalType?: string;
  lastSignalAt?: string;
  lastError?: string;
  roundTripTimeMs?: number;
}
