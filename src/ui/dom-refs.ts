/**
 * DOM References — centralized element query module.
 * All getElementById / querySelector calls live here to avoid
 * scattered DOM queries across the codebase.
 */

function getEl<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Element #${id} not found`);
  return el as T;
}

export function getDomRefs() {
  return {
    video: getEl<HTMLVideoElement>('videoElement'),
    videoContainer: getEl<HTMLDivElement>('videoContainer'),
    videoPlaceholder: getEl<HTMLDivElement>('videoPlaceholder'),
    scanOverlay: getEl<HTMLDivElement>('scanOverlay'),

    btnStart: getEl<HTMLButtonElement>('btnStart'),
    btnStop: getEl<HTMLButtonElement>('btnStop'),

    statusBadge: getEl<HTMLSpanElement>('statusBadge'),

    lastScan: getEl<HTMLDivElement>('lastScan'),
    lastScanValue: getEl<HTMLSpanElement>('lastScanValue'),
    lastScanFormat: getEl<HTMLSpanElement>('lastScanFormat'),

    resultsBody: getEl<HTMLTableSectionElement>('resultsBody'),
    resultsTable: getEl<HTMLTableElement>('resultsTable'),
    emptyState: getEl<HTMLDivElement>('emptyState'),
    countBadge: getEl<HTMLSpanElement>('countBadge'),

    btnCopy: getEl<HTMLButtonElement>('btnCopy'),
    btnExport: getEl<HTMLButtonElement>('btnExport'),
    btnClear: getEl<HTMLButtonElement>('btnClear'),

    chkSound: getEl<HTMLInputElement>('chkSound'),
    chkDuplicate: getEl<HTMLInputElement>('chkDuplicate'),
    // Generator
    qrInput: document.getElementById('qrInput') as HTMLTextAreaElement,
    btnGenerateQR: document.getElementById('btnGenerateQR') as HTMLButtonElement,
    btnDownloadQR: document.getElementById('btnDownloadQR') as HTMLButtonElement,
    qrPreviewWrap: document.getElementById('qrPreviewWrap') as HTMLElement,
    qrCanvas: document.getElementById('qrCanvas') as HTMLCanvasElement,
  };
}

export type DomRefs = ReturnType<typeof getDomRefs>;
