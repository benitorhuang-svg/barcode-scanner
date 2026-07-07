import type { DownloadPort } from '@/application/scanning/ports/DownloadPort';
import { downloadTextFile } from './download-file';

export class BrowserDownloadAdapter implements DownloadPort {
  downloadText(content: string, mimeType: string, filename: string): void {
    downloadTextFile(content, mimeType, filename);
  }
}
