/**
 * Results UI — renders the scan results table and manages
 * the empty state display. Subscribes to the ScanStore.
 */

import { scanStore, type ScanEntry } from '../state/scan-store';
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

  const fragment = document.createDocumentFragment();
  entries.forEach((entry, index) => {
    fragment.appendChild(createResultRow(entry, entries.length - index, index === 0));
  });

  refs.resultsBody.replaceChildren(fragment);
}

function createResultRow(
  entry: ScanEntry,
  displayIndex: number,
  isNewest: boolean,
): HTMLTableRowElement {
  const tr = document.createElement('tr');
  if (isNewest) tr.className = 'row-enter';

  tr.append(
    createCell('col-num', String(displayIndex)),
    createCell('col-time', entry.time),
    createFormatCell(entry.format),
    createCell('col-value', entry.value),
    createActionCell(entry),
  );

  return tr;
}

function createCell(className: string, text: string): HTMLTableCellElement {
  const td = document.createElement('td');
  td.className = className;
  td.textContent = text;
  return td;
}

function createFormatCell(format: string): HTMLTableCellElement {
  const td = document.createElement('td');
  td.className = 'col-format';

  const tag = document.createElement('span');
  tag.className = 'format-tag';
  tag.textContent = format;

  td.append(tag);
  return td;
}

function createActionCell(entry: ScanEntry): HTMLTableCellElement {
  const td = document.createElement('td');
  td.className = 'col-action';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn-icon';
  button.title = '刪除';
  button.dataset.deleteId = String(entry.id);
  button.setAttribute('aria-label', `刪除 ${entry.value}`);
  button.append(createDeleteIcon());

  td.append(button);
  return td;
}

function createDeleteIcon(): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '14');
  svg.setAttribute('height', '14');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');

  const firstLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  firstLine.setAttribute('x1', '18');
  firstLine.setAttribute('y1', '6');
  firstLine.setAttribute('x2', '6');
  firstLine.setAttribute('y2', '18');

  const secondLine = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'line',
  );
  secondLine.setAttribute('x1', '6');
  secondLine.setAttribute('y1', '6');
  secondLine.setAttribute('x2', '18');
  secondLine.setAttribute('y2', '18');

  svg.append(firstLine, secondLine);
  return svg;
}

/** Delegate click events for delete buttons inside the table. */
export function bindDeleteHandler(refs: DomRefs): void {
  refs.resultsBody.addEventListener('click', (event) => {
    const btn = (event.target as HTMLElement).closest<HTMLElement>(
      '[data-delete-id]',
    );
    if (!btn) return;

    const id = Number(btn.dataset.deleteId);
    if (!Number.isNaN(id)) scanStore.remove(id);
  });
}
