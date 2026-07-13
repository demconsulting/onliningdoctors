/**
 * VideoCall — thin React shell over the WebRTC service stack.
 *
 * All peer-connection, signalling, negotiation, ICE-restart and reconnection
 * logic lives in `src/services/webrtc/`. This component only:
 *   - Renders local / remote video + audio elements.
 *   - Renders media controls (mute, camera, screen-share, fullscreen, hangup).
 *   - Renders the connection status pill + the recovery UI (Retry connection,
 *     Check camera / mic, Leave consultation) after a 20-second timeout or a
 *     hard failure.
 *   - Attaches the local stream to the preview element and the remote stream
 *     to the main video/audio elements the instant they arrive from the
 *     service (never waits on ICE completion).
 */

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, Phone, MonitorUp, MonitorOff,
  Maximize, Minimize, RefreshCw, Settings2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useConsultation } from "@/services/webrtc/useConsultation";
import type { CallStatus } from "@/services/webrtc/types";

interface VideoCallProps {
  /** Consultation room ID — MUST be the Supabase appointment.id. */
  appointmentId: string;
  localUserId: string;
  remoteUserId: string;
  /** Doctor is the impolite peer / initiator. */
  isInitiator: boolean;
  onEnd?: () => void;
  /** Called when the connection reports connected for the first time. */
  onConnected?: () => void;
  /** Optional slot on the right of the controls (e.g. chat toggle button). */
  rightControls?: React.ReactNode;
  /** Live diagnostics stream — parent may forward this to an admin-only panel. */
  onDiagnostics?: (snapshot: import("@/services/webrtc/types").DiagnosticsSnapshot) => void;
}

const STATUS_LABEL: Record<CallStatus, string> = {
  "idle": "Ready to start call",
  "requesting-media": "Preparing camera and microphone…",
  "permission-denied": "Camera or microphone access blocked",
  "waiting-remote": "Waiting for the other participant…",
  "connecting": "Connecting…",
  "connected": "Connected",
  "poor-network": "Poor network",
  "reconnecting": "Reconnecting…",
  "connection-timeout": "The connection is taking longer than expected.",
  "connection-failed": "Unable to connect",
  "ended": "Call ended",
  "duplicate-tab": "This consultation is already active in another tab.",
};

const isRecoveryStatus = (s: CallStatus) =>
  s === "connection-timeout" || s === "connection-failed";

