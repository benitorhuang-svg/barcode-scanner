/**
 * Results UI — renders the scan results table and manages
 * the empty state display. Subscribes to the ScanRepository.
 */

import { scanRepository } from '@/composition-root';
import type { ScanRecord } from '@/domain/scanning/ScanRecord';
import type { DomRefs } from './dom-refs';
import { updateLastScanBanner } from './ui-helpers';

let hasRenderedResults = false;
let newestRenderedRecordId: string | null = null;

/** Wire up the store subscription to re-render on state changes. */
export function initResultsUI(refs: DomRefs): void {
  scanRepository.subscribe(() => {
    renderResults(refs);
  });
  renderResults(refs);
}

function renderResults(refs: DomRefs): void {
  const entries = scanRepository.getAll();
  updateResultsChrome(refs, entries.length);
  updateLatestScanFeedback(refs, entries);

  const fragment = document.createDocumentFragment();
  entries.forEach((entry, index) => {
    // Array is newest first, so we reverse index for display
    fragment.appendChild(createResultRow(entry, entries.length - index, index === 0));
  });

  refs.resultsBody.replaceChildren(fragment);
}

function updateLatestScanFeedback(
  refs: DomRefs,
  entries: readonly ScanRecord[],
): void {
  const newestRecord = entries[0] ?? null;

  if (!hasRenderedResults) {
    newestRenderedRecordId = newestRecord?.id ?? null;
    hasRenderedResults = true;
    return;
  }

  if (!newestRecord) {
    newestRenderedRecordId = null;
    return;
  }

  if (newestRecord.id === newestRenderedRecordId) return;

  newestRenderedRecordId = newestRecord.id;
  updateLastScanBanner(
    refs,
    newestRecord.barcode.text,
    newestRecord.barcode.format,
  );
  flashVideoContainer();
}

function flashVideoContainer(): void {
  const videoContainer = document.getElementById('videoContainer');
  if (!videoContainer) return;

  videoContainer.classList.remove('flash');
  void videoContainer.offsetWidth;
  videoContainer.classList.add('flash');
}

function updateResultsChrome(refs: DomRefs, count: number): void {
  const hasData = count > 0;

  refs.resultsTable.style.display = hasData ? 'table' : 'none';
  refs.emptyState.style.display = hasData ? 'none' : 'flex';
  refs.countBadge.textContent = `${count} 筆`;

  refs.btnCopy.disabled = !hasData;
  refs.btnExport.disabled = !hasData;
  refs.btnClear.disabled = !hasData;
}

function createResultRow(
  entry: ScanRecord,
  displayIndex: number,
  isNewest: boolean,
): HTMLTableRowElement {
  const tr = document.createElement('tr');
  tr.dataset.entryId = entry.id;
  if (isNewest) tr.className = 'row-enter';

  const timeStr = entry.timestamp.toLocaleTimeString('zh-TW', { hour12: false });

  tr.append(
    createCell('col-num', String(displayIndex)),
    createCell('col-time', timeStr),
    createFormatCell(entry.barcode.format),
    createCell('col-value', entry.barcode.text),
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

function createActionCell(entry: ScanRecord): HTMLTableCellElement {
  const td = document.createElement('td');
  td.className = 'col-action';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn-icon';
  button.title = '刪除';
  button.dataset.deleteId = entry.id;
  button.setAttribute('aria-label', `刪除 ${entry.barcode.text}`);
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

    // We don't have delete functionality right now as it isn't part of the core DDD requirements, 
    // but typically we would call: scanRepository.remove(btn.dataset.deleteId);
    // For now we'll just ignore it or we can add it to the repo later.
  });
}
