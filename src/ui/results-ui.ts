/**
 * Results UI — renders the scan results table and manages
 * the empty state display. Subscribes to the ScanStore.
 */

import { scanStore } from '../state/scan-store';
import { escapeHtml } from '../utils/helpers';
import type { DomRefs } from './dom-refs';

/** Wire up the store subscription to re-render on state changes. */
export function initResultsUI(refs: DomRefs): void {
  scanStore.subscribe(() => renderResults(refs));
  renderResults(refs);
}

function renderResults(refs: DomRefs): void {
  const entries = scanStore.getAll();
  const hasData = entries.length > 0;

  refs.resultsTable.style.display = hasData ? 'table' : 'none';
  refs.emptyState.style.display = hasData ? 'none' : 'flex';
  refs.countBadge.textContent = `${entries.length} 筆`;

  refs.btnCopy.disabled = !hasData;
  refs.btnExport.disabled = !hasData;
  refs.btnClear.disabled = !hasData;

  refs.resultsBody.innerHTML = '';
  const fragment = document.createDocumentFragment();

  entries.forEach((entry, i) => {
    const tr = document.createElement('tr');
    if (i === 0) tr.className = 'row-enter';

    tr.innerHTML = `
      <td class="col-num">${entries.length - i}</td>
      <td class="col-time">${entry.time}</td>
      <td class="col-format"><span class="format-tag">${escapeHtml(entry.format)}</span></td>
      <td class="col-value">${escapeHtml(entry.value)}</td>
      <td class="col-action">
        <button class="btn-icon" title="刪除" data-delete-id="${entry.id}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </td>
    `;
    fragment.appendChild(tr);
  });

  refs.resultsBody.appendChild(fragment);
}

/** Delegate click events for delete buttons inside the table. */
export function bindDeleteHandler(refs: DomRefs): void {
  refs.resultsBody.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>(
      '[data-delete-id]',
    );
    if (!btn) return;

    const id = Number(btn.dataset.deleteId);
    if (!isNaN(id)) scanStore.remove(id);
  });
}
