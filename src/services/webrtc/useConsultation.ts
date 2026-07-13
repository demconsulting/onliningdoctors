/**
 * useConsultation — React binding for the WebRTC service stack.
 *
 * Owns the lifecycle of MediaService, SignalingService, ConnectionDiagnostics
 * and WebRTCService for one consultation. React components consume `state`,
 * `localStream`, `remoteStream`, `diagnostics` and the returned control
 * functions.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { MediaService, type MediaError } from "./mediaService";
import { SignalingService } from "./signalingService";
import { ConnectionDiagnostics } from "./connectionDiagnostics";
import { WebRTCService } from "./WebRTCService";
import type { CallStatus, DiagnosticsSnapshot } from "./types";

export interface UseConsultationOptions {
  appointmentId: string;
  localUserId: string;
  remoteUserId: string;
  isInitiator: boolean;
}

export interface ConsultationControls {
  status: CallStatus;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  diagnostics: DiagnosticsSnapshot;
  mediaError: MediaError | null;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  hasStarted: boolean;
  start: () => Promise<void>;
  retryMedia: () => Promise<void>;
  retryConnection: () => Promise<void>;
  toggleAudio: () => void;
  toggleVideo: () => void;
  hangUp: () => Promise<void>;
  webrtc: WebRTCService | null;
}

export const useConsultation = (opts: UseConsultationOptions): ConsultationControls => {
  const { appointmentId, localUserId, remoteUserId, isInitiator } = opts;

  const mediaRef = useRef<MediaService | null>(null);
  const signalingRef = useRef<SignalingService | null>(null);
  const diagnosticsRef = useRef<ConnectionDiagnostics | null>(null);
  const webrtcRef = useRef<WebRTCService | null>(null);

  const [status, setStatus] = useState<CallStatus>("idle");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [mediaError, setMediaError] = useState<MediaError | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);
  const [diagnostics, setDiagnostics] = useState<DiagnosticsSnapshot>({
    hasLocalAudio: false, hasLocalVideo: false, hasRemoteAudio: false, hasRemoteVideo: false,
    connectionState: "new", iceConnectionState: "new", signalingState: "closed",
    localCandidateCount: 0, remoteCandidateCount: 0,
  });

  const ensureServices = useCallback(() => {
    if (!mediaRef.current) mediaRef.current = new MediaService();
    if (!diagnosticsRef.current) diagnosticsRef.current = new ConnectionDiagnostics();
    if (!signalingRef.current) {
      signalingRef.current = new SignalingService(appointmentId, localUserId, remoteUserId);
    }
  }, [appointmentId, localUserId, remoteUserId]);

  const start = useCallback(async () => {
    ensureServices();
    setMediaError(null);
    setStatus("requesting-media");
    try {
      const stream = await mediaRef.current!.acquire();
      setLocalStream(stream);
      setIsAudioEnabled(mediaRef.current!.isAudioEnabled());
      setIsVideoEnabled(mediaRef.current!.isVideoEnabled());
    } catch (err) {
      setMediaError(err as MediaError);
      setStatus("permission-denied");
      return;
    }

    const svc = new WebRTCService({
      appointmentId, localUserId, remoteUserId, isInitiator,
      media: mediaRef.current!,
      signaling: signalingRef.current!,
      diagnostics: diagnosticsRef.current!,
    });
    webrtcRef.current = svc;

    svc.on("statuschange", (s) => setStatus(s));
    svc.on("remotestream", (s) => setRemoteStream(s));
    diagnosticsRef.current!.subscribe((snap) => setDiagnostics(snap));

    await svc.start();
    setHasStarted(true);
  }, [appointmentId, localUserId, remoteUserId, isInitiator, ensureServices]);

  const retryMedia = useCallback(async () => {
    if (!mediaRef.current) return;
    setMediaError(null);
    try {
      const stream = await mediaRef.current.retry();
      setLocalStream(stream);
      setIsAudioEnabled(mediaRef.current.isAudioEnabled());
      setIsVideoEnabled(mediaRef.current.isVideoEnabled());
      if (webrtcRef.current) await webrtcRef.current.retry();
      else await start();
    } catch (err) {
      setMediaError(err as MediaError);
      setStatus("permission-denied");
    }
  }, [start]);

  const retryConnection = useCallback(async () => {
    if (!webrtcRef.current) { await start(); return; }
    await webrtcRef.current.retry();
  }, [start]);

  const toggleAudio = useCallback(() => {
    if (!mediaRef.current) return;
    const next = !mediaRef.current.isAudioEnabled();
    mediaRef.current.setAudioEnabled(next);
    setIsAudioEnabled(next);
  }, []);

  const toggleVideo = useCallback(() => {
    if (!mediaRef.current) return;
    const next = !mediaRef.current.isVideoEnabled();
    mediaRef.current.setVideoEnabled(next);
    setIsVideoEnabled(next);
  }, []);

  const hangUp = useCallback(async () => {
    await webrtcRef.current?.hangUp();
    mediaRef.current?.release();
    setLocalStream(null);
    setRemoteStream(null);
  }, []);

  // Unmount cleanup
  useEffect(() => {
    return () => {
      void (async () => {
        await webrtcRef.current?.dispose();
        mediaRef.current?.release();
        diagnosticsRef.current?.reset();
      })();
    };
  }, []);

  return {
    status,
    localStream,
    remoteStream,
    diagnostics,
    mediaError,
    isAudioEnabled,
    isVideoEnabled,
    hasStarted,
    start,
    retryMedia,
    retryConnection,
    toggleAudio,
    toggleVideo,
    hangUp,
    webrtc: webrtcRef.current,
  };
};
