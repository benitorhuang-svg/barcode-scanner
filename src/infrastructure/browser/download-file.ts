const DEFAULT_OBJECT_URL_REVOKE_DELAY_MS = 5000;

function triggerDownload(url: string, filename: string): void {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
}

export function downloadBlob(
  blob: Blob,
  filename: string,
  revokeDelayMs = DEFAULT_OBJECT_URL_REVOKE_DELAY_MS,
): void {
  const url = URL.createObjectURL(blob);
  triggerDownload(url, filename);
  window.setTimeout(() => URL.revokeObjectURL(url), revokeDelayMs);
}

export function downloadDataUrl(dataUrl: string, filename: string): void {
  triggerDownload(dataUrl, filename);
}

export function downloadTextFile(
  content: string,
  mimeType: string,
  filename: string,
): void {
  downloadBlob(new Blob([content], { type: mimeType }), filename);
}
