import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Phone, MonitorUp, MonitorOff, Maximize, Minimize } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VideoCallProps {
  appointmentId: string;
  localUserId: string;
  remoteUserId: string;
  isInitiator: boolean;
  onEnd?: () => void;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

const VideoCall = ({ appointmentId, localUserId, remoteUserId, isInitiator, onEnd }: VideoCallProps) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const senderRef = useRef<RTCRtpSender | null>(null);

  const [callState, setCallState] = useState<"idle" | "connecting" | "connected" | "ended">("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { toast } = useToast();

  // Send signaling message
  const sendSignal = useCallback(async (type: string, payload: any) => {
    await supabase.from("webrtc_signaling_messages").insert({
      appointment_id: appointmentId,
      sender_id: localUserId,
      receiver_id: remoteUserId,
      type,
      payload,
    });
  }, [appointmentId, localUserId, remoteUserId]);

  // Clean up signaling messages
  const cleanupSignaling = useCallback(async () => {
    await supabase
      .from("webrtc_signaling_messages")
      .delete()
      .eq("appointment_id", appointmentId)
      .or(`sender_id.eq.${localUserId},receiver_id.eq.${localUserId}`);
  }, [appointmentId, localUserId]);

  // Initialize media and peer connection
  const startCall = useCallback(async () => {
    try {
      setCallState("connecting");

      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;

      // Add local tracks and keep reference to video sender for screen sharing
      stream.getTracks().forEach(track => {
        const sender = pc.addTrack(track, stream);
        if (track.kind === "video") senderRef.current = sender;
      });

      // Handle remote tracks
      pc.ontrack = (event) => {
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
          setCallState("connected");
        }
      };

      // Send ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal("ice-candidate", { candidate: event.candidate.toJSON() });
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed") {
          endCall();
        }
      };

      // If initiator, create and send offer
      if (isInitiator) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await sendSignal("offer", { sdp: offer });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Camera/mic error", description: err.message });
      setCallState("idle");
    }
  }, [isInitiator, sendSignal, toast]);

  // Handle incoming signaling messages via Realtime
  useEffect(() => {
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

          const pc = pcRef.current;

          if (msg.type === "offer" && pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(msg.payload.sdp));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await sendSignal("answer", { sdp: answer });
          }

          if (msg.type === "answer" && pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(msg.payload.sdp));
          }

          if (msg.type === "ice-candidate" && pc) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(msg.payload.candidate));
            } catch (e) {
              console.warn("ICE candidate error", e);
            }
          }

          if (msg.type === "hang-up") {
            endCall();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [appointmentId, localUserId, sendSignal]);

  const endCall = useCallback(() => {
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    pcRef.current?.close();
    pcRef.current = null;
    screenStreamRef.current = null;
    senderRef.current = null;
    setIsScreenSharing(false);
    setCallState("ended");
    cleanupSignaling();
    onEnd?.();
  }, [cleanupSignaling, onEnd]);

  const hangUp = useCallback(async () => {
    await sendSignal("hang-up", {});
    endCall();
  }, [sendSignal, endCall]);

  const toggleMute = () => {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  };

  const toggleVideo = () => {
    if (isScreenSharing) return; // Don't toggle camera while screen sharing
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoOff(!videoTrack.enabled);
    }
  };

  const toggleScreenShare = async () => {
    const pc = pcRef.current;
    const sender = senderRef.current;
    if (!pc || !sender) return;

    if (isScreenSharing) {
      // Stop screen sharing — switch back to camera
      screenStreamRef.current?.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
      const cameraTrack = localStreamRef.current?.getVideoTracks()[0];
      if (cameraTrack) {
        await sender.replaceTrack(cameraTrack);
        if (localVideoRef.current && localStreamRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }
      }
      setIsScreenSharing(false);
    } else {
      // Start screen sharing
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = screenStream;
        const screenTrack = screenStream.getVideoTracks()[0];

        await sender.replaceTrack(screenTrack);

        // Show screen share in local preview
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        // When user stops sharing via browser UI
        screenTrack.onended = () => {
          const cameraTrack = localStreamRef.current?.getVideoTracks()[0];
          if (cameraTrack && sender) {
            sender.replaceTrack(cameraTrack);
          }
          if (localVideoRef.current && localStreamRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
          }
          screenStreamRef.current = null;
          setIsScreenSharing(false);
        };

        setIsScreenSharing(true);
      } catch (err: any) {
        // User cancelled the screen picker
        if (err.name !== "NotAllowedError") {
          toast({ variant: "destructive", title: "Screen share error", description: err.message });
        }
      }
    }
  };

  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  }, []);

  // Sync fullscreen state with browser
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      screenStreamRef.current?.getTracks().forEach(t => t.stop());
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      pcRef.current?.close();
    };
  }, []);

  return (
    <div ref={containerRef} className={`flex flex-col items-center gap-4 ${isFullscreen ? "bg-background p-4 justify-center h-full" : ""}`}>
      {/* Video feeds */}
      <div className={`relative w-full ${isFullscreen ? "max-w-full flex-1" : "max-w-4xl"} aspect-video rounded-xl overflow-hidden bg-muted`}>
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="h-full w-full object-cover"
        />
        {callState !== "connected" && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <p className="text-muted-foreground text-lg font-display">
              {callState === "idle" && "Ready to start call"}
              {callState === "connecting" && "Connecting..."}
              {callState === "ended" && "Call ended"}
            </p>
          </div>
        )}

        {/* Screen sharing indicator */}
        {isScreenSharing && (
          <div className="absolute top-4 left-4 flex items-center gap-2 rounded-lg bg-destructive/90 px-3 py-1.5 text-destructive-foreground text-xs font-medium shadow-lg">
            <MonitorUp className="h-3.5 w-3.5" />
            Sharing your screen
          </div>
        )}

        {/* Local video pip */}
        <div className="absolute bottom-4 right-4 w-40 aspect-video rounded-lg overflow-hidden border-2 border-background shadow-lg">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`h-full w-full object-cover ${!isScreenSharing ? "mirror" : ""}`}
          />
        </div>
      </div>

      {/* Controls */}
      <Card className="flex items-center gap-3 p-3">
        {callState === "idle" ? (
          <Button onClick={startCall} className="gap-2 gradient-primary border-0 text-primary-foreground">
            <Phone className="h-4 w-4" />
            {isInitiator ? "Start Call" : "Join Call"}
          </Button>
        ) : callState !== "ended" ? (
          <>
            <Button
              variant={isMuted ? "destructive" : "outline"}
              size="icon"
              onClick={toggleMute}
              className="rounded-full h-12 w-12"
            >
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
            <Button
              variant={isVideoOff ? "destructive" : "outline"}
              size="icon"
              onClick={toggleVideo}
              className="rounded-full h-12 w-12"
              disabled={isScreenSharing}
            >
              {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
            </Button>
            <Button
              variant={isScreenSharing ? "destructive" : "outline"}
              size="icon"
              onClick={toggleScreenShare}
              className="rounded-full h-12 w-12"
            >
              {isScreenSharing ? <MonitorOff className="h-5 w-5" /> : <MonitorUp className="h-5 w-5" />}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={toggleFullscreen}
              className="rounded-full h-12 w-12"
            >
              {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            </Button>
            <Button
              variant="destructive"
              size="icon"
              onClick={hangUp}
              className="rounded-full h-12 w-12"
            >
              <PhoneOff className="h-5 w-5" />
            </Button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Call has ended</p>
        )}
      </Card>
    </div>
  );
};

export default VideoCall;
