export function initTabsUI(): void {
  const tabs = document.querySelectorAll<HTMLButtonElement>('.tab-btn');
  const panes = document.querySelectorAll<HTMLElement>('.tab-pane');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      // Remove active from all
      tabs.forEach((t) => t.classList.remove('active'));
      panes.forEach((p) => p.classList.remove('active'));

      // Add active to clicked tab
      tab.classList.add('active');

      // Add active to target pane
      const targetTab = tab.dataset.tab;
      const targetId = `tab-${targetTab}`;
      const targetPane = document.getElementById(targetId);
      if (targetPane) {
        targetPane.classList.add('active');
      }

      // Dispatch event for other modules (e.g., to pause camera)
      document.dispatchEvent(
        new CustomEvent('tabchange', { detail: { tab: targetTab } }),
      );
    });
  });
}
