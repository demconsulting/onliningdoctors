import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Phone, MonitorUp, MonitorOff, Maximize, Minimize } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VideoCallProps {
  /** Consultation room ID — MUST be the Supabase appointment.id. Never generated on the client. */
  appointmentId: string;
  localUserId: string;
  remoteUserId: string;
  /** Doctor is the impolite peer / initiator. */
  isInitiator: boolean;
  onEnd?: () => void;
}

type CallStatus =
  | "idle"
  | "requesting-media"
  | "waiting-for-doctor"
  | "waiting-for-patient"
  | "preparing"
  | "connecting"
  | "connected"
  | "poor-network"
  | "reconnecting"
  | "connection-lost"
  | "ended"
  | "duplicate-tab";

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
    {
      urls: [
        "turn:openrelay.metered.ca:80",
        "turn:openrelay.metered.ca:443",
        "turn:openrelay.metered.ca:443?transport=tcp",
      ],
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
  iceCandidatePoolSize: 10,
  bundlePolicy: "max-bundle",
  rtcpMuxPolicy: "require",
};

const QUALITY_PRESETS = {
  high: { width: 1280, height: 720, frameRate: 30, maxBitrate: 2_500_000 },
  medium: { width: 640, height: 480, frameRate: 24, maxBitrate: 1_000_000 },
  low: { width: 320, height: 240, frameRate: 15, maxBitrate: 500_000 },
} as const;
type QualityLevel = keyof typeof QUALITY_PRESETS;

const STATUS_LABEL: Record<CallStatus, string> = {
  "idle": "Ready to start call",
  "requesting-media": "Requesting camera and microphone…",
  "waiting-for-doctor": "Waiting for Doctor…",
  "waiting-for-patient": "Waiting for Patient…",
  "preparing": "Preparing secure connection…",
  "connecting": "Connecting…",
  "connected": "Connected",
  "poor-network": "Poor network",
  "reconnecting": "Reconnecting…",
  "connection-lost": "Connection lost. Retrying…",
  "ended": "Call ended",
  "duplicate-tab": "This consultation is already active in another tab.",
};

const log = (event: string, data?: unknown) => {
  // eslint-disable-next-line no-console
  console.log(`[VideoCall] ${event}`, data ?? "");
};

