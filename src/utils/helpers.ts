/**
 * Utility helpers — small, pure functions used across modules.
 */

/** Escape HTML special characters to prevent XSS in dynamic content. */
export function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
