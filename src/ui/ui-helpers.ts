/**
 * UI Helpers — shared utility functions used across UI modules.
 */

import type { DomRefs } from './dom-refs';

/**
 * Get the value of the currently checked radio button from a NodeList.
 * Returns undefined if none is checked.
 */
export function getCheckedRadioValue(
  radios: NodeListOf<HTMLInputElement>,
): string | undefined {
  for (const radio of radios) {
    if (radio.checked) return radio.value;
  }
  return undefined;
}

/**
 * Get the visible label text of the currently checked radio button.
 * Falls back to the provided default if none is found.
 */
export function getCheckedRadioLabel(
  radios: NodeListOf<HTMLInputElement>,
  fallback: string,
): string {
  for (const radio of radios) {
    if (radio.checked) return radio.parentElement?.textContent?.trim() ?? fallback;
  }
  return fallback;
}

/**
 * Update the "last scan" banner with the given scan result.
 * Shared between webcam scanning and image paste scanning.
 */
export function updateLastScanBanner(
  refs: DomRefs,
  text: string,
  format: string,
): void {
  refs.lastScanValue.textContent = text;
  refs.lastScanFormat.textContent = format;
  refs.lastScan.style.display = 'block';
  refs.lastScan.style.animation = 'none';
  void refs.lastScan.offsetWidth; // force reflow to restart animation
  refs.lastScan.style.animation = '';
}
