# Product

> Written from the project brief and the chosen reference site. The owner asked for the site to be
> built without a discovery interview, so treat the positioning below as a working draft and correct it freely.

## Register

brand

## Users

Founders, operations leads and marketing managers at small and mid-size companies (startups, e-commerce brands,
SaaS teams, service businesses, and other agencies that need white-label capacity). They need more web development,
web design, graphic design or customer service capacity than their team has, and they do not want to recruit in-house.

They arrive from search or a referral, usually on a laptop during work hours, sometimes on a phone between meetings.
They are comparing three to five vendors and are wary of the usual outsourcing problems: uneven quality, slow
communication and costs that grow after the contract is signed.

The job to be done: "Add reliable, skilled hands to my team this month, at a predictable monthly price, without the
overhead of hiring."

## Product Purpose

The marketing site for Virtual Augmentation (virtualaugmentation.com), an agency that extends client teams with remote
specialists across four services: web development, web design, customer service and graphic design.

The site has to explain the offer in seconds, show how the work happens, prove quality with real work, make pricing
legible, and turn a visitor into an enquiry. Success is measured in qualified quote requests and in organic visibility
for the four services and for staff augmentation terms.

Six pages: Home, About, Services, Portfolio, Pricing and Contact. The contact form emails enquiries through the
serverless function `api/contact.js`.

## Brand Personality

Capable, direct, warm.

The voice is plain-spoken and specific. It talks about outcomes, process and price, and it avoids outsourcing jargon.
A visitor should leave feeling confident that the work will be delivered, relieved that the process is simple, and
ready to start.

## Anti-references

- Generic offshore outsourcing sites: stock handshakes, world maps, "synergy" and "solutions" copy.
- Agency sites with twenty service pages, no prices and a contact form as the only path forward.
- Template leftovers: lorem ipsum, SaaS feature-speak that does not fit an agency, placeholder client logos.
- A redesign of the reference. The visual language is deliberately a faithful clone of the Tachbot template.

## Design Principles

1. Mirror the reference faithfully. The owner chose the Tachbot template as the visual target: layout, theme,
   components and motion match it one to one. Only the content, the brand name and the page set change.
2. Clarity before cleverness. Every section answers a buyer question: what is it, how does it work, how much, who
   says so, what happens next.
3. Show the work. Process, deliverables and pricing carry the argument; claims without detail do not.
4. One next step. Every page leads to the same action: request a quote.
5. Fast and findable. Performance, semantic HTML and structured data are part of the design, not a later pass.

## Accessibility & Inclusion

Target WCAG 2.2 AA: keyboard-operable navigation and forms, a visible focus indicator, a skip link, meaningful alt
text, body text contrast of at least 4.5:1 on the dark canvas, comfortable touch targets, and full support for
`prefers-reduced-motion` (reveals, marquees and hover effects all stand still).
