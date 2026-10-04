/*
 * Scroll reveal. Markup contract and tunables are documented next to the styles in
 * src/styles/components.css ("Scroll reveal").
 *
 * A [data-reveal-group] reveals all of its [data-reveal] descendants at once, as soon as
 * any part of the group enters the viewport. A [data-reveal] outside a group reveals on
 * its own. Each element is revealed once and never hidden again.
 */
const REVEALED = 'is-revealed';

function reveal(target) {
  const items = target.matches('[data-reveal-group]')
    ? [...target.querySelectorAll('[data-reveal]')].filter((item) => item.closest('[data-reveal-group]') === target)
    : [target];
  for (const item of items) item.classList.add(REVEALED);
}

export default function initReveal() {
  const targets = [
    ...document.querySelectorAll('[data-reveal-group]'),
    ...[...document.querySelectorAll('[data-reveal]')].filter((item) => !item.closest('[data-reveal-group]')),
  ];
  if (!targets.length) return;

  if (!('IntersectionObserver' in window)) {
    targets.forEach(reveal);
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      reveal(entry.target);
      observer.unobserve(entry.target);
    }
  });

  targets.forEach((target) => observer.observe(target));
}
