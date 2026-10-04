/*
 * Pricing.
 *
 * 1. Billing toggle, for every [data-plans] root on the page:
 *      <div data-plans>
 *        <button type="button" data-billing="month" aria-pressed="true">Month</button>
 *        <button type="button" data-billing="year" aria-pressed="false">Year</button>
 *        <div data-plans-cards>
 *          … <span data-price="month">$499</span><span data-price="year" hidden>$4,490</span> …
 *        </div>
 *      </div>
 *    The lit pill follows aria-pressed at once; the cards fade out (100ms) and back in
 *    (300ms) around the swap, the timing of the reference tabs.
 *
 * 2. Plan pre-fill, on the page that holds the contact form (#contact-message): arriving with
 *    ?plan=growth writes "I am interested in the Growth plan." into the empty message field.
 */
const FADE_OUT = 100;
const FADE_IN = 300;

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function initBillingToggle(root) {
  const buttons = [...root.querySelectorAll('[data-billing]')];
  const cards = root.querySelector('[data-plans-cards]');
  if (!buttons.length) return;

  let current = buttons.find((button) => button.getAttribute('aria-pressed') === 'true')?.dataset.billing;
  let fade = null;

  const showPrices = (period) => {
    for (const price of root.querySelectorAll('[data-price]')) price.hidden = price.dataset.price !== period;
  };

  const select = (period) => {
    if (period === current) return;
    current = period;
    for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.billing === period));

    fade?.cancel();
    fade = null;
    if (!cards?.animate || reducedMotion()) {
      showPrices(period);
      return;
    }

    const fadeOut = cards.animate({ opacity: [1, 0] }, { duration: FADE_OUT, easing: 'ease', fill: 'forwards' });
    fade = fadeOut;
    fadeOut.finished
      .then(() => {
        showPrices(period);
        fade = cards.animate({ opacity: [0, 1] }, { duration: FADE_IN, easing: 'ease' });
        fadeOut.cancel();
      })
      // A cancelled fade means a newer choice took over, and that choice owns the prices.
      .catch(() => {});
  };

  for (const button of buttons) button.addEventListener('click', () => select(button.dataset.billing));
}

const PLAN_NAMES = ['Starter', 'Growth', 'Scale'];

/**
 * Plan pre-fill. The plan buttons link to /contact?plan=growth; on arrival the name is checked
 * against the known plans (the raw parameter never reaches the field) and written into the
 * message, unless the visitor has already typed something there.
 */
function initPlanPrefill() {
  const field = document.getElementById('contact-message');
  if (!field || field.value.trim()) return;

  const requested = new URLSearchParams(window.location.search).get('plan')?.toLowerCase();
  const plan = PLAN_NAMES.find((name) => name.toLowerCase() === requested);
  if (!plan) return;

  field.value = `I am interested in the ${plan} plan.`;
  // Lets forms.js re-validate the field it is watching.
  field.dispatchEvent(new Event('input', { bubbles: true }));
}

export default function initPricing() {
  document.querySelectorAll('[data-plans]').forEach(initBillingToggle);
  initPlanPrefill();
}
