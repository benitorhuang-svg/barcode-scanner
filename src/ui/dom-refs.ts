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

    btnFontDec: getEl<HTMLButtonElement>('btnFontDec'),
    btnFontInc: getEl<HTMLButtonElement>('btnFontInc'),

    video: getEl<HTMLVideoElement>('videoElement'),
    videoContainer: getEl<HTMLDivElement>('videoContainer'),
    videoPlaceholder: getEl<HTMLDivElement>('videoPlaceholder'),
    scanOverlay: getEl<HTMLDivElement>('scanOverlay'),

    btnStart: getEl<HTMLButtonElement>('btnStart'),
    btnStop: getEl<HTMLButtonElement>('btnStop'),

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
    pastePrompt: getEl<HTMLDivElement>('pastePrompt'),
    pastePreviewWrap: getEl<HTMLDivElement>('pastePreviewWrap'),
    pastePreview: getEl<HTMLImageElement>('pastePreview'),
    btnClearPaste: getEl<HTMLButtonElement>('btnClearPaste'),
    fileInput: getEl<HTMLInputElement>('fileInput'),

    qrInput: getEl<HTMLTextAreaElement>('qrInput'),
    formatRadios: getAll<HTMLInputElement>('input[name="format"]'),
    fgColor: getEl<HTMLInputElement>('fgColor'),
    bgColor: getEl<HTMLInputElement>('bgColor'),
    marginInput: getEl<HTMLInputElement>('marginInput'),
    marginValue: getEl<HTMLSpanElement>('marginValue'),
    btnMarginDec: getEl<HTMLButtonElement>('btnMarginDec'),
    btnMarginInc: getEl<HTMLButtonElement>('btnMarginInc'),
    appearancePreviewCanvas: getEl<HTMLCanvasElement>('appearancePreviewCanvas'),
    qrSettings: getEl<HTMLElement>('qrSettings'),
    errorCorrectionRadios: getAll<HTMLInputElement>('input[name="errorCorrection"]'),
    logoInput: getEl<HTMLInputElement>('logoInput'),
    btnRemoveLogo: getEl<HTMLButtonElement>('btnRemoveLogo'),
    logoUploadZone: getEl<HTMLDivElement>('logoUploadZone'),
    logoUploadPrompt: getEl<HTMLDivElement>('logoUploadPrompt'),
    logoPreviewWrap: getEl<HTMLDivElement>('logoPreviewWrap'),
    logoPreviewImg: getEl<HTMLImageElement>('logoPreviewImg'),
    dlFormatRadios: getAll<HTMLInputElement>('input[name="dlFormat"]'),
    dlSizeRadios: getAll<HTMLInputElement>('input[name="dlSize"]'),
    downloadSection: getEl<HTMLDivElement>('downloadSection'),

    summaryFormat: getEl<HTMLSpanElement>('summaryFormat'),
    summaryAppearance: getEl<HTMLSpanElement>('summaryAppearance'),
    summaryQR: getEl<HTMLSpanElement>('summaryQR'),
    summaryDownload: getEl<HTMLSpanElement>('summaryDownload'),
    summaryOuter: getEl<HTMLSpanElement>('summaryOuter'),
    
    btnDownloadQR: getEl<HTMLButtonElement>('btnDownloadQR'),
    qrPreviewWrap: getEl<HTMLDivElement>('qrPreviewWrap'),
    qrCanvas: getEl<HTMLCanvasElement>('qrCanvas'),
    qrEmptyState: getEl<HTMLDivElement>('qrEmptyState'),

    scanResultsSection: getEl<HTMLElement>('scanResultsSection'),
    generatorResultSection: getEl<HTMLElement>('generatorResultSection'),

    toast: getEl<HTMLDivElement>('toast'),
  };
}

export type DomRefs = ReturnType<typeof getDomRefs>;