const VideoCall = ({
  appointmentId, localUserId, remoteUserId, isInitiator, onEnd, onConnected, rightControls,
}: VideoCallProps) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const { toast } = useToast();

  const call = useConsultation({ appointmentId, localUserId, remoteUserId, isInitiator });

  // Auto-start on mount. If the tab was backgrounded and permission not yet
  // granted the UI still exposes explicit retry buttons.
  useEffect(() => {
    if (!call.hasStarted && call.status === "idle") {
      void call.start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Notify parent when the call has ended.
  useEffect(() => {
    if (call.status === "ended") onEnd?.();
  }, [call.status, onEnd]);

  useEffect(() => {
    if (call.status === "connected") onConnected?.();
  }, [call.status, onConnected]);

  // Bind local stream to the preview video element.
  useEffect(() => {
    if (!call.localStream) return;
    cameraStreamRef.current = call.localStream;
    if (localVideoRef.current && !isScreenSharing) {
      localVideoRef.current.srcObject = call.localStream;
      localVideoRef.current.play().catch(() => { /* muted local; browser may still block */ });
    }
  }, [call.localStream, isScreenSharing]);

  // Bind remote stream — attach immediately, do not wait for ICE.
  useEffect(() => {
    if (!call.remoteStream) return;
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = call.remoteStream;
      remoteVideoRef.current.play().catch((err) => console.warn("[VideoCall] remote video play blocked", err));
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = call.remoteStream;
      remoteAudioRef.current.play().catch((err) => console.warn("[VideoCall] remote audio play blocked", err));
    }
  }, [call.remoteStream]);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) await containerRef.current.requestFullscreen();
    else await document.exitFullscreen();
  }, []);

  const hangUp = useCallback(async () => {
    if (!window.confirm("End this consultation?")) return;
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    setIsScreenSharing(false);
    await call.hangUp();
  }, [call]);

  const toggleScreenShare = useCallback(async () => {
    const sender = call.webrtc?.getVideoSender();
    if (!sender) return;

    if (isScreenSharing) {
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      const camTrack = cameraStreamRef.current?.getVideoTracks()[0];
      if (camTrack) await sender.replaceTrack(camTrack);
      if (localVideoRef.current && cameraStreamRef.current) {
        localVideoRef.current.srcObject = cameraStreamRef.current;
      }
      setIsScreenSharing(false);
      return;
    }
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenStreamRef.current = screenStream;
      const screenTrack = screenStream.getVideoTracks()[0];
      await sender.replaceTrack(screenTrack);
      if (localVideoRef.current) localVideoRef.current.srcObject = screenStream;
      screenTrack.onended = () => {
        const camTrack = cameraStreamRef.current?.getVideoTracks()[0];
        if (camTrack) void sender.replaceTrack(camTrack);
        if (localVideoRef.current && cameraStreamRef.current) {
          localVideoRef.current.srcObject = cameraStreamRef.current;
        }
        screenStreamRef.current = null;
        setIsScreenSharing(false);
      };
      setIsScreenSharing(true);
    } catch (err: unknown) {
      const e = err as { name?: string; message?: string };
      if (e?.name !== "NotAllowedError") {
        toast({ variant: "destructive", title: "Screen share error", description: e?.message ?? "Could not share screen." });
      }
    }
  }, [isScreenSharing, call.webrtc, toast]);

  const status = call.status;
  const isActiveCall = useMemo(
    () => status !== "idle" && status !== "ended" && status !== "duplicate-tab" && status !== "permission-denied",
    [status],
  );

  const overlayText = STATUS_LABEL[status];
  const isMuted = !call.isAudioEnabled;
  const isVideoOff = !call.isVideoEnabled;

  return (
    <div ref={containerRef} className={`flex flex-col items-center gap-4 ${isFullscreen ? "bg-background p-4 justify-center h-full" : ""}`}>
      <div className={`relative w-full ${isFullscreen ? "max-w-full flex-1" : "max-w-4xl"} aspect-video rounded-xl overflow-hidden bg-muted`}>
        <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />
        {/* Dedicated remote audio element — guarantees audio playback even if the
            video element is hidden or its audio track is momentarily blocked. */}
        <audio ref={remoteAudioRef} autoPlay />

        {status !== "connected" && status !== "poor-network" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-muted px-4 text-center">
            <p className="text-lg font-display text-muted-foreground">{overlayText}</p>

            {status === "permission-denied" && call.mediaError && (
              <p className="max-w-md text-sm text-destructive">{call.mediaError.message}</p>
            )}

            {(status === "permission-denied" || isRecoveryStatus(status)) && (
              <div className="flex flex-wrap items-center justify-center gap-2">
                {isRecoveryStatus(status) && (
                  <Button size="sm" onClick={() => void call.retryConnection()} className="gap-1">
                    <RefreshCw className="h-4 w-4" /> Retry connection
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => void call.retryMedia()} className="gap-1">
                  <Settings2 className="h-4 w-4" /> Check microphone and camera
                </Button>
                <Button size="sm" variant="destructive" onClick={() => void call.hangUp()} className="gap-1">
                  <PhoneOff className="h-4 w-4" /> Leave consultation
                </Button>
              </div>
            )}
          </div>
        )}

        {isScreenSharing && (
          <div className="absolute top-4 left-4 flex items-center gap-2 rounded-lg bg-destructive/90 px-3 py-1.5 text-destructive-foreground text-xs font-medium shadow-lg">
            <MonitorUp className="h-3.5 w-3.5" />
            Sharing your screen
          </div>
        )}

        {isActiveCall && (
          <div className="absolute top-4 right-4 flex items-center gap-1.5 rounded-lg bg-background/80 backdrop-blur px-2.5 py-1 text-xs font-medium shadow-lg">
            <span className={`inline-block h-2 w-2 rounded-full ${
              status === "connected" ? "bg-green-500" :
              status === "poor-network" ? "bg-yellow-500" :
              status === "reconnecting" || status === "connection-failed" || status === "connection-timeout" ? "bg-red-500 animate-pulse" :
              "bg-blue-500 animate-pulse"
            }`} />
            {STATUS_LABEL[status]}
          </div>
        )}

        <div className="absolute bottom-4 right-4 w-40 aspect-video rounded-lg overflow-hidden border-2 border-background shadow-lg">
          {isVideoOff && !isScreenSharing ? (
            <div className="flex h-full w-full items-center justify-center bg-muted-foreground/20 text-xs font-medium text-muted-foreground">
              Camera off
            </div>
          ) : (
            <video ref={localVideoRef} autoPlay playsInline muted className={`h-full w-full object-cover ${!isScreenSharing ? "mirror" : ""}`} />
          )}
        </div>
      </div>

      <Card className="flex items-center gap-3 p-3">
        {status === "duplicate-tab" ? (
          <p className="text-sm text-destructive font-medium px-4">
            This consultation is already active in another tab or window.
          </p>
        ) : status === "ended" ? (
          <p className="text-sm text-muted-foreground">Call has ended</p>
        ) : (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isMuted ? "destructive" : "outline"}
                  size="icon"
                  onClick={call.toggleAudio}
                  className="rounded-full h-12 w-12"
                  aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
                >
                  {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isMuted ? "Unmute" : "Mute"}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isVideoOff ? "destructive" : "outline"}
                  size="icon"
                  onClick={call.toggleVideo}
                  className="rounded-full h-12 w-12"
                  disabled={isScreenSharing}
                  aria-label={isVideoOff ? "Turn camera on" : "Turn camera off"}
                >
                  {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isVideoOff ? "Turn on camera" : "Turn off camera"}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isScreenSharing ? "destructive" : "outline"}
                  size="icon"
                  onClick={() => void toggleScreenShare()}
                  className="rounded-full h-12 w-12"
                  aria-label={isScreenSharing ? "Stop screen share" : "Share screen"}
                >
                  {isScreenSharing ? <MonitorOff className="h-5 w-5" /> : <MonitorUp className="h-5 w-5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isScreenSharing ? "Stop sharing" : "Share screen"}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => void toggleFullscreen()}
                  className="rounded-full h-12 w-12"
                  aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                >
                  {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isFullscreen ? "Exit fullscreen" : "Fullscreen"}</TooltipContent>
            </Tooltip>
            {rightControls}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="destructive" size="icon" onClick={() => void hangUp()} className="rounded-full h-12 w-12" aria-label="End call">
                  {status === "idle" ? <Phone className="h-5 w-5" /> : <PhoneOff className="h-5 w-5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Hang up</TooltipContent>
            </Tooltip>
          </>
        )}
      </Card>
    </div>
  );
};

export default VideoCall;
