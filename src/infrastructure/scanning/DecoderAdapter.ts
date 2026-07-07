import { BarcodeData } from '@/domain/scanning/BarcodeData';
import type {
  BarcodeDecoderPort,
  DecodeResult,
} from '@/application/scanning/ports/BarcodeDecoderPort';

/**
 * Adapter that encapsulates the Web Worker communication for barcode decoding.
 */
export class DecoderAdapter implements BarcodeDecoderPort {
  private worker: Worker;

  constructor() {
    this.worker = new Worker(new URL('./DecoderWorker.ts', import.meta.url), {
      type: 'module',
    });
  }

  /**
   * Decodes an ImageBitmap by sending it to the Web Worker.
   * Transfers ownership of the ImageBitmap to the worker.
   */
  async decode(bitmap: ImageBitmap): Promise<DecodeResult> {
    return new Promise((resolve) => {
      const onMessage = (event: MessageEvent) => {
        this.worker.removeEventListener('message', onMessage);
        this.worker.removeEventListener('error', onError);

        const data = event.data;
        if (data.success && data.rawValue) {
          resolve({
            success: true,
            barcode: new BarcodeData(data.rawValue, data.format),
          });
        } else {
          resolve({ success: false, error: data.error });
        }
      };

      const onError = (error: ErrorEvent) => {
        this.worker.removeEventListener('message', onMessage);
        this.worker.removeEventListener('error', onError);
        resolve({ success: false, error: error.message });
      };

      this.worker.addEventListener('message', onMessage);
      this.worker.addEventListener('error', onError);

      this.worker.postMessage(bitmap, [bitmap]);
    });
  }

  destroy(): void {
    this.worker.terminate();
  }
}
