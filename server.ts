import express from "express";
import dotenv from "dotenv";
import path from "path";
import compression from "compression";
import { securityHeaders, sameOriginCors, isImmutableAsset } from "./server/security.ts";
import fs from "fs";
import { isRouteValid } from "./seoConfig.ts";
import { getPageSeo, normalizeCanonicalPath } from "./src/seo/metadata.ts";
import { injectPageSeo, escapeSeoHtml } from "./src/seo/html.ts";
import { seoFragmentName, HOME_APP_SSR_MARKER } from "./src/seo/render-contract.ts";
import { startHomeAfterPaint } from "./src/home/paint-start.ts";
import { pathLanguage, toLegacyPath } from "./src/routing/site-paths.ts";
import { getRouteDisposition } from "./src/routing/route-policy.ts";
import { publicHref } from "./src/routing/site-paths.ts";
import { renderStatusPage } from "./server/statusPage.ts";
import { createHomeWeatherHandler } from "./server/homeWeather.ts";
import { createKaiAssistantHandler } from "./server/kaiAssistant.ts";
import { createContactRoutingHandlers } from "./src/contact/routing-server.ts";
import { createContactIntakeHandlers } from "./server/contact-intake.ts";
import { createBookingHandlers } from "./server/booking.ts";
import { createVercelPaymentEmailScheduler } from "./server/booking-lifecycle.ts";
// No need to define currentDirname or use import.meta.url as they are unused and cause a parse-time SyntaxError in bundled CommonJS on startup.

dotenv.config();
const runningOnVercel = process.env.VERCEL === "1";
const isBundled = typeof __filename !== "undefined" && __filename.endsWith("server.cjs");
process.env.NODE_ENV = (runningOnVercel || isBundled) ? "production" : (process.env.NODE_ENV || "development");
const isDev = process.env.NODE_ENV === "development";

// Vercel owns the listener. Every request waits for the same initialization,
// including when local Vite middleware needs asynchronous setup.
const app = express();
app.disable("x-powered-by");
app.use(securityHeaders);
export default app;
app.use((_req, _res, next) => { appReady.then(() => next(), next); });

