export interface DownloadPort {
  downloadText(content: string, mimeType: string, filename: string): void;
}
