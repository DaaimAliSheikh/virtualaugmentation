import { defineConfig, loadEnv } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

/**
 * Every indexable page of the site. `url` is the public clean URL
 * (Vercel serves `about.html` at `/about` because of `cleanUrls` in vercel.json).
 * Add a page here and it is built, linked into the sitemap and gets nav highlighting.
 */
const PAGES = [
  { file: 'index.html', url: '/' },
  { file: 'about.html', url: '/about' },
  { file: 'services.html', url: '/services' },
  { file: 'portfolio.html', url: '/portfolio' },
  { file: 'pricing.html', url: '/pricing' },
  { file: 'contact.html', url: '/contact' },
];

/** Built but kept out of the sitemap. Vercel serves 404.html for unknown routes. */
const UTILITY_PAGES = ['404.html'];

const PARTIALS_DIR = path.resolve(root, 'src/partials');
const INCLUDE = /<!--\s*@include\s+(\S+)\s*-->/g;

/**
 * Build-time HTML partials, so the header, the footer and the page sections live in one
 * place while the output stays plain static HTML (nothing is injected by JavaScript at runtime).
 *
 *   <!-- @include src/partials/header.html -->
 *
 * After includes are resolved, every `<a data-nav href="…">` that points at the page
 * being rendered gets `aria-current="page"`, which is what the nav styles hook into,
 * and `{{year}}` becomes the build year (footer copyright).
 */
function htmlPartials() {
  const render = (html, stack = []) =>
    html.replace(INCLUDE, (_, file) => {
      const abs = path.resolve(root, file);
      if (stack.includes(abs)) throw new Error(`Circular @include: ${file}`);
      if (!fs.existsSync(abs)) throw new Error(`@include target not found: ${file}`);
      return render(fs.readFileSync(abs, 'utf8'), [...stack, abs]);
    });

  return {
    name: 'va:html-partials',
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        const file = path.basename(ctx.filename);
        const current = PAGES.find((page) => page.file === file)?.url;
        const out = render(html).replaceAll('{{year}}', String(new Date().getFullYear()));
        if (!current) return out;
        return out.replace(/<a\b[^>]*\bdata-nav\b[^>]*>/g, (tag) => {
          const href = tag.match(/\bhref="([^"]*)"/)?.[1];
          return href === current ? tag.replace(/^<a\b/, '<a aria-current="page"') : tag;
        });
      },
    },
    configureServer(server) {
      server.watcher.add(PARTIALS_DIR);
      const reload = (file) => {
        if (file.startsWith(PARTIALS_DIR)) server.hot.send({ type: 'full-reload' });
      };
      server.watcher.on('change', reload);
      server.watcher.on('add', reload);
    },
  };
}

/** sitemap.xml and robots.txt, generated from PAGES so they can never drift from the build. */
function seoFiles(siteUrl) {
  const lastmod = new Date().toISOString().slice(0, 10);
  const sitemap = () =>
    [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...PAGES.map(
        ({ url }) => `  <url>\n    <loc>${siteUrl}${url}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`,
      ),
      '</urlset>',
      '',
    ].join('\n');
  const robots = () =>
    ['User-agent: *', 'Allow: /', 'Disallow: /api/', '', `Sitemap: ${siteUrl}/sitemap.xml`, ''].join('\n');
  const routes = {
    '/sitemap.xml': ['application/xml', sitemap],
    '/robots.txt': ['text/plain', robots],
  };
  const serve = (req, res, next) => {
    const route = routes[req.url?.split('?')[0]];
    if (!route) return next();
    res.setHeader('Content-Type', `${route[0]}; charset=utf-8`);
    res.end(route[1]());
  };

  return {
    name: 'va:seo-files',
    configureServer(server) {
      server.middlewares.use(serve);
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemap() });
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots() });
    },
  };
}

/**
 * Local parity with Vercel: unknown routes answer with 404.html and a 404 status
 * in `vite dev` and `vite preview` (clean URLs such as /about already resolve natively).
 */
function notFoundPage() {
  const isPageRequest = (req) =>
    req.method === 'GET' && (req.headers.accept || '').includes('text/html') && !path.extname(req.url.split('?')[0]);

  return {
    name: 'va:not-found',
    configureServer(server) {
      return () =>
        server.middlewares.use(async (req, res, next) => {
          if (!isPageRequest(req)) return next();
          try {
            const source = fs.readFileSync(path.resolve(root, '404.html'), 'utf8');
            const html = await server.transformIndexHtml('/404.html', source);
            res.statusCode = 404;
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.end(html);
          } catch (error) {
            next(error);
          }
        });
    },
    configurePreviewServer(server) {
      return () =>
        server.middlewares.use((req, res, next) => {
          const file = path.resolve(root, 'dist/404.html');
          if (!isPageRequest(req) || !fs.existsSync(file)) return next();
          res.statusCode = 404;
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.end(fs.readFileSync(file));
        });
    },
  };
}

/**
 * Local stand-in for Vercel's serverless runtime, so the contact form works in `vite dev`
 * and `vite preview`: POST /api/contact runs api/contact.js with the SMTP settings from
 * .env.local. On Vercel the same file is deployed as a serverless function and reads its
 * settings from the project's Environment Variables.
 */
function localApi(env) {
  // Block body on purpose: a function returned from configureServer would be run as a post hook.
  const mount = (server) => {
    server.middlewares.use('/api/contact', async (req, res) => {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const raw = Buffer.concat(chunks).toString('utf8');
      try {
        req.body = raw ? JSON.parse(raw) : {};
      } catch {
        req.body = raw;
      }
      res.status = (code) => {
        res.statusCode = code;
        return res;
      };
      res.json = (data) => {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify(data));
      };
      try {
        await require('./api/contact.js')(req, res);
      } catch (error) {
        console.error('[api/contact]', error);
        if (!res.writableEnded) res.status(500).json({ ok: false, error: 'The contact function crashed.' });
      }
    });
  };

  return {
    name: 'va:local-api',
    apply: 'serve',
    config() {
      // ALLOWED_ORIGIN is deliberately not loaded: locally the page is served from localhost.
      for (const [key, value] of Object.entries(env)) process.env[key] ??= value;
    },
    configureServer: mount,
    configurePreviewServer: mount,
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, root, 'VITE_');
  const siteUrl = (env.VITE_SITE_URL || 'https://virtualaugmentation.com').replace(/\/+$/, '');

  return {
    appType: 'mpa',
    plugins: [
      tailwindcss(),
      htmlPartials(),
      seoFiles(siteUrl),
      notFoundPage(),
      localApi(loadEnv(mode, root, ['SMTP_', 'MAIL_'])),
    ],
    build: {
      target: 'es2022',
      // Small SVG icons stay as files (cacheable, lazy-loadable) instead of being inlined as data URIs.
      assetsInlineLimit: 0,
      rolldownOptions: {
        input: Object.fromEntries(
          [...PAGES.map((page) => page.file), ...UTILITY_PAGES].map((file) => [
            file.replace(/\.html$/, ''),
            path.resolve(root, file),
          ]),
        ),
      },
    },
  };
});
