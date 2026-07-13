/**
 * MediaService — camera/microphone acquisition.
 *
 * Centralised so the video component never talks to getUserMedia directly.
 * Callers can `acquire()` (retries permission after denial without a page
 * refresh), toggle audio/video by track.enabled, and `release()` on hangup.
 */

export type MediaErrorCode =
  | "permission-denied"
  | "no-device"
  | "device-in-use"
  | "unknown";

export interface MediaError {
  code: MediaErrorCode;
  message: string;
  cause?: unknown;
}

const classifyError = (err: unknown): MediaError => {
  const name = (err as { name?: string })?.name;
  const message = (err as { message?: string })?.message ?? "Unable to access camera or microphone.";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return { code: "permission-denied", message: "Camera/microphone permission denied. Please allow access in your browser settings.", cause: err };
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return { code: "no-device", message: "No camera or microphone found on this device.", cause: err };
  }
  if (name === "NotReadableError" || name === "AbortError") {
    return { code: "device-in-use", message: "Camera or microphone is already in use by another application.", cause: err };
  }
  return { code: "unknown", message, cause: err };
};

export interface MediaAcquireOptions {
  audio?: boolean;
  video?: boolean;
  videoWidth?: number;
  videoHeight?: number;
  videoFrameRate?: number;
}

export class MediaService {
  private stream: MediaStream | null = null;

  hasStream(): boolean { return this.stream !== null; }
  getStream(): MediaStream | null { return this.stream; }

  async acquire(opts: MediaAcquireOptions = {}): Promise<MediaStream> {
    if (this.stream) return this.stream;
    const {
      audio = true,
      video = true,
      videoWidth = 640,
      videoHeight = 480,
      videoFrameRate = 24,
    } = opts;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audio
          ? { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
          : false,
        video: video
          ? { width: { ideal: videoWidth }, height: { ideal: videoHeight }, frameRate: { ideal: videoFrameRate } }
          : false,
      });
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = true;
        console.info("[MediaService] local audio track", {
          exists: Boolean(audioTrack),
          enabled: audioTrack.enabled,
          muted: audioTrack.muted,
          readyState: audioTrack.readyState,
          label: audioTrack.label,
        });
      }
      this.stream = stream;
      return stream;
    } catch (err) {
      throw classifyError(err);
    }
  }

  /** Retry after a permission denial without a page reload. */
  async retry(opts: MediaAcquireOptions = {}): Promise<MediaStream> {
    this.release();
    return this.acquire(opts);
  }

  setAudioEnabled(enabled: boolean): void {
    const track = this.stream?.getAudioTracks()[0];
    if (track) track.enabled = enabled;
  }

  setVideoEnabled(enabled: boolean): void {
    const track = this.stream?.getVideoTracks()[0];
    if (track) track.enabled = enabled;
  }

  isAudioEnabled(): boolean { return this.stream?.getAudioTracks()[0]?.enabled ?? false; }
  isVideoEnabled(): boolean { return this.stream?.getVideoTracks()[0]?.enabled ?? false; }
  hasCamera(): boolean { return (this.stream?.getVideoTracks().length ?? 0) > 0; }
  hasMicrophone(): boolean { return (this.stream?.getAudioTracks().length ?? 0) > 0; }
  getAudioTrack(): MediaStreamTrack | null { return this.stream?.getAudioTracks()[0] ?? null; }
  getVideoTrack(): MediaStreamTrack | null { return this.stream?.getVideoTracks()[0] ?? null; }

  release(): void {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }
}

export { classifyError as classifyMediaError };
