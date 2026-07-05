/**
 * Status UI — controls header status badge appearance.
 */

import type { DomRefs } from './dom-refs';

export function setStatusActive(refs: DomRefs): void {
  refs.statusBadge.classList.add('active');
  refs.statusBadge.innerHTML =
    '<span class="status-dot"></span> 掃描中…';
}

export function setStatusIdle(refs: DomRefs): void {
  refs.statusBadge.classList.remove('active');
  refs.statusBadge.innerHTML =
    '<span class="status-dot"></span> 待機中';
}
