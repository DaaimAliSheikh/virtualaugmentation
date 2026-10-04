/*
 * Forms: one handler for every <form data-form> on the site (the footer "Let's talk"
 * banner, the form on the Contact page, and any form added later).
 *
 * Markup contract
 *
 *   <form data-form data-endpoint="/api/contact" data-subject="…" action="mailto:…"
 *         method="post" enctype="text/plain">
 *     <label for="contact-email">Email address</label>
 *     <input id="contact-email" name="email" type="email" required>
 *     <input type="text" name="website" tabindex="-1" autocomplete="off" class="hidden" aria-hidden="true">
 *     <button type="submit" data-form-submit>Send your message</button>
 *   </form>
 *   <div data-form-success hidden role="status">…</div>
 *   <div data-form-error hidden role="alert">…</div>
 *
 * Behaviour
 *
 *   Validation  Required fields and the email format are checked on submit, and when a field
 *               that holds a value loses focus. A failing field gets aria-invalid plus an error
 *               line linked through aria-describedby; the first one receives focus. The line is
 *               the element with the id "<field id>-error" when the page provides one (to decide
 *               where it sits and how it looks), otherwise a <p> is created right after the field.
 *               Wording: data-error-required / data-error-invalid on the field, else the
 *               defaults below. Native validation bubbles are switched off here (noValidate),
 *               so the markup may leave "novalidate" out and keep browser validation as the
 *               fallback when scripts do not run.
 *   Sending     data-endpoint is a same-origin path (/api/contact, the site's own serverless
 *               function) or an http(s) URL: the fields are POSTed as JSON and a 2xx answer
 *               without { "ok": false } counts as success. name, email, subject and message
 *               travel under those keys; any other field (phone, …) is appended to the message
 *               as a "Label: value" line; hidden inputs supply defaults for a short form.
 *               data-subject becomes the subject. Two anti-spam values go along: "startedAt"
 *               (when the form was set up) and "elapsed" (milliseconds the visitor spent before
 *               sending). Meanwhile the submit button is disabled and reads "Please wait…"
 *               (or its data-wait text).
 *               No endpoint: the visitor's mail app opens through a composed mailto: URL
 *               (address from the form's action, subject from data-subject, one "Label: value"
 *               line per filled field).
 *   Result      Success replaces the form with [data-form-success]; failure shows
 *               [data-form-error] and leaves the form ready for another try. Focus moves to
 *               whichever message appears.
 *   Honeypot    A filled "website" field means a bot: nothing is sent, success is shown.
 *   No JS       The plain mailto: action still works.
 */

