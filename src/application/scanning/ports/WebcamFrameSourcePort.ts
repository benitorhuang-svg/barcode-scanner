import type { Observable } from 'rxjs';

export interface WebcamFrameSourcePort {
  requestStream(): Promise<MediaStream>;
  getFrameStream$(): Observable<ImageBitmap>;
  getCapabilities(): MediaTrackCapabilities | null;
  applyConstraint(constraints: MediaTrackConstraints): Promise<void>;
  stop(): void;
}

export interface WebcamFrameSourceFactoryPort {
  create(videoElement: HTMLVideoElement): WebcamFrameSourcePort;
}
