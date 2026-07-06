/**
 * Main entry point — bootstraps the application.
 * Wires up DOM refs, event listeners, and initializes UI modules.
 */

import './styles/tokens.css';
import './styles/fonts.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/scanner.css';
import './styles/generator.css';
import './styles/results.css';
import './styles/components.css';
import './styles/paste.css';
import './styles/animations.css';

import { getDomRefs, type DomRefs } from './ui/dom-refs';
import { initResultsUI, bindDeleteHandler } from './ui/results-ui';
import { initPasteUI } from './ui/paste-ui';
import { initTabsUI } from './ui/tabs-ui';
import { initToast } from './ui/toast';

type ScannerModule = typeof import('./ui/scanner-ui');
type ExportModule = typeof import('./ui/export');

let generatorUILoadPromise: Promise<void> | null = null;
let isGeneratorUIReady = false;
let scannerModulePromise: Promise<ScannerModule> | null = null;
let scannerModule: ScannerModule | null = null;
let scannerStartSequence = 0;
let isScannerRequested = false;
let exportModulePromise: Promise<ExportModule> | null = null;

function loadScannerModule(): Promise<ScannerModule> {
  scannerModulePromise ??= import('./ui/scanner-ui')
    .then((module) => {
      scannerModule = module;
      return module;
    })
    .catch((error) => {
      scannerModulePromise = null;
      throw error;
    });
  return scannerModulePromise;
}

function startScannerFromUI(refs: DomRefs): void {
  const sequence = ++scannerStartSequence;
  isScannerRequested = true;
  refs.btnStart.disabled = true;
  refs.btnStop.disabled = false;

  void loadScannerModule()
    .then((module) => {
      if (!isScannerRequested || sequence !== scannerStartSequence) {
        module.stopScanner(refs);
        return;
      }

      void module.startScanner(refs);
    })
    .catch((error) => {
      isScannerRequested = false;
      refs.btnStart.disabled = false;
      refs.btnStop.disabled = true;
      if (import.meta.env.DEV) {
        console.error('Scanner UI failed to load:', error);
      }
    });
}

function stopScannerFromUI(refs: DomRefs): void {
  isScannerRequested = false;
  scannerStartSequence += 1;

  if (scannerModule) {
    scannerModule.stopScanner(refs);
    return;
  }

  refs.btnStart.disabled = false;
  refs.btnStop.disabled = true;
}

function loadExportModule(): Promise<ExportModule> {
  exportModulePromise ??= import('./ui/export').catch((error) => {
    exportModulePromise = null;
    throw error;
  });
  return exportModulePromise;
}

function ensureGeneratorUI(refs: DomRefs): void {
  if (isGeneratorUIReady || generatorUILoadPromise) return;

  generatorUILoadPromise = import('./ui/generator-ui')
    .then(({ initGeneratorUI }) => {
      initGeneratorUI(refs);
      isGeneratorUIReady = true;
    })
    .catch((error) => {
      generatorUILoadPromise = null;
      if (import.meta.env.DEV) {
        console.error('Generator UI failed to load:', error);
      }
    });
}

function runWhenIdle(task: () => void): void {
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(task, { timeout: 4000 });
    return;
  }

  globalThis.setTimeout(task, 1500);
}

function registerPWAWhenIdle(): void {
  runWhenIdle(() => {
    void import('virtual:pwa-register')
      .then(({ registerSW }) => {
        registerSW({
          immediate: true,
          onRegistered(r) {
            if (import.meta.env.DEV) {
              console.info('PWA SW Registered:', r);
            }
            if (r) {
              // 定期檢查更新 (每小時)
              setInterval(() => {
                r.update().catch(() => {});
              }, 60 * 60 * 1000);

              // 當使用者切換回此分頁時立即檢查更新
              document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') {
                  r.update().catch(() => {});
                }
              });
            }
          },
          onRegisterError(error) {
            if (import.meta.env.DEV) {
              console.error('PWA SW Registration Error:', error);
            }
          },
        });
      })
      .catch((error) => {
        if (import.meta.env.DEV) {
          console.error('PWA registration module failed to load:', error);
        }
      });
  });
}

function main(): void {
  const refs = getDomRefs();

  initToast(refs.toast);

  // Initialize UI components
  initTabsUI(refs);

  // Global Font Size Controls
  let currentFontScale = 1.0;
  const updateFontSize = (delta: number) => {
    currentFontScale = Math.max(0.8, Math.min(2.0, currentFontScale + delta));
    document.documentElement.style.setProperty('--font-scale', currentFontScale.toString());
  };
  refs.btnFontDec.addEventListener('click', () => updateFontSize(-0.1));
  refs.btnFontInc.addEventListener('click', () => updateFontSize(0.1));

  // Scanner controls
  refs.btnStart.addEventListener('click', () => startScannerFromUI(refs));
  refs.btnStop.addEventListener('click', () => stopScannerFromUI(refs));

  // Resource Management: Stop camera when switching tabs to save battery
  document.addEventListener('tabchange', (e) => {
    const tab = (e as CustomEvent).detail.tab;
    if (tab !== 'webcam') {
      stopScannerFromUI(refs);
    }
    if (tab === 'generator') {
      ensureGeneratorUI(refs);
    }
  });

  // Resource Management: Pause camera when page is hidden (minimized or background tab)
  let wasRunningBeforeHidden = false;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // If btnStart is disabled, it means the scanner is currently running
      wasRunningBeforeHidden = refs.btnStart.disabled;
      if (wasRunningBeforeHidden) {
        stopScannerFromUI(refs);
      }
    } else {
      // Page became visible again
      if (wasRunningBeforeHidden && document.querySelector('.tab-btn[data-tab="webcam"]')?.classList.contains('active')) {
        startScannerFromUI(refs);
      }
    }
  });

  // Action buttons
  refs.btnCopy.addEventListener('click', () => {
    void loadExportModule().then(({ copyAll }) => copyAll());
  });
  refs.btnExport.addEventListener('click', () => {
    void loadExportModule().then(({ exportCSV }) => exportCSV());
  });
  refs.btnClear.addEventListener('click', () => {
    void loadExportModule().then(({ clearAll }) => {
      clearAll();
      refs.lastScan.style.display = 'none';
    });
  });

  // Results table
  initResultsUI(refs);
  bindDeleteHandler(refs);

  // Paste / drop image scanning
  initPasteUI(refs);

  // Register PWA Service Worker
  registerPWAWhenIdle();
}

document.addEventListener('DOMContentLoaded', main);
