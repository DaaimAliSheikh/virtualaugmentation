# Design

The visual system of virtualaugmentation.com. It is a faithful clone of the Tachbot Webflow template, rebuilt on
Tailwind CSS v4 with CSS-first tokens. Source of truth: `src/styles/theme.css` (tokens) and
`src/styles/components.css` (primitives).

## Overview

A dark, lit-from-above interface. Near-black canvas, slightly lighter raised surfaces with a hairline highlight on
the top edge and a shadow on the bottom edge, white headings, grey body copy, and one hot accent: an orange-to-yellow
vertical gradient used for buttons, active states and small highlights. Corners are soft (10px cards) or fully round
(pills). Motion is slow and calm: content settles into place as it enters the viewport.

The site is dark-only (`color-scheme: dark`). There is no light theme.

## Colors

| Token (utility) | Value | Use |
|---|---|---|
| `background` | `#090910` | Page canvas, wells inside surfaces |
| `surface` | `#121218` | Cards, nav pill, inputs, footer bar |
| `elevated` / `line` | `#272731` | Active pill, tags, hover surface / hairlines and borders |
| `muted` | `#45454f` | Placeholders, disabled marks |
| `subtle` | `#787888` | Captions, column labels |
| `body` | `#94979e` | Paragraph text |
| `foreground` | `#ffffff` | Headings, primary text |
| `primary` | `#f05400` | Brand orange, gradient start |
| `accent` | `#ffec1c` | Brand yellow, gradient end, focus ring |
| `amber` | `#e4a800` | Secondary gradient start |
| `success` / `danger` | `#5eaf08` / `#ff0000` | Form feedback |

Tokens are authored in OKLCH and resolve to exactly these sRGB values. Gradients: `bg-gradient-brand`
(primary to accent, top to bottom), `bg-gradient-amber` (amber to accent), `text-gradient-brand`, `text-gradient-white`.

Color strategy: restrained. The gradient is the only saturated color and is reserved for actions and emphasis.

## Typography

One family: **Be Vietnam Pro** (self-hosted, weights 400, 500, 600, 700), with a metric-matched Arial fallback.

| Utility | Desktop | Tablet | Mobile | Weight |
|---|---|---|---|---|
| `type-h1` | 62/70 | 56/64 | 48/56, then 40/48 under 480px | 600 |
| `type-h2` | 40/48 | 35.2/43.2 | 35.2/43.2 | 600 |
| `type-h3` | 34/42 | 32/40 | 24/32, then 20.8/27.2 | 600 |
| `type-h4` | 32/40 | 30.4/32 | 24/28.8 | 600 |
| `type-h5` | 24/32 | 24/32 | 20.8/28.8 | 600 |
| `type-h6` | 18/26 | 20/28 | 19.2/27.2 | 600 |
| `type-body` | 16/24 | | | 400, `body` grey |
| `type-small` | 14/22 | | | 400, `body` grey |
| `type-caption` | 12/20 | | | 400 |

Headings use `text-gradient-white` (white fading to 90% white). Heading style is independent of the HTML tag:
pick the tag for the document outline and the `type-*` class for the look.

## Layout

- Breakpoints (mobile-first): `sm` 480px, `md` 768px, `lg` 992px. Below 992px the navigation collapses to a menu button.
- Content column: `page-container` (max 1200px) inside `page-padding` gutters (16px, 24px, 30px, 24px by breakpoint).
- Section rhythm: `section-space` (30px, 40px, 60px), with `section-space-end` for the last section before the footer.
- Heading block to content gap: `space-below-lg`, `space-below-md`, `space-below-sm`.

## Elevation

- `shadow-surface`: the standard raised surface (top highlight, bottom inner shade, 1px drop shadow).
- `shadow-button`: the primary button's lit rim and dark outline.
- `shadow-glow`: orange glow for the secondary button on hover.
- Radii: `rounded-card` (10px), `rounded-pill` (60px).

## Components

- **Button** `.btn`: gradient pill with two soft corner bubbles that flood the pill on hover while the label turns
  dark. `.btn.btn-secondary`: dark surface pill with an orange glow on hover. `.btn.btn-plain`: gradient pill without
  bubbles, for form submits.
- **Header**: logo, pill-shaped nav with the current page as a raised pill, and one call to action. Collapses to a
  menu button under 992px. Partial: `src/partials/header.html`.
- **Footer**: "Let's talk" email capture banner, link columns, and a bottom bar with social links.
  Partial: `src/partials/footer.html`.
- **Cards**: `bg-surface shadow-surface rounded-card`. Notched cards carry their icon in a circular cut-out on the
  top edge.
- **Marquee**: two identical tracks side by side, each with `animate-marquee` (duration via `--marquee-duration`).

## Motion

- **Reveal**: `data-reveal-group` wraps a section; children with `data-reveal="up|down|left|right|zoom|fade"` settle
  in when the group enters the viewport (1400ms, ease, 200ms delay by default; tune with `--reveal-*` properties).
- **Hover**: 500ms linear button flood; cards light up softly.
- **Marquees**: 30s linear loops.
- Everything stands still under `prefers-reduced-motion: reduce`, and nothing is hidden when JavaScript is unavailable.

## Do's and Don'ts

- Do use tokens and the spacing scale (`gap-7.5`, `rounded-card`, `text-body`) before arbitrary values.
- Do keep one `<h1>` per page and descriptive alt text on every content image.
- Do put `data-reveal` on a wrapper, not on an element that has its own transform or transition.
- Don't introduce new colors, fonts or radii. The palette above is the whole palette.
- Don't use the gradient for large backgrounds or body text.
- Don't add decorative motion that is not in the reference.
