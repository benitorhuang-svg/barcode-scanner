import type { ClipboardPort } from '@/application/scanning/ports/ClipboardPort';

export class BrowserClipboardAdapter implements ClipboardPort {
  writeText(text: string): Promise<void> {
    return navigator.clipboard.writeText(text);
  }
}