const HONEYPOT = 'website';
/** Keys the contact endpoint reads; every other field is folded into the message. */
const CORE_FIELDS = ['name', 'email', 'subject', 'message'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TIMEOUT_MS = 15000;
const WAIT_LABEL = 'Please wait…';
const ERROR_LINE_CLASSES = 'mt-2 text-small text-danger';

/** Default error wording, keyed by field name. */
const MESSAGES = {
  required: {
    name: 'Please enter your name.',
    email: 'Please enter your email address.',
    message: 'Please tell us what you need help with.',
    fallback: 'Please fill in this field.',
  },
  invalid: {
    email: 'Please enter a valid email address, like name@company.com.',
    phone: 'Please enter a valid phone number.',
    fallback: 'Please check this field.',
  },
};

let generatedIds = 0;

/** The controls a visitor fills in: no buttons, no hidden inputs, not the honeypot. */
function fieldsOf(form) {
  return [...form.elements].filter(
    (el) =>
      el.matches('input, select, textarea') &&
      !el.matches('[type="hidden"], [type="submit"], [type="button"], [type="reset"], [type="image"]') &&
      el.name &&
      el.name !== HONEYPOT &&
      !el.disabled,
  );
}

/** What the visitor entered: trimmed, and empty for an unticked checkbox or radio. */
function valueOf(field) {
  if ((field.type === 'checkbox' || field.type === 'radio') && !field.checked) return '';
  return field.value.trim();
}

/** Human name of a field, taken from its label. */
function labelOf(field) {
  const text = field.labels?.[0]?.textContent || field.getAttribute('aria-label') || field.name;
  return text
    .replace(/\(optional\)/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Returns the error message for a field, or an empty string when it is fine. */
function problemWith(field) {
  const value = valueOf(field);
  let kind = null;
  if (field.validity.valueMissing || (field.required && !value)) kind = 'required';
  else if (value && ((field.type === 'email' && !EMAIL.test(value)) || !field.validity.valid)) kind = 'invalid';
  if (!kind) return '';

  const custom = kind === 'required' ? field.dataset.errorRequired : field.dataset.errorInvalid;
  return custom || MESSAGES[kind][field.name] || MESSAGES[kind].fallback;
}

/** The error line of a field: the page's own "<id>-error" element, or one created on demand. */
function errorLineOf(field, create) {
  if (!field.id) {
    if (!create) return null;
    field.id = `form-field-${++generatedIds}`;
  }
  const id = `${field.id}-error`;
  let line = document.getElementById(id);
  if (!line && create) {
    line = document.createElement('p');
    line.id = id;
    line.className = ERROR_LINE_CLASSES;
    field.after(line);
  }
  return line;
}

/** Shows (or, with an empty message, clears) the error state of a field. */
function report(field, message) {
  const line = errorLineOf(field, Boolean(message));
  if (!line) return;

  line.textContent = message;
  line.hidden = !message;

  const described = new Set((field.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean));
  if (message) {
    described.add(line.id);
    field.setAttribute('aria-invalid', 'true');
  } else {
    described.delete(line.id);
    field.removeAttribute('aria-invalid');
  }
  if (described.size) field.setAttribute('aria-describedby', [...described].join(' '));
  else field.removeAttribute('aria-describedby');
}

/** Validates one field, updates its error state and returns the message ('' when valid). */
function check(field) {
  const message = problemWith(field);
  report(field, message);
  return message;
}

/** First match among the elements that follow the form (the success and error blocks). */
function blockAfter(form, selector) {
  for (let el = form.nextElementSibling; el && !el.matches('form'); el = el.nextElementSibling) {
    if (el.matches(selector)) return el;
  }
  return form.parentElement?.querySelector(selector) ?? null;
}

/** Reveals a result block and moves focus to it, so it is read out and scrolled into view. */
function show(block) {
  if (!block) return;
  block.hidden = false;
  if (!block.hasAttribute('tabindex')) block.tabIndex = -1;
  block.focus();
}

/** mailto: URL carrying the filled fields as "Label: value" lines. */
function mailtoUrl(form, fields) {
  const address = form.getAttribute('action').replace(/^mailto:/i, '').split('?')[0];
  const body = fields
    .filter((field) => valueOf(field))
    .map((field) => `${labelOf(field)}: ${valueOf(field).replace(/\r?\n/g, '\r\n')}`)
    .join('\r\n');
  const query = [
    ['subject', form.dataset.subject],
    ['body', body],
  ]
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');
  return `mailto:${address}${query ? `?${query}` : ''}`;
}

/** POSTs the form to its endpoint as JSON. Rejects on a network error, a timeout or a refusal. */
async function send(form, endpoint, startedAt, openedAt) {
  const payload = {};
  const extras = [];
  for (const el of form.elements) {
    if (!el.name || el.name === HONEYPOT || el.disabled || el.matches('button, [type="submit"], [type="button"], [type="reset"]')) continue;
    const value = el.type === 'hidden' ? el.value.trim() : valueOf(el);
    if (!value) continue;
    if (CORE_FIELDS.includes(el.name)) payload[el.name] = value;
    else extras.push(`${labelOf(el)}: ${value}`);
  }
  if (extras.length) payload.message = [payload.message, extras.join('\n')].filter(Boolean).join('\n\n');
  if (!payload.subject && form.dataset.subject) payload.subject = form.dataset.subject;
  payload[HONEYPOT] = '';
  payload.startedAt = startedAt;
  // Time spent on the form, measured with a monotonic clock so a wrong device clock cannot matter.
  payload.elapsed = Math.round(performance.now() - openedAt);

  const response = await fetch(endpoint, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    signal: AbortSignal.timeout?.(TIMEOUT_MS),
  });
  // A refusal can also arrive as 200 with { "ok": false } or { "success": false }.
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.ok === false || result?.success === false) {
    throw new Error(`Form endpoint answered ${response.status}`);
  }
}

function setUp(form) {
  const button = form.querySelector('[data-form-submit]') ?? form.querySelector('[type="submit"]');
  const buttonLabel = button?.textContent ?? '';
  const success = blockAfter(form, '[data-form-success]');
  const failure = blockAfter(form, '[data-form-error]');
  const endpoint = /^(https?:\/\/|\/(?!\/))/i.test(form.dataset.endpoint ?? '') ? form.dataset.endpoint : null;
  const startedAt = Date.now();
  const openedAt = performance.now();
  const usesMail = /^mailto:/i.test(form.getAttribute('action') ?? '');

  form.noValidate = true;

  // Announces errors that appear while focus is elsewhere (validation on blur).
  const announcer = document.createElement('p');
  announcer.className = 'sr-only';
  announcer.setAttribute('role', 'status');
  form.append(announcer);

  const setBusy = (busy) => {
    if (busy) form.setAttribute('aria-busy', 'true');
    else form.removeAttribute('aria-busy');
    if (!button) return;
    button.disabled = busy;
    button.textContent = busy ? button.dataset.wait || WAIT_LABEL : buttonLabel;
  };

  const succeed = () => {
    form.dataset.state = 'success';
    form.reset();
    if (failure) failure.hidden = true;
    if (success) form.hidden = true;
    show(success);
  };

  const fail = () => {
    form.dataset.state = 'error';
    show(failure);
  };

  form.addEventListener('focusout', ({ target, relatedTarget }) => {
    // Not while focus moves to the submit button or the button is being pressed: submit
    // validates everything anyway, and an error line appearing mid-click could push the
    // button out from under the pointer (:active covers browsers that do not focus buttons).
    if (relatedTarget === button || button?.matches(':active')) return;
    if (!fieldsOf(form).includes(target)) return;
    if (!valueOf(target) && !target.hasAttribute('aria-invalid')) return;
    const message = check(target);
    announcer.textContent = message ? `${labelOf(target)}: ${message}` : '';
    // A field error replaces the "something went wrong" block of an earlier attempt.
    if (message && failure) failure.hidden = true;
  });

  // A flagged field is re-checked as it changes, so the error disappears as soon as it is fixed.
  form.addEventListener('input', ({ target }) => {
    if (target.getAttribute('aria-invalid') === 'true' && !check(target)) announcer.textContent = '';
  });

  form.addEventListener('submit', async (event) => {
    if (form.dataset.state === 'sending') {
      event.preventDefault();
      return;
    }

    const fields = fieldsOf(form);
    const invalid = fields.filter((field) => check(field));
    announcer.textContent = '';
    if (failure) failure.hidden = true;
    if (invalid.length) {
      event.preventDefault();
      invalid[0].focus();
      return;
    }

    if (form.elements[HONEYPOT]?.value) {
      event.preventDefault();
      succeed();
      return;
    }

    if (endpoint) {
      event.preventDefault();
      form.dataset.state = 'sending';
      setBusy(true);
      try {
        await send(form, endpoint, startedAt, openedAt);
        setBusy(false);
        succeed();
      } catch (error) {
        console.warn('[forms] Submission failed.', error);
        setBusy(false);
        fail();
      }
      return;
    }

    if (usesMail) {
      event.preventDefault();
      window.location.href = mailtoUrl(form, fields);
      succeed();
    }
    // Neither an endpoint nor a mailto: action: the browser submits the form as usual.
  });
}

export default function initForms() {
  for (const form of document.querySelectorAll('form[data-form]')) setUp(form);
}
