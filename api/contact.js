// Vercel serverless function: POST /api/contact
// Sends form submissions through your own Hostinger mailbox via SMTP.
// Credentials come from Vercel Environment Variables (never from the browser).

const nodemailer = require("nodemailer");

const MAX = { name: 100, email: 200, subject: 150, message: 5000 };
const MIN_SECONDS_ON_PAGE = 3; // bots tend to submit instantly

function clean(value, max) {
  return String(value ?? "").trim().slice(0, max);
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function validEmail(e) {
  return /^[^\s@<>()[\]\\,;:]+@[^\s@<>()[\]\\,;:]+\.[^\s@<>()[\]\\,;:]{2,}$/.test(e);
}

function makeTransport() {
  const port = Number(process.env.SMTP_PORT || 465);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.hostinger.com",
    port,
    secure: port === 465, // 465 = SSL, 587 = STARTTLS
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

async function handler(req, res, transport = null) {
  // Only allow your own site to call this (set ALLOWED_ORIGIN in Vercel; leave blank to allow same-origin only)
  const origin = req.headers.origin || "";
  const allowed = (process.env.ALLOWED_ORIGIN || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (allowed.length && origin && !allowed.includes(origin)) {
    return res.status(403).json({ ok: false, error: "Forbidden origin." });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed." });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  // Honeypot: real users never fill this hidden field. Pretend success so bots move on.
  if (clean(body.website, 200)) return res.status(200).json({ ok: true });

  // Time trap. Prefer "elapsed" (ms the visitor spent on the form, measured in the browser with a
  // monotonic clock), so a visitor whose device clock is wrong is never dropped by mistake.
  // Falls back to the form-rendered timestamp (ms) sent by the page.
  const elapsed = Number(body.elapsed);
  const startedAt = Number(body.startedAt);
  const tooFast = Number.isFinite(elapsed) && elapsed > 0
    ? elapsed < MIN_SECONDS_ON_PAGE * 1000
    : !startedAt || Date.now() - startedAt < MIN_SECONDS_ON_PAGE * 1000;
  if (tooFast) {
    return res.status(200).json({ ok: true }); // silently drop
  }

  const name = clean(body.name, MAX.name);
  const email = clean(body.email, MAX.email);
  const subject = clean(body.subject, MAX.subject) || "New message from website";
  const message = clean(body.message, MAX.message);

  if (!name || !email || !message) {
    return res.status(400).json({ ok: false, error: "Please fill in your name, email and message." });
  }
  if (!validEmail(email)) {
    return res.status(400).json({ ok: false, error: "Please enter a valid email address." });
  }

  const fromAddress = process.env.MAIL_FROM || process.env.SMTP_USER;
  const toAddress = process.env.MAIL_TO || process.env.SMTP_USER;
  if (!fromAddress || !process.env.SMTP_PASS) {
    console.error("Mail env vars missing (SMTP_USER / SMTP_PASS).");
    return res.status(500).json({ ok: false, error: "Mail is not configured." });
  }

  // Strip line breaks so nobody can inject extra headers through the subject or name
  const safeName = name.replace(/[\r\n]+/g, " ");
  const safeSubject = subject.replace(/[\r\n]+/g, " ");

  try {
    await (transport || makeTransport()).sendMail({
      from: { name: process.env.MAIL_FROM_NAME || "Website Contact Form", address: fromAddress }, // always YOUR mailbox
      to: toAddress,
      replyTo: { name: safeName, address: email }, // hitting "Reply" goes to the visitor
      subject: `[Website] ${safeSubject}`,
      text: `Name: ${safeName}\nEmail: ${email}\n\n${message}`,
      html:
        `<p><strong>Name:</strong> ${escapeHtml(safeName)}<br>` +
        `<strong>Email:</strong> ${escapeHtml(email)}</p>` +
        `<p style="white-space:pre-wrap">${escapeHtml(message)}</p>`,
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("sendMail failed:", err && err.message);
    return res.status(502).json({ ok: false, error: "Could not send your message. Please try again later." });
  }
}

module.exports = (req, res) => handler(req, res);
module.exports.handler = handler; // exported for local testing
