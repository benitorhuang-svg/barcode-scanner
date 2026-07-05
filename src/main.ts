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

import { getDomRefs } from './ui/dom-refs';
import { startScanner, stopScanner } from './ui/scanner-ui';
import { initResultsUI, bindDeleteHandler } from './ui/results-ui';
import { copyAll, exportCSV, clearAll } from './ui/export';
import { initPasteUI } from './ui/paste-ui';
import { initGeneratorUI } from './ui/generator-ui';
import { initTabsUI } from './ui/tabs-ui';
import { initToast } from './ui/toast';
import { registerSW } from 'virtual:pwa-register';

function main(): void {
  const refs = getDomRefs();

  initToast(refs.toast);

  // Initialize UI components
  initTabsUI(refs);

  // Global Font Size Controls
  let currentFontSize = 100; // Percentage
  const updateFontSize = (delta: number) => {
    currentFontSize = Math.max(80, Math.min(150, currentFontSize + delta));
    document.documentElement.style.fontSize = `${currentFontSize}%`;
  };
  refs.btnFontDec.addEventListener('click', () => updateFontSize(-10));
  refs.btnFontInc.addEventListener('click', () => updateFontSize(10));

  // Scanner controls
  refs.btnStart.addEventListener('click', () => startScanner(refs));
  refs.btnStop.addEventListener('click', () => stopScanner(refs));

  // Resource Management: Stop camera when switching tabs to save battery
  document.addEventListener('tabchange', (e) => {
    const tab = (e as CustomEvent).detail.tab;
    if (tab !== 'webcam') {
      stopScanner(refs);
    }
  });

  // Action buttons
  refs.btnCopy.addEventListener('click', copyAll);
  refs.btnExport.addEventListener('click', exportCSV);
  refs.btnClear.addEventListener('click', () => {
    clearAll();
    refs.lastScan.style.display = 'none';
  });

  // Results table
  initResultsUI(refs);
  bindDeleteHandler(refs);

  // Paste / drop image scanning
  initPasteUI(refs);

  // QR Code Generator
  initGeneratorUI(refs);

  // Register PWA Service Worker
  registerSW({
    immediate: true,
    onRegistered(r) {
      if (import.meta.env.DEV) {
        console.info('PWA SW Registered:', r);
      }
    },
    onRegisterError(error) {
      if (import.meta.env.DEV) {
        console.error('PWA SW Registration Error:', error);
      }
    },
  });
}

document.addEventListener('DOMContentLoaded', main);