async function configureApplication() {

  app.use((req, res, next) => {
    const hostname = req.hostname?.toLowerCase();
    if (hostname !== "krakenpfm.ch" && hostname !== "www.krakenpfm.ch") {
      res.setHeader("X-Robots-Tag", "noindex, nofollow");
    } else if ((!path.extname(req.path) || req.path.startsWith('/api/')) && !getPageSeo(req.originalUrl).indexable) {
      res.setHeader("X-Robots-Tag", "noindex, follow");
    }
    if (['/quote', '/quote-demo', '/customer-access'].includes(toLegacyPath(req.path))) {
      res.setHeader('Referrer-Policy', 'no-referrer');
      res.setHeader('Cache-Control', 'private, no-store');
    }
    next();
  });

  app.use(compression());
  app.use(sameOriginCors);
  const booking = createBookingHandlers({schedulePaymentEmails:createVercelPaymentEmailScheduler(runningOnVercel)});
  app.post('/api/booking/payrexx/webhook', express.raw({ type: 'application/json', limit: '32kb' }), booking.webhook);
  app.post('/api/booking/email/webhook', express.raw({ type: 'application/json', limit: '32kb' }), booking.emailWebhook);
  const contactIntake = createContactIntakeHandlers();
  app.get('/api/contact/intake/config', contactIntake.config);
  app.post('/api/contact/messages', express.json({ limit: '24kb' }), contactIntake.message);
  app.get('/api/contact/maintenance', contactIntake.maintenance);
  app.post('/api/contact/maintenance', contactIntake.maintenance);
  app.use('/api/contact', express.json({ limit: '4kb' }), ((error, _req, res, _next) => {
    // Contact accepts only a short query or one coordinate; parser errors must
    // stay in the same JSON error contract and never echo customer input.
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.status(400).json({ error: { code: 'invalid_request' } });
  }) as express.ErrorRequestHandler);
  app.use(['/api/booking', '/api/recovery', '/api/customer'], express.json({ limit: '32kb' }), ((error, _req, res, _next) => {
    res.setHeader('Cache-Control', 'private, no-store');
    res.status(400).json({ code: 'INVALID_REQUEST' });
  }) as express.ErrorRequestHandler);
  app.use(express.json());
  app.use(booking.middleware);

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/weather/zurich", createHomeWeatherHandler());
  app.post("/api/kai/assist", createKaiAssistantHandler());
  const contactRouting = createContactRoutingHandlers();
  app.get("/api/contact/config", contactRouting.config);
  app.post("/api/contact/geocode", contactRouting.geocode);
  app.post("/api/contact/route", contactRouting.route);
  // Retired legacy endpoint. Public requests use the current, validated workflows.
  app.get('/api/download-zip', (_req, res) => { res.setHeader('Cache-Control', 'no-store'); res.status(410).json({ code: 'ARCHIVE_UNAVAILABLE' }); });

  // Retired service checkout accepted a browser-supplied amount and cannot
  // authorize a payment. Bookings now own prices, references and verification.
  app.post('/api/payrexx/create-gateway', (_req, res) => {
    res.setHeader('Cache-Control', 'private, no-store');
    res.status(410).json({ code: 'BOOKING_CHECKOUT_REQUIRED' });
  });
  // Retired legacy endpoint. Public requests use the current, validated workflows.
  app.post('/api/chat', (_req, res) => { res.setHeader('Cache-Control', 'no-store'); res.status(410).json({ code: 'USE_KAI_ASSIST' }); });

  const injectSeoMeta = (html: string, pathname: string, language?: string, allowIndexing=true) => injectPageSeo(html, pathname, language, {allowIndexing});

  const handleHtmlRequest = async (req: express.Request, res: express.Response) => {
    try {
      const isProd = !isDev;
      const distPath = (typeof __dirname !== "undefined" && path.basename(__dirname) === "dist")
        ? __dirname
        : path.join(process.cwd(), "dist");

      // 2. Fallback to SPA template (use index-spa.html backup in prod if exists, otherwise index.html)
      const indexPath = isProd
        ? (fs.existsSync(path.join(distPath, "index-spa.html"))
            ? path.join(distPath, "index-spa.html")
            : path.join(distPath, "index.html"))
        : path.join(process.cwd(), "index.html");

      if (fs.existsSync(indexPath)) {
        let html = fs.readFileSync(indexPath, "utf8");

        // If Vite development server is active, transform index.html dynamically
        if (!isProd && viteInstance) {
          html = await viteInstance.transformIndexHtml(req.originalUrl, html);
        }

        // One deterministic default URL in Swiss German; explicit locale sessions remain available.
        const detectedLang = pathLanguage(req.originalUrl) || 'de-CH';
        const locale = detectedLang.slice(0, 2);
        const valid = isRouteValid(req.path);
        if (!valid) res.status(404);
        const meta = getPageSeo(req.originalUrl, detectedLang);
        const fragmentPath = path.join(distPath, seoFragmentName(normalizeCanonicalPath(req.path), locale));
        let content: string;
        if (isProd && fs.existsSync(fragmentPath)) {
          content = fs.readFileSync(fragmentPath, 'utf8');
        } else {
          // Non-indexable legacy/auth pages receive an honest route introduction,
          // never a copy of the homepage. React supplies their interactive flow.
          const copy = ({
            de: ['Seite nicht gefunden', 'Bitte nutzen Sie die Navigation oder kontaktieren Sie Kraken persönlich.'],
            en: ['Page not found', 'Use the navigation or contact Kraken for personal help.'],
            es: ['Página no encontrada', 'Utilice la navegación o contacte personalmente con Kraken.'],
            fr: ['Page introuvable', 'Utilisez la navigation ou contactez Kraken personnellement.'],
            it: ['Pagina non trovata', 'Utilizzi la navigazione o contatti Kraken per un aiuto personale.'],
            pt: ['Página não encontrada', 'Utilize a navegação ou contacte a Kraken pessoalmente.'],
          } as Record<string,string[]>)[locale] || ['Page not found', 'Contact Kraken.'];
          content = `<main id="main" class="container"><h1>${escapeSeoHtml(valid ? meta.h1 : copy[0])}</h1><p>${escapeSeoHtml(valid ? meta.description : copy[1])}</p><p><a href="/leistungen?lang=${locale}">Kraken PFM</a> · <a href="tel:+41774505705">+41 77 450 57 05</a> · <a href="mailto:kai@krakenpfm.ch">kai@krakenpfm.ch</a></p></main>`;
          const shell = path.join(distPath, `seo-shell-${locale}.html`);
          if (isProd && fs.existsSync(shell)) content = fs.readFileSync(shell, 'utf8').replace('<!-- seo-route-content -->', () => content);
        }
        const hydratableHome=isProd&&normalizeCanonicalPath(req.path)==='/'&&content.includes(HOME_APP_SSR_MARKER);
        content=content.replace(HOME_APP_SSR_MARKER,'');
        const resourcePattern=hydratableHome?/<link\b(?=[^>]*\brel=["'](?:stylesheet|preload)["'])[^>]*\/?>/gi:/<link rel="stylesheet" href="[^"]+">/g;
        const styles = content.match(resourcePattern) || [];
        // Vite already places shared styles in the head. Attribute differences
        // (notably crossorigin) must not make a second render-blocking request.
        // Responsive image preloads may intentionally omit href. Their srcset
        // is the resource identity; dropping them delays discovery until <img>.
        const resourceKey = (tag: string) => {
          const href=tag.match(/\bhref=["']([^"']+)["']/i)?.[1];
          if(href)return href;
          const sources=tag.match(/\bimagesrcset=["']([^"']+)["']/i)?.[1];
          return sources ? 'srcset:'+sources+'|'+(tag.match(/\bimagesizes=["']([^"']+)["']/i)?.[1] || '') : null;
        };
        const resourceHrefs = new Set([...html.matchAll(/<link\b(?=[^>]*\brel=["'](?:stylesheet|preload)["'])[^>]*>/gi)].map(match => resourceKey(match[0])).filter(Boolean));
        const additionalResources = styles.filter(tag => {
          const href = resourceKey(tag);
          if (!href || resourceHrefs.has(href)) return false;
          resourceHrefs.add(href); return true;
        });
        const imageHints = additionalResources.filter(tag => /\brel=["']preload["']/i.test(tag) && /\bas=["']image["']/i.test(tag));
        const otherResources = additionalResources.filter(tag => !imageHints.includes(tag));
        // Discover the LCP image before the stylesheet or metadata graph.
        // These are React's own srcset/sizes hints, matching the real visible image.
        // Mobile srcset selection needs the real viewport before its preload;
        // otherwise the browser can fetch both a desktop and a mobile candidate.
        const viewport=/<meta\b(?=[^>]*\bname=["']viewport["'])[^>]*>/i;
        html = html.replace(viewport.test(html)?viewport:/<head\b[^>]*>/i, opening => opening + imageHints.join(''));
        html = html.replace('</head>', () => otherResources.join('') + '</head>');
        if (hydratableHome) html=startHomeAfterPaint(html);
        const body = content.replace(resourcePattern, '');
        const rootPattern = html.includes('<!-- kraken-root-end -->')
          ? /<div id="root">[\s\S]*?<\/div>(?=\s*<!-- kraken-root-end -->)/
          : /<div id="root">[\s\S]*?<\/div>/;
        html = html.replace(rootPattern, () => `<div id="root"${hydratableHome?' data-kraken-home-ssr="true"':''}>${body}</div>`);
        // The apartment illustration is requested only by the real homepage.
        if (req.path !== '/') html = html.replace(/<link rel="preload" as="image" href="\/home-approved\/assets\/hero-room-day-v4\.webp"[^>]*>/, '');
        html = injectSeoMeta(html, req.originalUrl, detectedLang, ['krakenpfm.ch','www.krakenpfm.ch'].includes(req.hostname.toLowerCase()));
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        return res.send(html);
      }
    } catch (e) {
      console.error("Failed to render and serve dynamic HTML:", e);
    }

    res.status(500).send("Internal Server Error - HTML template not found");
  };

  // Runtime templates and source diagnostics must never bypass route policy via static middleware.
  app.get('/.well-known/security.txt', (_req, res) => {
    const filename = path.join(process.cwd(), 'public/.well-known/security.txt');
    if (!fs.existsSync(filename)) return res.status(404).type('text/plain').send('Not found');
    res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');
    return res.type('text/plain').sendFile(filename, { dotfiles: 'allow' });
  });
  app.use((req, res, next) => {
    let pathname: string;
    try { pathname = decodeURIComponent(req.path).toLowerCase(); }
    catch { return res.status(400).type('text/plain').send('Bad request'); }
    if (/\.(?:map|zip|tar|tgz|sql|sqlite|bak|log|pem|key)$/.test(pathname) || /(?:^|\/)(?:server\.(?:cjs|mjs|js)|stats\.html|index-spa\.html|(?:seo-page|seo-shell|services-content|about-content|contact-content|why-content)-[a-z0-9-]+\.html)$/.test(pathname)) {
      res.setHeader('X-Robots-Tag', 'noindex, nofollow');
      return res.status(404).type('text/plain').send('Not found');
    }
    if (/^\/(?:en\/|es\/|pt\/|it\/|fr\/)?index\.html$/.test(pathname)) {
      const query = req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?')) : '';
      const disposition = getRouteDisposition(req.originalUrl);
      return res.redirect(301, disposition.location || publicHref('/' + query, pathLanguage(req.originalUrl) || 'de'));
    }
    if (pathname.endsWith('.html')) {
      res.setHeader('X-Robots-Tag', 'noindex, follow');
      return res.status(410).type('html').send(renderStatusPage(410, pathLanguage(req.originalUrl) || 'de'));
    }
    next();
  });

  // Vite middleware for development (with graceful fallback if not installed/present)
  let viteInstance: any = null;
  if (isDev) {
    try {
      const { createServer: createViteServer } = await (specifier => import(specifier))("vite") as any;
      viteInstance = await createViteServer({
        server: { middlewareMode: true, hmr: process.env.KRAKEN_DEV_HMR === 'false' ? false : undefined },
        appType: "custom",
      });
      app.use(viteInstance.middlewares);
      console.log("Vite development server middleware loaded.");
    } catch (e) {
      console.warn("Could not load Vite middleware in development mode. Falling back to serving built files.", e);
    }
  }

  // Production assets static files serving with aggressive caching
  const distPath = (typeof __dirname !== "undefined" && path.basename(__dirname) === "dist")
    ? __dirname
    : path.join(process.cwd(), "dist");

  const publicPath = path.join(process.cwd(), "public");

  if (fs.existsSync(publicPath)) {
    app.use(express.static(publicPath, {
      maxAge: "1d",
      setHeaders: (res, filePath) => {
        const asset = "/" + path.relative(publicPath, filePath).split(path.sep).join("/");
        res.setHeader("Cache-Control", isImmutableAsset(asset) ? "public, max-age=31536000, immutable" : "public, max-age=3600, must-revalidate");
      }
    }));
  }

  app.use(express.static(distPath, {
    index: false,
    maxAge: "1d",
    setHeaders: (res, filePath) => {
      if (isImmutableAsset("/" + path.relative(distPath, filePath).split(path.sep).join("/"))) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      } else if (filePath.endsWith(".html")) {
        res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
      } else {
        res.setHeader("Cache-Control", "public, max-age=604800"); // 7 days cache
      }
    }
  }));

  // Intercept all routes for pre-rendering
  app.get("*all", (req, res, next) => {
    const isAsset = req.path.includes(".") && !req.path.endsWith(".html");
    const isViteInternal = req.path.startsWith("/src") || req.path.startsWith("/@") || req.path.startsWith("/node_modules");
    if (isAsset || isViteInternal) {
      return next();
    }

    const disposition = getRouteDisposition(req.originalUrl);
    if (disposition.status === 301) return res.redirect(301, disposition.location!);
    if (disposition.status === 410) {
      res.setHeader('X-Robots-Tag', 'noindex, follow');
      return res.status(410).type('html').send(renderStatusPage(410, pathLanguage(req.originalUrl) || 'de'));
    }

    return handleHtmlRequest(req, res);
  });
  console.log(`Serving static production assets with caching headers from: ${distPath}`);

  return { close: () => viteInstance?.close() };
}

export const appReady = configureApplication();

async function startServer() {
  const lifecycle = await appReady;

  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  const server = app.listen(PORT, process.env.HOST || "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });

  server.on("error", (err: any) => {
    console.error("SERVER LISTEN ERROR:", err);
    process.exit(1);
  });

  process.on("SIGTERM", () => {
    console.log("SIGTERM signal received: closing HTTP server gracefully.");
    void lifecycle.close();
    server.close(() => {
      console.log("HTTP server closed.");
      process.exit(0);
    });
  });

  process.on("SIGINT", () => {
    console.log("SIGINT signal received: closing HTTP server gracefully.");
    void lifecycle.close();
    server.close(() => {
      console.log("HTTP server closed.");
      process.exit(0);
    });
  });

  process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
  });

  process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception thrown:", err);
  });
}

if (runningOnVercel) {
  void appReady.catch(err => console.error("Critical error initializing the application:", err));
} else {
  startServer().catch((err) => {
    console.error("Critical error starting the server:", err);
    process.exit(1);
  });
}
