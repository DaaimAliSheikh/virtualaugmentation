/*
 * Site header (markup: src/partials/header.html, styles: src/styles/header.css).
 *
 *   1. Keeps the --header-height custom property equal to the rendered height of the
 *      header, so a first section can slide its background underneath the bar.
 *   2. Runs the menu button below 992px. Everything visible is CSS keyed to the button's
 *      aria-expanded attribute; this module only flips that attribute.
 */

/* Tailwind's `lg` breakpoint: from here up the nav sits in the bar and the button is gone. */
const DESKTOP = '(min-width: 62rem)';

function trackHeight(header) {
  if (!('ResizeObserver' in window)) return;

  const root = document.documentElement;
  let current = '';

  // Sizes come with the observer entry, so nothing here forces a layout.
  new ResizeObserver(([entry]) => {
    const height = entry.borderBoxSize?.[0]?.blockSize ?? header.getBoundingClientRect().height;
    const value = `${Math.round(height * 100) / 100}px`;
    if (value === current) return;
    current = value;
    root.style.setProperty('--header-height', value);
  }).observe(header, { box: 'border-box' });
}

function initMenu(header) {
  const toggle = header.querySelector('[data-menu-toggle]');
  const menu = header.querySelector('[data-menu]');
  if (!toggle || !menu) return;

  const isOpen = () => toggle.getAttribute('aria-expanded') === 'true';

  // `animate` lets the CSS slide run. It is on for everything the visitor does and off when
  // the layout itself changes, so the panel never slides during a resize.
  const setOpen = (open, animate = true) => {
    header.toggleAttribute('data-animate', animate);
    toggle.setAttribute('aria-expanded', String(open));
  };

  toggle.addEventListener('click', () => setOpen(!isOpen()));

  // Inside the header: a link in the menu closes it, and so does anything that is not the
  // menu, which includes the sheet the open panel spreads over the first screen. The
  // listener sits on the header itself because iOS Safari only turns a tap on a plain
  // element into a click when something below <body> listens for it.
  header.addEventListener('click', ({ target }) => {
    if (!isOpen() || toggle.contains(target)) return;
    if (!menu.contains(target) || target.closest('a')) setOpen(false);
  });

  // Anywhere else on the page.
  document.addEventListener('click', ({ target }) => {
    if (isOpen() && !header.contains(target)) setOpen(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !isOpen()) return;
    setOpen(false);
    toggle.focus();
  });

  // Keyboard focus moving on to the page closes the menu, so it never covers the focused element.
  header.addEventListener('focusout', ({ relatedTarget }) => {
    if (isOpen() && relatedTarget instanceof Node && !header.contains(relatedTarget)) setOpen(false);
  });

  window.matchMedia(DESKTOP).addEventListener('change', (event) => {
    if (event.matches) setOpen(false, false);
  });
}

export default function initNav() {
  const header = document.querySelector('[data-header]');
  if (!header) return;

  trackHeight(header);
  initMenu(header);
}
