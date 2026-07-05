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

function getAll<T extends HTMLElement>(selector: string): NodeListOf<T> {
  const elements = document.querySelectorAll<T>(selector);
  if (elements.length === 0) {
    throw new Error(`No elements found for selector ${selector}`);
  }
  return elements;
}

export function getDomRefs() {
  return {
    tabs: getAll<HTMLButtonElement>('.tab-btn'),
    tabPanes: getAll<HTMLElement>('.tab-pane'),

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

    pasteZone: getEl<HTMLDivElement>('pasteZone'),
    fileInput: getEl<HTMLInputElement>('fileInput'),
    pastePreview: getEl<HTMLImageElement>('pastePreview'),

    qrInput: getEl<HTMLTextAreaElement>('qrInput'),
    btnGenerateQR: getEl<HTMLButtonElement>('btnGenerateQR'),
    btnDownloadQR: getEl<HTMLButtonElement>('btnDownloadQR'),
    qrPreviewWrap: getEl<HTMLDivElement>('qrPreviewWrap'),
    qrCanvas: getEl<HTMLCanvasElement>('qrCanvas'),

    toast: getEl<HTMLDivElement>('toast'),
  };
}

export type DomRefs = ReturnType<typeof getDomRefs>;
