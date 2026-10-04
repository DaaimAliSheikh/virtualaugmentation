# Virtual Augmentation

Marketing site for [virtualaugmentation.com](https://virtualaugmentation.com): six static pages (Home, About, Services,
Portfolio, Pricing, Contact) built with Vite, vanilla JavaScript and Tailwind CSS v4, plus one Vercel serverless
function that emails the contact form. No front-end framework.

## Commands

```bash
npm install      # once
npm run dev      # local dev server with hot reload (http://localhost:5173)
npm run build    # production build into dist/
npm run preview  # serve dist/ locally
```

Node 22.12 or newer.

## How the site is put together

```
index.html  about.html  services.html  portfolio.html  pricing.html  contact.html  404.html
    Page shells: the SEO <head> of the page (title, description, canonical, Open Graph, JSON-LD)
    and an ordered list of section includes.

src/partials/
    head.html                 tags shared by every page (favicons, font preloads, CSS and JS entry)
    header.html  footer.html  site header and footer
    sections/*.html           one file per page section; a section used on several pages exists once

src/styles/
    main.css                  entry; imports the files below
    theme.css                 design tokens (colors, type, radii, shadows, motion, breakpoints)
    fonts.css base.css components.css   fonts, element defaults, shared primitives (buttons, type scale, reveal)
    header.css footer.css sections/*.css   the few styles utilities cannot express

src/js/                       one small module per feature; every file is loaded automatically by src/main.js
api/contact.js                Vercel serverless function: receives the forms and sends the email over SMTP
src/assets/                   images (optimised, responsive WebP + SVG) and the self-hosted font
public/                       favicons, web manifest, social share image (copied as-is)
```

Partials are stitched in at build time with a comment directive, so the output is plain static HTML:

```html
<!-- @include src/partials/sections/home-hero.html -->
```

The include plugin, the `sitemap.xml` / `robots.txt` generator, the local 404 handler and the local stand-in for the
contact function live in `vite.config.mjs`. To add a page: create the HTML file, add it to `PAGES` in
`vite.config.mjs`, and link it from the header.

Design tokens and components are documented in [DESIGN.md](DESIGN.md); audience and voice in [PRODUCT.md](PRODUCT.md).

## Settings

### Public values (`.env`, committed)

Replaced in the HTML at build time (`%VITE_…%`). Nothing secret goes in this file.

| Variable | Purpose |
|---|---|
| `VITE_SITE_URL` | Canonical origin, no trailing slash. Drives canonical URLs, Open Graph, JSON-LD, `sitemap.xml`, `robots.txt`. |
| `VITE_CONTACT_EMAIL` | Address shown on the site and used as the fallback when a form cannot send. |
| `VITE_FORM_ENDPOINT` | Where the forms POST. `/api/contact` is the site's own function. Empty: the forms open the visitor's email app instead. |
| `VITE_SOCIAL_INSTAGRAM`, `VITE_SOCIAL_X`, `VITE_SOCIAL_LINKEDIN`, `VITE_SOCIAL_FACEBOOK` | Social profile links in the footer and on team cards. |

### Contact form email (secrets)

`api/contact.js` sends every enquiry through your own mailbox over SMTP. It reads these variables, listed in
`.env.example`:

| Variable | Purpose |
|---|---|
| `SMTP_HOST`, `SMTP_PORT` | Mail server (`smtp.hostinger.com`, `465`). |
| `SMTP_USER`, `SMTP_PASS` | The mailbox that sends the email, and its password. |
| `MAIL_FROM`, `MAIL_TO`, `MAIL_FROM_NAME` | Optional. Default to `SMTP_USER`. Replies go to the visitor's address. |
| `ALLOWED_ORIGIN` | Optional. Comma-separated origins allowed to call the function. |

- **Production:** add them in Vercel (Project → Settings → Environment Variables) and redeploy. They are never part
  of the site's files.
- **Local:** put them in `.env.local`, which is git-ignored. `npm run dev` and `npm run preview` then run the same
  function at `/api/contact`, so a local test sends a real email.

The forms (the Contact page and the "Let's talk" banner in the footer) post JSON to the function. It drops bots with a
hidden field and a minimum time on the form, validates the input, and answers `{ "ok": true }`. If sending fails the
visitor sees an error with your email address.

## Deploying to Vercel with the Hostinger domain

1. Push this folder to a Git repository and import it in Vercel. `vercel.json` already sets the framework (Vite),
   the build command, the output directory, clean URLs (`/about` instead of `/about.html`), redirects, caching and
   security headers.
2. In Vercel: Project → Settings → Domains, add `virtualaugmentation.com` and `www.virtualaugmentation.com`.
   Make **`virtualaugmentation.com` the primary domain** and let `www` redirect to it. The canonical URLs, the sitemap
   and the structured data all use the apex domain, so the primary domain must match. (If you prefer `www`, change
   `VITE_SITE_URL` to `https://www.virtualaugmentation.com` instead.)
3. In Hostinger: hPanel → Domains → `virtualaugmentation.com` → DNS / Nameservers → DNS records. Remove the existing
   `A` record for `@` and the `CNAME` for `www` that point at Hostinger parking, then add the records Vercel shows on
   its Domains screen. They are normally:

   | Type | Name | Value |
   |---|---|---|
   | `A` | `@` | `76.76.21.21` |
   | `CNAME` | `www` | `cname.vercel-dns.com` |

   Use the exact values Vercel displays for your project if they differ. Leave any `MX` and `TXT` records in place so
   email keeps working.
4. Wait for DNS to propagate (minutes to a few hours). Vercel issues the HTTPS certificate automatically.
5. Add the site to Google Search Console and submit `https://virtualaugmentation.com/sitemap.xml`.

## Before launch

The structure, design and SEO plumbing are finished. The following is sample content and should be replaced with the
real thing:

- Testimonials, team members and portfolio projects (names, quotes, photos, project titles).
- Plan prices and what each plan includes.
- The social profile links in `.env`.
- The SMTP variables in Vercel (see above), so the contact form can send.
