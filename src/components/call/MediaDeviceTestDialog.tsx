import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Play, Speaker, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MediaDeviceTestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type MicStatus =
  | "idle"
  | "requesting"
  | "detected"
  | "speaking"
  | "recording"
  | "playback"
  | "working"
  | "no-sound"
  | "denied";

const statusText: Record<MicStatus, string> = {
  idle: "Microphone test ready",
  requesting: "Requesting microphone access…",
  detected: "Microphone detected",
  speaking: "Speak now…",
  recording: "Recording short test…",
  playback: "Playback test",
  working: "Microphone is working",
  "no-sound": "No sound detected",
  denied: "Permission denied",
};

const MediaDeviceTestDialog = ({ open, onOpenChange }: MediaDeviceTestDialogProps) => {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("default");
  const [selectedLabel, setSelectedLabel] = useState("Default microphone");
  const [micStatus, setMicStatus] = useState<MicStatus>("idle");
  const [level, setLevel] = useState(0);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [speakerAsked, setSpeakerAsked] = useState(false);
  const [speakerProblem, setSpeakerProblem] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationRef = useRef<number | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const heardSoundRef = useRef(false);
  const recordingUrlRef = useRef<string | null>(null);

  const cleanup = useCallback(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    animationRef.current = null;
    recorderRef.current?.state === "recording" && recorderRef.current.stop();
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    void audioContextRef.current?.close();
    audioContextRef.current = null;
    if (recordingUrlRef.current) URL.revokeObjectURL(recordingUrlRef.current);
    recordingUrlRef.current = null;
    setRecordingUrl(null);
    setLevel(0);
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  useEffect(() => {
    if (!open) {
      cleanup();
      setMicStatus("idle");
      setSpeakerAsked(false);
      setSpeakerProblem(false);
      return;
    }
    void navigator.mediaDevices.enumerateDevices().then((list) => {
      const inputs = list.filter((device) => device.kind === "audioinput");
      setDevices(inputs);
      const selected = inputs.find((device) => device.deviceId === selectedDeviceId) ?? inputs[0];
      if (selected) {
        setSelectedDeviceId(selected.deviceId || "default");
        setSelectedLabel(selected.label || "Default microphone");
      }
    }).catch(() => setDevices([]));
  }, [cleanup, open, selectedDeviceId]);

  const startMicTest = useCallback(async () => {
    cleanup();
    setMicStatus("requesting");
    try {
      const constraints: MediaStreamConstraints = {
        audio: selectedDeviceId && selectedDeviceId !== "default"
          ? { deviceId: { exact: selectedDeviceId }, echoCancellation: true, noiseSuppression: true, autoGainControl: true }
          : { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      const track = stream.getAudioTracks()[0];
      setSelectedLabel(track?.label || "Selected microphone");
      setMicStatus("detected");
      const devicesAfterPermission = await navigator.mediaDevices.enumerateDevices();
      setDevices(devicesAfterPermission.filter((device) => device.kind === "audioinput"));

      const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextCtor) return;
      const audioContext = new AudioContextCtor();
      audioContextRef.current = audioContext;
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 256;
      const data = new Uint8Array(analyser.frequencyBinCount);
      let detected = false;
      const tick = () => {
        analyser.getByteFrequencyData(data);
        const next = Math.min(100, Math.round((data.reduce((sum, value) => sum + value, 0) / data.length) * 2.2));
        setLevel(next);
        if (next > 8) {
          detected = true;
          setMicStatus((current) => current === "detected" ? "speaking" : current);
        }
        animationRef.current = requestAnimationFrame(tick);
      };
      tick();
      window.setTimeout(() => {
        if (!detected && recorderRef.current?.state !== "recording") setMicStatus("no-sound");
      }, 2500);
    } catch {
      setMicStatus("denied");
    }
  }, [cleanup, selectedDeviceId]);

  const recordMicTest = useCallback(async () => {
    if (!streamRef.current) await startMicTest();
    const stream = streamRef.current;
    if (!stream) return;
    chunksRef.current = [];
    const recorder = new MediaRecorder(stream);
    recorderRef.current = recorder;
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
      if (recordingUrlRef.current) URL.revokeObjectURL(recordingUrlRef.current);
      const nextUrl = URL.createObjectURL(blob);
      recordingUrlRef.current = nextUrl;
      setRecordingUrl(nextUrl);
      setMicStatus(level > 3 ? "playback" : "no-sound");
    };
    recorder.start();
    setMicStatus("recording");
    window.setTimeout(() => {
      if (recorder.state === "recording") recorder.stop();
    }, 5000);
  }, [level, recordingUrl, startMicTest]);

  const playSpeakerTest = useCallback(() => {
    setSpeakerAsked(true);
    setSpeakerProblem(false);
    heardSoundRef.current = false;
    const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;
    const audioContext = new AudioContextCtor();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.frequency.value = 660;
    gain.gain.setValueAtTime(0.001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, audioContext.currentTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.8);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.85);
    oscillator.onended = () => void audioContext.close();
  }, []);

  const selectedDeviceName = selectedLabel || devices.find((device) => device.deviceId === selectedDeviceId)?.label || "Default microphone";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Audio device test</DialogTitle>
          <DialogDescription>Test microphone input and speaker playback locally on this device.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 md:grid-cols-2">
          <section className="space-y-3 rounded-lg border border-border p-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Mic className="h-4 w-4" /> Microphone
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Selected microphone:</p>
              <Select value={selectedDeviceId} onValueChange={setSelectedDeviceId}>
                <SelectTrigger aria-label="Selected microphone">
                  <SelectValue placeholder={selectedDeviceName} />
                </SelectTrigger>
                <SelectContent>
                  {devices.length === 0 ? (
                    <SelectItem value="default">Default microphone</SelectItem>
                  ) : devices.map((device, index) => (
                    <SelectItem key={device.deviceId || index} value={device.deviceId || "default"}>
                      {device.label || `Microphone ${index + 1}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm font-medium">{statusText[micStatus]}</p>
            <div className="h-3 overflow-hidden rounded-full bg-muted" aria-label="Microphone input level">
              <div className="h-full bg-primary transition-all" style={{ width: `${level}%` }} />
            </div>
            {level > 8 && <p className="text-xs text-primary">Input level detected</p>}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => void startMicTest()} className="gap-1">
                <Mic className="h-4 w-4" /> Test microphone
              </Button>
              <Button size="sm" onClick={() => void recordMicTest()} className="gap-1" disabled={micStatus === "recording"}>
                {micStatus === "recording" ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                Record 5s
              </Button>
            </div>
            {recordingUrl && (
              <audio
                controls
                src={recordingUrl}
                onEnded={() => {
                  URL.revokeObjectURL(recordingUrl);
                  recordingUrlRef.current = null;
                  setRecordingUrl(null);
                  setMicStatus("working");
                }}
                className="w-full"
              />
            )}
          </section>

          <section className="space-y-3 rounded-lg border border-border p-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Speaker className="h-4 w-4" /> Speaker
            </div>
            <Button size="sm" variant="outline" onClick={playSpeakerTest} className="gap-1">
              <Speaker className="h-4 w-4" /> Test speaker
            </Button>
            {speakerAsked && (
              <div className="space-y-3">
                <p className="text-sm font-medium">Can you hear the test sound?</p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => setSpeakerProblem(false)}>Yes</Button>
                  <Button size="sm" variant="outline" onClick={() => setSpeakerProblem(true)}>No</Button>
                </div>
              </div>
            )}
            {speakerProblem && (
              <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                <li>Check the device volume.</li>
                <li>Confirm the correct output device.</li>
                <li>Make sure the browser tab is not muted.</li>
                <li>Check whether Bluetooth headphones are connected.</li>
              </ul>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MediaDeviceTestDialog;