const VideoCall = ({ appointmentId, localUserId, remoteUserId, isInitiator, onEnd }: VideoCallProps) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const videoSenderRef = useRef<RTCRtpSender | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const makingOfferRef = useRef(false);
  const isSettingRemoteAnswerPendingRef = useRef(false);
  const bandwidthIntervalRef = useRef<number | null>(null);
  const remotePresentRef = useRef(false);
  const startedNegotiationRef = useRef(false);
  const tabIdRef = useRef<string>(Math.random().toString(36).slice(2) + Date.now().toString(36));

  const [status, setStatus] = useState<CallStatus>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [quality, setQuality] = useState<QualityLevel>("medium");
  const { toast } = useToast();

  // Perfect negotiation: doctor (initiator) is impolite, patient is polite.
  const polite = !isInitiator;

  const sendSignal = useCallback(async (type: string, payload: Record<string, unknown>) => {
    log("send", { type, appointmentId });
    const { error } = await supabase.from("webrtc_signaling_messages").insert({
      appointment_id: appointmentId,
      sender_id: localUserId,
      receiver_id: remoteUserId,
      type,
      payload,
    });
    if (error) log("send error", error);
  }, [appointmentId, localUserId, remoteUserId]);

  const cleanupSignaling = useCallback(async () => {
    await supabase
      .from("webrtc_signaling_messages")
      .delete()
      .eq("appointment_id", appointmentId)
      .or(`sender_id.eq.${localUserId},receiver_id.eq.${localUserId}`);
  }, [appointmentId, localUserId]);

  const applyBitrateLimits = useCallback(async (pc: RTCPeerConnection, level: QualityLevel) => {
    const preset = QUALITY_PRESETS[level];
    for (const sender of pc.getSenders()) {
      if (sender.track?.kind === "video") {
        const params = sender.getParameters();
        if (!params.encodings || params.encodings.length === 0) params.encodings = [{}];
        params.encodings[0].maxBitrate = preset.maxBitrate;
        params.encodings[0].maxFramerate = preset.frameRate;
        try { await sender.setParameters(params); } catch (e) { log("setParameters failed", e); }
      }
    }
  }, []);

  const startBandwidthMonitor = useCallback((pc: RTCPeerConnection) => {
    if (bandwidthIntervalRef.current) window.clearInterval(bandwidthIntervalRef.current);
    bandwidthIntervalRef.current = window.setInterval(async () => {
      if (pc.connectionState === "closed") return;
      try {
        const stats = await pc.getStats();
        stats.forEach((report: any) => {
          if (report.type === "candidate-pair" && report.state === "succeeded") {
            const rtt = report.currentRoundTripTime;
            if (rtt !== undefined) {
              const newQuality: QualityLevel = rtt < 0.15 ? "high" : rtt < 0.4 ? "medium" : "low";
              setQuality(prev => {
                if (prev !== newQuality) { void applyBitrateLimits(pc, newQuality); }
                return newQuality;
              });
              setStatus(prev => {
                if (prev === "connected" && rtt > 0.6) return "poor-network";
                if (prev === "poor-network" && rtt < 0.4) return "connected";
                return prev;
              });
            }
          }
        });
      } catch { /* ignore */ }
    }, 4000);
  }, [applyBitrateLimits]);

  const flushPendingCandidates = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || !pc.remoteDescription) return;
    const queue = pendingCandidatesRef.current.splice(0);
    for (const c of queue) {
      try { await pc.addIceCandidate(new RTCIceCandidate(c)); log("ICE candidate added (queued)"); }
      catch (e) { log("addIceCandidate (queued) failed", e); }
    }
  }, []);

  const createPeerConnection = useCallback(() => {
    if (pcRef.current) { log("closing existing PC before recreate"); pcRef.current.close(); pcRef.current = null; }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;
    remoteStreamRef.current = new MediaStream();

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        log("ICE candidate sent");
        void sendSignal("ice-candidate", { candidate: event.candidate.toJSON() });
      }
    };

    pc.ontrack = (event) => {
      log("remote track added", event.track.kind);
      const [stream] = event.streams;
      const remoteStream = stream ?? remoteStreamRef.current!;
      if (!stream) remoteStream.addTrack(event.track);
      remoteStreamRef.current = remoteStream;
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
        remoteVideoRef.current.play().catch(err => log("remote video play blocked", err));
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
        remoteAudioRef.current.play().catch(err => log("remote audio play blocked", err));
      }
    };

    pc.onnegotiationneeded = async () => {
      try {
        if (!remotePresentRef.current) { log("negotiationneeded skipped — remote not present"); return; }
        makingOfferRef.current = true;
        log("creating offer");
        await pc.setLocalDescription();
        await sendSignal("offer", { sdp: pc.localDescription });
      } catch (err) {
        log("negotiationneeded failed", err);
      } finally {
        makingOfferRef.current = false;
      }
    };

    pc.oniceconnectionstatechange = () => {
      log("ICE state", pc.iceConnectionState);
      switch (pc.iceConnectionState) {
        case "checking":
          setStatus(prev => (prev === "connected" || prev === "poor-network") ? prev : "connecting");
          break;
        case "connected":
        case "completed":
          setStatus("connected");
          break;
        case "disconnected":
          setStatus("reconnecting");
          break;
        case "failed":
          log("ICE failed — restarting");
          setStatus("reconnecting");
          try { pc.restartIce(); } catch (e) { log("restartIce failed", e); }
          break;
        case "closed":
          break;
      }
    };

    pc.onconnectionstatechange = () => {
      log("PC state", pc.connectionState);
      if (pc.connectionState === "failed") {
        setStatus("connection-lost");
      }
    };

    pc.onsignalingstatechange = () => log("signaling state", pc.signalingState);

    // Add local tracks
    const localStream = localStreamRef.current;
    if (localStream) {
      for (const track of localStream.getTracks()) {
        const sender = pc.addTrack(track, localStream);
        if (track.kind === "video") videoSenderRef.current = sender;
        log("local track added", track.kind);
      }
    }

    void applyBitrateLimits(pc, "medium");
    startBandwidthMonitor(pc);
    return pc;
  }, [sendSignal, applyBitrateLimits, startBandwidthMonitor]);

  // Ensure local media is acquired exactly once.
  const ensureLocalMedia = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current;
    setStatus("requesting-media");
    log("requesting getUserMedia");
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: QUALITY_PRESETS.medium.width },
        height: { ideal: QUALITY_PRESETS.medium.height },
        frameRate: { ideal: QUALITY_PRESETS.medium.frameRate },
      },
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    localStreamRef.current = stream;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
      localVideoRef.current.play().catch(() => { /* ignore autoplay block on muted local */ });
    }
    log("local media ready");
    return stream;
  }, []);

  const endCall = useCallback(() => {
    log("ending call");
    if (bandwidthIntervalRef.current) { window.clearInterval(bandwidthIntervalRef.current); bandwidthIntervalRef.current = null; }
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current = null;
    screenStreamRef.current = null;
    videoSenderRef.current = null;
    remoteStreamRef.current = null;
    pendingCandidatesRef.current = [];
    startedNegotiationRef.current = false;
    remotePresentRef.current = false;
    setIsScreenSharing(false);
    setStatus("ended");
    void cleanupSignaling();
    onEnd?.();
  }, [cleanupSignaling, onEnd]);

  const hangUp = useCallback(async () => {
    await sendSignal("hang-up", {});
    endCall();
  }, [sendSignal, endCall]);

  // Signalling: subscribe to DB messages addressed to us for this appointment.
  useEffect(() => {
    if (status === "idle" || status === "ended" || status === "duplicate-tab") return;

    const channel = supabase
      .channel(`signaling-${appointmentId}-${localUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "webrtc_signaling_messages",
          filter: `receiver_id=eq.${localUserId}`,
        },
        async (payload) => {
          const msg = payload.new as any;
          if (msg.appointment_id !== appointmentId) return;
          if (msg.sender_id !== remoteUserId) return;
          log("received", msg.type);

          const pc = pcRef.current;
          if (!pc && msg.type !== "presence") { log("no PC yet — dropping", msg.type); return; }

          try {
            if (msg.type === "offer") {
              const description = msg.payload.sdp as RTCSessionDescriptionInit;
              const readyForOffer = !makingOfferRef.current && (pc!.signalingState === "stable" || isSettingRemoteAnswerPendingRef.current);
              const offerCollision = !readyForOffer;
              if (offerCollision && !polite) {
                log("offer collision — ignoring (impolite)");
                return;
              }
              await pc!.setRemoteDescription(description);
              await flushPendingCandidates();
              await pc!.setLocalDescription();
              await sendSignal("answer", { sdp: pc!.localDescription });
            } else if (msg.type === "answer") {
              isSettingRemoteAnswerPendingRef.current = true;
              await pc!.setRemoteDescription(msg.payload.sdp as RTCSessionDescriptionInit);
              isSettingRemoteAnswerPendingRef.current = false;
              await flushPendingCandidates();
            } else if (msg.type === "ice-candidate") {
              const candidate = msg.payload.candidate as RTCIceCandidateInit;
              if (!pc!.remoteDescription) {
                log("queueing ICE candidate (no remote description yet)");
                pendingCandidatesRef.current.push(candidate);
              } else {
                try { await pc!.addIceCandidate(new RTCIceCandidate(candidate)); log("ICE candidate added"); }
                catch (e) { log("addIceCandidate failed", e); }
              }
            } else if (msg.type === "hang-up") {
              endCall();
            }
          } catch (err) {
            log("signal handler error", err);
          }
        }
      )
      .subscribe((state) => log("signaling channel state", state));

    return () => { void supabase.removeChannel(channel); };
  }, [appointmentId, localUserId, remoteUserId, polite, sendSignal, endCall, flushPendingCandidates, status]);

  // Presence: room = appointment.id. Detect remote joining/leaving and duplicate tab.
  useEffect(() => {
    if (status === "idle" || status === "ended" || status === "duplicate-tab") return;

    const room = `call-room:${appointmentId}`;
    const channel = supabase.channel(room, {
      config: { presence: { key: localUserId } },
    });

    const evaluatePresence = () => {
      const state = channel.presenceState() as Record<string, Array<{ tab_id: string; user_id: string }>>;
      const localEntries = state[localUserId] ?? [];
      const remoteEntries = state[remoteUserId] ?? [];

      // Duplicate tab detection
      const otherTabs = localEntries.filter(e => e.tab_id !== tabIdRef.current);
      if (otherTabs.length > 0) {
        log("duplicate tab detected");
        setStatus("duplicate-tab");
        // Tear down local media/PC but keep presence so user can decide
        if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
        localStreamRef.current?.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
        return;
      }

      const remotePresent = remoteEntries.length > 0;
      const wasPresent = remotePresentRef.current;
      remotePresentRef.current = remotePresent;
      log("presence eval", { remotePresent, wasPresent, isInitiator });

      if (!remotePresent) {
        setStatus(isInitiator ? "waiting-for-patient" : "waiting-for-doctor");
        return;
      }

      // Remote joined — kick off negotiation if we're the initiator.
      if (!wasPresent) {
        setStatus("preparing");
        if (!pcRef.current) createPeerConnection();
        if (isInitiator && !startedNegotiationRef.current) {
          startedNegotiationRef.current = true;
          log("initiator kicking off offer");
          void (async () => {
            const pc = pcRef.current!;
            try {
              makingOfferRef.current = true;
              await pc.setLocalDescription(await pc.createOffer());
              await sendSignal("offer", { sdp: pc.localDescription });
            } catch (e) {
              log("initial offer failed", e);
            } finally {
              makingOfferRef.current = false;
            }
          })();
        }
      }
    };

    channel
      .on("presence", { event: "sync" }, evaluatePresence)
      .on("presence", { event: "join" }, evaluatePresence)
      .on("presence", { event: "leave" }, () => {
        remotePresentRef.current = false;
        startedNegotiationRef.current = false;
        setStatus(isInitiator ? "waiting-for-patient" : "waiting-for-doctor");
      })
      .subscribe(async (subState) => {
        log("presence channel state", subState);
        if (subState === "SUBSCRIBED") {
          await channel.track({ tab_id: tabIdRef.current, user_id: localUserId, joined_at: Date.now() });
        }
      });

    return () => { void supabase.removeChannel(channel); };
  }, [appointmentId, localUserId, remoteUserId, isInitiator, status, createPeerConnection, sendSignal]);

  const startCall = useCallback(async () => {
    try {
      await ensureLocalMedia();
      createPeerConnection();
      setStatus(isInitiator ? "waiting-for-patient" : "waiting-for-doctor");
    } catch (err: any) {
      log("startCall failed", err);
      let description = err?.message ?? "Unable to access camera or microphone.";
      if (err?.name === "NotAllowedError") description = "Camera/microphone permission denied. Please allow access in your browser settings.";
      else if (err?.name === "NotFoundError") description = "No camera or microphone found on this device.";
      else if (err?.name === "NotReadableError") description = "Camera or microphone is already in use by another application.";
      toast({ variant: "destructive", title: "Media error", description });
      setStatus("idle");
    }
  }, [ensureLocalMedia, createPeerConnection, isInitiator, toast]);

  // Media controls
  const toggleMute = () => {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (audioTrack) { audioTrack.enabled = !audioTrack.enabled; setIsMuted(!audioTrack.enabled); }
  };

  const toggleVideo = () => {
    if (isScreenSharing) return;
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (videoTrack) { videoTrack.enabled = !videoTrack.enabled; setIsVideoOff(!videoTrack.enabled); }
  };

  const toggleScreenShare = async () => {
    const sender = videoSenderRef.current;
    if (!sender) return;

    if (isScreenSharing) {
      screenStreamRef.current?.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
      const cameraTrack = localStreamRef.current?.getVideoTracks()[0];
      if (cameraTrack) {
        await sender.replaceTrack(cameraTrack);
        if (localVideoRef.current && localStreamRef.current) localVideoRef.current.srcObject = localStreamRef.current;
      }
      setIsScreenSharing(false);
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = screenStream;
        const screenTrack = screenStream.getVideoTracks()[0];
        await sender.replaceTrack(screenTrack);
        if (localVideoRef.current) localVideoRef.current.srcObject = screenStream;
        screenTrack.onended = () => {
          const cameraTrack = localStreamRef.current?.getVideoTracks()[0];
          if (cameraTrack && sender) void sender.replaceTrack(cameraTrack);
          if (localVideoRef.current && localStreamRef.current) localVideoRef.current.srcObject = localStreamRef.current;
          screenStreamRef.current = null;
          setIsScreenSharing(false);
        };
        setIsScreenSharing(true);
      } catch (err: any) {
        if (err.name !== "NotAllowedError") toast({ variant: "destructive", title: "Screen share error", description: err.message });
      }
    }
  };

  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) await containerRef.current.requestFullscreen();
    else await document.exitFullscreen();
  }, []);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // Unmount cleanup
  useEffect(() => {
    return () => {
      if (bandwidthIntervalRef.current) window.clearInterval(bandwidthIntervalRef.current);
      screenStreamRef.current?.getTracks().forEach(t => t.stop());
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      pcRef.current?.close();
    };
  }, []);

  const active = status !== "idle" && status !== "ended" && status !== "duplicate-tab";

  return (
    <div ref={containerRef} className={`flex flex-col items-center gap-4 ${isFullscreen ? "bg-background p-4 justify-center h-full" : ""}`}>
      <div className={`relative w-full ${isFullscreen ? "max-w-full flex-1" : "max-w-4xl"} aspect-video rounded-xl overflow-hidden bg-muted`}>
        <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />
        {/* Dedicated remote audio element — guarantees audio playback even if video element is hidden/blocked */}
        <audio ref={remoteAudioRef} autoPlay />

        {status !== "connected" && status !== "poor-network" && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <p className="text-muted-foreground text-lg font-display text-center px-4">
              {STATUS_LABEL[status]}
            </p>
          </div>
        )}

        {isScreenSharing && (
          <div className="absolute top-4 left-4 flex items-center gap-2 rounded-lg bg-destructive/90 px-3 py-1.5 text-destructive-foreground text-xs font-medium shadow-lg">
            <MonitorUp className="h-3.5 w-3.5" />
            Sharing your screen
          </div>
        )}

        {active && (
          <div className="absolute top-4 right-4 flex items-center gap-1.5 rounded-lg bg-background/80 backdrop-blur px-2.5 py-1 text-xs font-medium shadow-lg">
            <span className={`inline-block h-2 w-2 rounded-full ${
              status === "connected" ? "bg-green-500" :
              status === "poor-network" ? "bg-yellow-500" :
              status === "reconnecting" || status === "connection-lost" ? "bg-red-500 animate-pulse" :
              "bg-blue-500 animate-pulse"
            }`} />
            {STATUS_LABEL[status]}
            {status === "connected" && (
              <span className="ml-1 opacity-70">· {quality === "high" ? "HD" : quality === "medium" ? "SD" : "Low"}</span>
            )}
          </div>
        )}

        <div className="absolute bottom-4 right-4 w-40 aspect-video rounded-lg overflow-hidden border-2 border-background shadow-lg">
          <video ref={localVideoRef} autoPlay playsInline muted className={`h-full w-full object-cover ${!isScreenSharing ? "mirror" : ""}`} />
        </div>
      </div>

      <Card className="flex items-center gap-3 p-3">
        {status === "idle" ? (
          <Button onClick={startCall} className="gap-2 gradient-primary border-0 text-primary-foreground">
            <Phone className="h-4 w-4" />
            {isInitiator ? "Start Call" : "Join Call"}
          </Button>
        ) : status === "duplicate-tab" ? (
          <p className="text-sm text-destructive font-medium px-4">This consultation is already active in another tab or window.</p>
        ) : status !== "ended" ? (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant={isMuted ? "destructive" : "outline"} size="icon" onClick={toggleMute} className="rounded-full h-12 w-12">
                  {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isMuted ? "Unmute" : "Mute"}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant={isVideoOff ? "destructive" : "outline"} size="icon" onClick={toggleVideo} className="rounded-full h-12 w-12" disabled={isScreenSharing}>
                  {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isVideoOff ? "Turn on camera" : "Turn off camera"}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant={isScreenSharing ? "destructive" : "outline"} size="icon" onClick={toggleScreenShare} className="rounded-full h-12 w-12">
                  {isScreenSharing ? <MonitorOff className="h-5 w-5" /> : <MonitorUp className="h-5 w-5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isScreenSharing ? "Stop sharing" : "Share screen"}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={toggleFullscreen} className="rounded-full h-12 w-12">
                  {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isFullscreen ? "Exit fullscreen" : "Fullscreen"}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="destructive" size="icon" onClick={hangUp} className="rounded-full h-12 w-12">
                  <PhoneOff className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Hang up</TooltipContent>
            </Tooltip>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Call has ended</p>
        )}
      </Card>
    </div>
  );
};

export default VideoCall;
