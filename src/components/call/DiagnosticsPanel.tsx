/**
 * DiagnosticsPanel — admin-only WebRTC diagnostics.
 *
 * Never rendered for patients or doctors. Shows track presence, connection
 * / ICE / signalling state, ICE candidate counts, last signalling event,
 * last error and round-trip time. Contains no PHI.
 */

import type { DiagnosticsSnapshot } from "@/services/webrtc/types";

const Dot = ({ ok }: { ok: boolean }) => (
  <span
    className={`inline-block h-2 w-2 rounded-full ${ok ? "bg-green-500" : "bg-muted-foreground/40"}`}
    aria-hidden="true"
  />
);

interface DiagnosticsPanelProps {
  snapshot: DiagnosticsSnapshot;
}

const DiagnosticsPanel = ({ snapshot }: DiagnosticsPanelProps) => (
  <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3 text-xs">
    <p className="mb-2 font-semibold text-primary">Admin diagnostics</p>
    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
      <span className="flex items-center gap-2"><Dot ok={snapshot.hasLocalAudio} /> Local mic</span>
      <span className="flex items-center gap-2"><Dot ok={snapshot.hasLocalVideo} /> Local camera</span>
      <span className="flex items-center gap-2"><Dot ok={snapshot.hasRemoteAudio} /> Remote audio</span>
      <span className="flex items-center gap-2"><Dot ok={snapshot.hasRemoteVideo} /> Remote video</span>
    </div>
    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
      <dt>Selected microphone</dt><dd className="text-foreground">{snapshot.selectedMicrophone || "—"}</dd>
      <dt>Local audio exists</dt><dd className="text-foreground">{snapshot.localAudioTrackExists ? "Yes" : "No"}</dd>
      <dt>Local audio enabled</dt><dd className="text-foreground">{snapshot.localAudioTrackEnabled == null ? "—" : snapshot.localAudioTrackEnabled ? "Yes" : "No"}</dd>
      <dt>Local audio muted</dt><dd className="text-foreground">{snapshot.localAudioTrackMuted == null ? "—" : snapshot.localAudioTrackMuted ? "Yes" : "No"}</dd>
      <dt>Local audio readyState</dt><dd className="text-foreground">{snapshot.localAudioTrackReadyState ?? "—"}</dd>
      <dt>Audio sender attached</dt><dd className="text-foreground">{snapshot.audioSenderAttached ? "Yes" : "No"}</dd>
      <dt>Audio sender track ID</dt><dd className="break-all text-foreground">{snapshot.audioSenderTrackId ?? "—"}</dd>
      <dt>Audio bytes sent</dt><dd className="text-foreground">{snapshot.audioBytesSent ?? "—"}</dd>
      <dt>Remote audio received</dt><dd className="text-foreground">{snapshot.remoteAudioTrackReceived ? "Yes" : "No"}</dd>
      <dt>Audio bytes received</dt><dd className="text-foreground">{snapshot.audioBytesReceived ?? "—"}</dd>
      <dt>Remote media muted</dt><dd className="text-foreground">{snapshot.remoteMediaElementMuted == null ? "—" : snapshot.remoteMediaElementMuted ? "Yes" : "No"}</dd>
      <dt>Remote media volume</dt><dd className="text-foreground">{snapshot.remoteMediaElementVolume ?? "—"}</dd>
      <dt>Remote playback</dt><dd className="text-foreground">{snapshot.remoteMediaPlaybackState ?? "—"}</dd>
      <dt>Chat subscription</dt><dd className="text-foreground">{snapshot.chatSubscriptionStatus ?? "—"}</dd>
      <dt>Connection</dt><dd className="text-foreground">{snapshot.connectionState}</dd>
      <dt>ICE</dt><dd className="text-foreground">{snapshot.iceConnectionState}</dd>
      <dt>Signalling</dt><dd className="text-foreground">{snapshot.signalingState}</dd>
      <dt>ICE cand. local / remote</dt><dd className="text-foreground">{snapshot.localCandidateCount} / {snapshot.remoteCandidateCount}</dd>
      <dt>RTT</dt><dd className="text-foreground">{snapshot.roundTripTimeMs != null ? `${snapshot.roundTripTimeMs} ms` : "—"}</dd>
      <dt>Last signal</dt><dd className="text-foreground">{snapshot.lastSignalType ?? "—"}</dd>
    </dl>
    {snapshot.lastError && (
      <p className="mt-2 rounded bg-destructive/10 px-2 py-1 text-destructive">
        Last error: {snapshot.lastError}
      </p>
    )}
    {snapshot.chatSubscriptionError && (
      <p className="mt-2 rounded bg-destructive/10 px-2 py-1 text-destructive">
        Chat error: {snapshot.chatSubscriptionError}
      </p>
    )}
  </div>
);

export default DiagnosticsPanel;
