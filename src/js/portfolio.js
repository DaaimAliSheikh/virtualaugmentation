/*
 * Portfolio filter (/portfolio#projects).
 *
 *   [data-portfolio]                      the section's content root
 *     button[data-filter="<category>"]    filter buttons ("all" shows everything); state = aria-pressed
 *     [data-project][data-category]       project cards; non-matching ones get the hidden attribute
 *     [data-filter-status]                visually hidden live region that announces the result
 *
 * Without JS the filter bar is not shown and every project is visible.
 */
export default function initPortfolio() {
  const root = document.querySelector('[data-portfolio]');
  if (!root) return;

  const buttons = [...root.querySelectorAll('button[data-filter]')];
  const projects = [...root.querySelectorAll('[data-project]')];
  const status = root.querySelector('[data-filter-status]');
  if (!buttons.length || !projects.length) return;

  function apply(button) {
    const filter = button.dataset.filter;
    let shown = 0;

    for (const project of projects) {
      const match = filter === 'all' || project.dataset.category === filter;
      project.hidden = !match;
      if (match) shown += 1;
    }

    for (const other of buttons) other.setAttribute('aria-pressed', String(other === button));

    if (status) status.textContent = `Showing ${shown} of ${projects.length} projects: ${button.textContent.trim()}`;
  }

  for (const button of buttons) {
    button.addEventListener('click', () => {
      if (button.getAttribute('aria-pressed') !== 'true') apply(button);
    });
  }
}
