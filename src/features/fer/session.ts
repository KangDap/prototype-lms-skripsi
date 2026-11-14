import { checkFERHealth, predictFrame } from "./client";
import { ferConfig } from "./config";
import type { FERSnapshot } from "./types";

const initialSnapshot: FERSnapshot = { status: "inactive", sample: null, error: null };

function cameraError(error: unknown) {
  if (error instanceof DOMException) {
    if (["NotAllowedError", "SecurityError"].includes(error.name)) return "Izin kamera ditolak. Izinkan kamera di pengaturan browser, lalu coba kembali.";
    if (error.name === "NotFoundError") return "Kamera tidak ditemukan. Hubungkan kamera, lalu coba kembali.";
    if (error.name === "NotReadableError") return "Kamera tidak dapat dibaca. Tutup aplikasi lain yang menggunakan kamera.";
  }
  return error instanceof Error ? error.message : "FER gagal dijalankan. Silakan coba kembali.";
}

export class FERSession {
  private snapshot = initialSnapshot;
  private listeners = new Set<() => void>();
  private generation = 0;
  private stream: MediaStream | null = null;
  private video: HTMLVideoElement | null = null;
  private controller: AbortController | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private samplingIntervalMs = ferConfig.intervalMs;

  setSamplingInterval(intervalMs: number) {
    if (!Number.isFinite(intervalMs) || intervalMs < 500) throw new Error("Interval FER tidak valid.");
    if (intervalMs === this.samplingIntervalMs) return;
    this.stop();
    this.samplingIntervalMs = intervalMs;
  }

  constructor(private context: { courseId: string; materialId: string }) {}

  setContext(context: { courseId: string; materialId: string }) {
    if (this.context.courseId === context.courseId && this.context.materialId === context.materialId) return;
    this.stop();
    this.context = context;
  }
  getMediaStream() { return this.stream; }

  getSnapshot = () => this.snapshot;
  getServerSnapshot = () => initialSnapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  private publish(snapshot: FERSnapshot) {
    this.snapshot = snapshot;
    this.listeners.forEach((listener) => listener());
  }

  private release() {
    this.generation++;
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    this.controller?.abort();
    this.controller = null;
    this.stream?.getTracks().forEach((track) => {
      track.onended = null;
      track.stop();
    });
    this.stream = null;
    if (this.video) {
      this.video.pause();
      this.video.srcObject = null;
    }
    this.video = null;
  }

  stop = () => {
    this.release();
    this.publish(initialSnapshot);
  };

  private fail(error: unknown) {
    this.release();
    this.publish({ status: "error", sample: null, error: cameraError(error) });
  }

  async start(video: HTMLVideoElement) {
    if (["starting", "active"].includes(this.snapshot.status)) return;
    this.release();
    const generation = this.generation;
    const controller = new AbortController();
    this.controller = controller;
    const current = () => generation === this.generation && !controller.signal.aborted;
    this.publish({ status: "starting", sample: null, error: null });
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Akses kamera tidak tersedia. Buka LMS melalui localhost atau HTTPS pada browser yang mendukung kamera.");
      await checkFERHealth(controller.signal);
      if (!current()) return;
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: ferConfig.width }, height: { ideal: ferConfig.height }, facingMode: "user" },
        audio: false,
      });
      // Permission may resolve after stop, navigation, or a later start.
      if (!current()) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      this.stream = stream;
      this.video = video;
      stream.getVideoTracks().forEach((track) => {
        track.onended = () => { if (current()) this.fail(new Error("Kamera terputus atau izinnya dicabut. Aktifkan kembali untuk melanjutkan.")); };
      });
      video.srcObject = stream;
      await video.play();
      if (!current()) return;
      const canvas = document.createElement("canvas");
      canvas.width = ferConfig.width;
      canvas.height = ferConfig.height;
      const drawing = canvas.getContext("2d");
      if (!drawing) throw new Error("Browser tidak dapat menangkap frame kamera.");
      const sessionId = crypto.randomUUID();
      let sequence = 0;
      this.publish({ status: "active", sample: null, error: null });

      const sample = async () => {
        if (!current()) return;
        try {
          if (video.readyState < 2 || !video.videoWidth) throw new Error("Frame kamera belum tersedia. Aktifkan kembali kamera.");
          const capturedAt = new Date().toISOString();
          const capturedAtMonotonicMs = performance.now();
          drawing.drawImage(video, 0, 0, canvas.width, canvas.height);
          const frame = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Frame kamera gagal dibuat.")), "image/jpeg", ferConfig.jpegQuality);
          });
          drawing.clearRect(0, 0, canvas.width, canvas.height);
          if (!current()) return;
          const prediction = await predictFrame(frame, controller.signal);
          if (!current()) return;
          this.publish({ status: "active", error: null, sample: {
            ...this.context, sessionId, sequence: ++sequence, capturedAt, capturedAtMonotonicMs,
            receivedAt: new Date().toISOString(), prediction,
          } });
          // Schedule only after completion: no overlapping inference requests.
          this.timer = setTimeout(() => { void sample(); }, this.samplingIntervalMs);
        } catch (error) {
          if (current()) this.fail(error);
        }
      };
      void sample();
    } catch (error) {
      if (current()) this.fail(error);
    }
  }
}
