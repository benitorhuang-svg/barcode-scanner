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
import { getFormatName } from './format-map';

/* ---------- Types ---------- */

export interface ScanResult {
  text: string;
  format: string;
}

export type OnScanCallback = (result: ScanResult) => void;

/* ---------- BarcodeDetector format list ---------- */

const SUPPORTED_FORMATS = [
  'code_128',
  'code_39',
  'ean_13',
  'ean_8',
  'upc_a',
  'upc_e',
  'itf',
  'codabar',
  'qr_code',
] as const;

const SCAN_INTERVAL_MS = 280;

/* ---------- Engine ---------- */

export class ScannerEngine {
  private video: HTMLVideoElement;
  private onScan: OnScanCallback;
  private animFrameId: number | null = null;
  private scanning = false;
  
  private nativeDetector: BarcodeDetector | null = null;
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
    this.loop();
  }

  stop(): void {
    this.scanning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }

  isActive(): boolean {
    return this.scanning;
  }

  /* ---- Private ---- */

  private async initDetector(): Promise<void> {
    // 1. Try Native BarcodeDetector First (Hardware Accelerated)
    if ('BarcodeDetector' in window) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const NativeDetector = (window as any).BarcodeDetector;
        this.nativeDetector = new NativeDetector({
          formats: [...SUPPORTED_FORMATS],
        });
        return;
      } catch (e) {
        console.warn('Native BarcodeDetector failed to initialize, falling back to Web Worker.', e);
        this.nativeDetector = null;
      }
    }

    // 2. Fallback to Web Worker for Polyfill (Prevents Main Thread Blocking)
    if (!this.worker) {
      this.worker = new Worker(new URL('./scanner.worker.ts', import.meta.url), {
        type: 'module',
      });

      this.worker.onmessage = (e: MessageEvent) => {
        this.isWorkerBusy = false;
        const result = e.data;
        if (result.success && result.rawValue) {
          this.onScan({
            text: result.rawValue,
            format: getFormatName(result.format),
          });
        }
      };
    }
  }

  private loop(): void {
    let lastTick = 0;

    const tick = (): void => {
      if (!this.scanning) return;

      const now = Date.now();
      if (now - lastTick >= SCAN_INTERVAL_MS) {
        lastTick = now;
        this.decodeFrame();
      }

      this.animFrameId = requestAnimationFrame(tick);
    };

    tick();
  }

  private async decodeFrame(): Promise<void> {
    // Native approach
    if (this.nativeDetector) {
      try {
        const barcodes = await this.nativeDetector.detect(this.video);
        if (barcodes.length > 0) {
          const bc = barcodes[0];
          this.onScan({
            text: bc.rawValue,
            format: getFormatName(bc.format),
          });
        }
      } catch {
        /* No barcode found or error */
      }
      return;
    }

    // Web Worker approach
    if (this.worker && !this.isWorkerBusy) {
      if (this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
        try {
          // Offload image parsing to worker using ImageBitmap
          const bitmap = await createImageBitmap(this.video);
          this.isWorkerBusy = true;
          this.worker.postMessage(bitmap, [bitmap]); // Transfer ownership
        } catch {
          // Video might not be fully ready to capture
        }
      }
    }
  }
}
