import type { DomRefs } from './dom-refs';

export function initTabsUI(refs: DomRefs): void {
  const tabs = Array.from(refs.tabs);
  const panes = Array.from(refs.tabPanes);
  const panesById = new Map(panes.map((pane) => [pane.id, pane]));

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      if (tab.classList.contains('active')) return;

      const targetTab = tab.dataset.tab;
      if (!targetTab) return;

      // Remove active from all
      tabs.forEach((t) => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      panes.forEach((p) => p.classList.remove('active'));

      // Add active to clicked tab
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');

      // Add active to target pane
      const targetId = `tab-${targetTab}`;
      const targetPane = panesById.get(targetId);
      if (targetPane) {
        targetPane.classList.add('active');
      }

      // Dispatch event for other modules (e.g., to pause camera)
      document.dispatchEvent(
        new CustomEvent('tabchange', { detail: { tab: targetTab } }),
      );

      // Toggle right column sections
      if (targetTab === 'generator') {
        refs.scanResultsSection.style.display = 'none';
        refs.generatorResultSection.style.display = 'flex';
      } else {
        refs.scanResultsSection.style.display = 'flex';
        refs.generatorResultSection.style.display = 'none';
      }
    });
  });
}

