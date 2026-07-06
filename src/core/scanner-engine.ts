/**
 * Scanner Engine — abstraction over barcode scanning backends.
 *
 * Strategy pattern:
 *   1. BarcodeDetector API (Chrome 83+, native, zero-dependency)
 *   2. Manual frame-capture fallback for browsers without BarcodeDetector
 *
 * The engine reads frames from a <video> element and emits decoded results
 * via a callback.
 */

import type { BarcodeDetector } from 'barcode-detector/pure';
import { SUPPORTED_BARCODE_FORMATS } from './barcode-formats';
import { getFormatName } from './format-map';
import { compactScanResults } from './scan-result-filter';

/* ---------- Types ---------- */

export interface ScanResult {
  text: string;
  format: string;
}

export type OnScanCallback = (result: ScanResult) => void;

const SCAN_INTERVAL_MS = 280;

interface NativeBarcodeDetectorConstructor {
  new (options?: { formats?: readonly string[] }): BarcodeDetector;
}

interface WindowWithBarcodeDetector extends Window {
  BarcodeDetector?: NativeBarcodeDetectorConstructor;
}

interface WorkerScanMessage {
  success: boolean;
  rawValue?: string;
  format?: unknown;
}

/* ---------- Engine ---------- */

export class ScannerEngine {
  private video: HTMLVideoElement;
  private onScan: OnScanCallback;
  private scanTimerId: number | null = null;
  private animationFrameId: number | null = null;
  private lastDecodeTime = 0;
  private scanning = false;

  private nativeDetector: BarcodeDetector | null = null;
  private isNativeBusy = false;
  private worker: Worker | null = null;
  private isWorkerBusy = false;

  constructor(video: HTMLVideoElement, onScan: OnScanCallback) {
    this.video = video;
    this.onScan = onScan;
  }

  async start(): Promise<void> {
    if (this.scanning) return;
    this.scanning = true;
    await this.initDetector();
    if (this.scanning) this.loop();
  }

  stop(): void {
    this.scanning = false;
    if (this.scanTimerId !== null) {
      window.clearTimeout(this.scanTimerId);
      this.scanTimerId = null;
    }
    if (this.animationFrameId !== null) {
      if ('cancelVideoFrameCallback' in this.video) {
        this.video.cancelVideoFrameCallback(this.animationFrameId);
      } else {
        cancelAnimationFrame(this.animationFrameId);
      }
      this.animationFrameId = null;
    }
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.nativeDetector = null;
    this.isNativeBusy = false;
    this.isWorkerBusy = false;
  }

  isActive(): boolean {
    return this.scanning;
  }

  /* ---- Private ---- */

  private async initDetector(): Promise<void> {
    if ('BarcodeDetector' in window) {
      try {
        const NativeDetector = (window as WindowWithBarcodeDetector)
          .BarcodeDetector;
        if (NativeDetector) {
          this.nativeDetector = new NativeDetector({
            formats: [...SUPPORTED_BARCODE_FORMATS],
          });
          return;
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn(
            'Native BarcodeDetector failed to initialize, falling back to Web Worker.',
            error,
          );
        }
        this.nativeDetector = null;
      }
    }

    if (!this.worker) {
      this.worker = new Worker(new URL('./scanner.worker.ts', import.meta.url), {
        type: 'module',
      });

      this.worker.onmessage = (event: MessageEvent<WorkerScanMessage>) => {
        this.isWorkerBusy = false;
        const result = event.data;
        if (this.scanning && result.success && result.rawValue) {
          this.onScan({
            text: result.rawValue,
            format: getFormatName(result.format),
          });
        }
      };

      this.worker.onerror = () => {
        this.isWorkerBusy = false;
      };
    }
  }

  private loop(): void {
    this.lastDecodeTime = performance.now();
    this.scheduleNextFrame();
  }

  private scheduleNextFrame(): void {
    if (!this.scanning) return;
    if ('requestVideoFrameCallback' in this.video) {
      this.animationFrameId = this.video.requestVideoFrameCallback(this.runVideoFrameCallback);
    } else {
      this.animationFrameId = requestAnimationFrame(this.runDecodeLoop);
    }
  }

  private runVideoFrameCallback = async (_now: DOMHighResTimeStamp, _metadata: unknown): Promise<void> => {
    if (!this.scanning) return;
    const currentTime = performance.now();
    if (currentTime - this.lastDecodeTime >= SCAN_INTERVAL_MS) {
      await this.decodeFrame();
      this.lastDecodeTime = performance.now();
    }
    this.scheduleNextFrame();
  };

  private runDecodeLoop = async (now: DOMHighResTimeStamp): Promise<void> => {
    if (!this.scanning) return;

    if (now - this.lastDecodeTime >= SCAN_INTERVAL_MS) {
      await this.decodeFrame();
      // Reset the time after decoding
      this.lastDecodeTime = performance.now();
    }

    this.scheduleNextFrame();
  };

  private async decodeFrame(): Promise<void> {
    if (!this.isVideoReady()) return;

    if (this.nativeDetector) {
      if (this.isNativeBusy) return;
      this.isNativeBusy = true;

      try {
        const barcodes = await this.nativeDetector.detect(this.video);
        if (this.scanning && barcodes.length > 0) {
          const barcode = compactScanResults(
            barcodes.map((item) => ({
              text: item.rawValue,
              format: getFormatName(item.format),
            })),
          )[0];

          if (!barcode) return;

          this.onScan({
            text: barcode.text,
            format: barcode.format,
          });
        }
      } catch {
        /* No barcode found or the frame could not be decoded. */
      } finally {
        this.isNativeBusy = false;
      }
      return;
    }

    if (!this.worker || this.isWorkerBusy) return;

    this.isWorkerBusy = true;
    let bitmap: ImageBitmap | null = null;

    try {
      bitmap = await createImageBitmap(this.video);

      if (!this.scanning || !this.worker) {
        bitmap.close();
        return;
      }

      this.worker.postMessage(bitmap, [bitmap]);
      bitmap = null;
    } catch {
      bitmap?.close();
      this.isWorkerBusy = false;
    }
  }

  private isVideoReady(): boolean {
    return (
      this.video.readyState >= this.video.HAVE_CURRENT_DATA &&
      this.video.videoWidth > 0 &&
      this.video.videoHeight > 0
    );
  }
}
