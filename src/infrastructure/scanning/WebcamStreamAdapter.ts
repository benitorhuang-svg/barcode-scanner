import { Observable, animationFrames, switchMap, defer } from 'rxjs';
import { filter } from 'rxjs/operators';
import type { WebcamFrameSourcePort } from '@/application/scanning/ports/WebcamFrameSourcePort';

const MAX_WORKER_FRAME_SIDE = 1024;

export class WebcamStreamAdapter implements WebcamFrameSourcePort {
  private videoElement: HTMLVideoElement;

  constructor(videoElement: HTMLVideoElement) {
    this.videoElement = videoElement;
  }

  private mediaStream: MediaStream | null = null;

  /**
   * Request webcam permission and stream
   */
  async requestStream(): Promise<MediaStream> {
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });
    return this.mediaStream;
  }

  getCapabilities(): MediaTrackCapabilities | null {
    if (!this.mediaStream) return null;
    const track = this.mediaStream.getVideoTracks()[0];
    return track?.getCapabilities?.() ?? null;
  }

  async applyConstraint(constraints: MediaTrackConstraints): Promise<void> {
    if (!this.mediaStream) return;
    const track = this.mediaStream.getVideoTracks()[0];
    if (track) {
      // TypeScript definition for ImageCapture API features like torch is sometimes missing, we cast.
      await track.applyConstraints({
        advanced: [constraints as MediaTrackConstraintSet]
      });
    }
  }

  stop(): void {
    if (!this.mediaStream) return;

    this.mediaStream.getTracks().forEach(track => track.stop());
    this.mediaStream = null;
  }

  /**
   * Returns an Observable of ImageBitmap representing the video frames.
   * Uses animationFrames to sample the video.
   */
  getFrameStream$(): Observable<ImageBitmap> {
    return animationFrames().pipe(
      filter(() => this.isVideoReady()),
      switchMap(() => {
        // We use defer to return an Observable that resolves the Promise of ImageBitmap
        return defer(() => this.createWorkerFrameBitmap());
      })
    );
  }

  private isVideoReady(): boolean {
    return (
      this.videoElement.readyState >= this.videoElement.HAVE_CURRENT_DATA &&
      this.videoElement.videoWidth > 0 &&
      this.videoElement.videoHeight > 0
    );
  }

  private async createWorkerFrameBitmap(): Promise<ImageBitmap> {
    const { videoWidth, videoHeight } = this.videoElement;
    const largestSide = Math.max(videoWidth, videoHeight);

    if (largestSide <= MAX_WORKER_FRAME_SIDE) {
      return createImageBitmap(this.videoElement);
    }

    const scale = MAX_WORKER_FRAME_SIDE / largestSide;
    const resizeWidth = Math.max(1, Math.round(videoWidth * scale));
    const resizeHeight = Math.max(1, Math.round(videoHeight * scale));

    try {
      return await createImageBitmap(this.videoElement, {
        resizeWidth,
        resizeHeight,
        resizeQuality: 'high',
      });
    } catch {
      return createImageBitmap(this.videoElement);
    }
  }
}
