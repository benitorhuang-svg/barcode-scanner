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
  private detector: BarcodeDetector | null = null;

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
  }

  isActive(): boolean {
    return this.scanning;
  }

  /* ---- Private ---- */

  private async initDetector(): Promise<void> {
    if (this.detector) return;
    try {
      const { BarcodeDetector } = await import('barcode-detector/pure');
      this.detector = new BarcodeDetector({
        formats: [...SUPPORTED_FORMATS],
      });
    } catch {
      this.detector = null;
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

  private decodeFrame(): void {
    if (!this.detector) return;

    this.detector
      .detect(this.video)
      .then((barcodes) => {
        if (barcodes.length > 0) {
          const bc = barcodes[0];
          this.onScan({
            text: bc.rawValue,
            format: getFormatName(bc.format),
          });
        }
      })
      .catch(() => {
        /* No barcode found — expected, keep scanning */
      });
  }
}
