/**
 * Toast notification UI — lightweight, non-blocking feedback.
 */

const TOAST_DURATION_MS = 2500;
let toastTimer: ReturnType<typeof setTimeout> | null = null;
let toastElement: HTMLDivElement | null = null;

export function initToast(element: HTMLDivElement): void {
  toastElement = element;
}

export function showToast(msg: string): void {
  const toast = toastElement;
  if (!toast) return;

  toast.textContent = msg;
  toast.classList.add('show');

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), TOAST_DURATION_MS);
}
