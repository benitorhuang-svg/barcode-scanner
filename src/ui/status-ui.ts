/**
 * Status UI — controls header status badge appearance.
 */

import type { DomRefs } from './dom-refs';

export function setStatusActive(refs: DomRefs): void {
  renderStatus(refs, '掃描中…', true);
}

export function setStatusIdle(refs: DomRefs): void {
  renderStatus(refs, '待機中', false);
}

function renderStatus(refs: DomRefs, text: string, active: boolean): void {
  const dot = document.createElement('span');
  dot.className = 'status-dot';

  refs.statusBadge.classList.toggle('active', active);
  refs.statusBadge.replaceChildren(dot, document.createTextNode(text));
}
