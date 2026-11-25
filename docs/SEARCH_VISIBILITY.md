# Search visibility and crawler policy

This branch prepares a route and content migration for review. It does not deploy to production or submit anything to a search account. Google and ChatGPT indexing of the changed pages has not been confirmed.

## Current URL contract

Swiss German is the reference language. Its URLs have no language prefix. English, Spanish, Portuguese, Italian and French use `/en/`, `/es/`, `/pt/`, `/it/` and `/fr/`. The homepage for a translated language ends in `/`, for example `/en/`.

`src/routing/site-paths.ts` is shared by native links, the React router, metadata and the sitemap. `/about` becomes `/ueber-uns`, `/quote` becomes `/offerte`, and the 15 existing service/city pages use German service slugs, for example `/umzugsreinigung/zuerich`. `src/routing/route-policy.ts` defines 301 replacements and 410 removals. Old language queries redirect directly to their current prefixed URL. Service selection, repeated query values and opaque booking/recovery values survive; fragments are preserved in native links. API and asset URLs are not prefixed.

The manifest in `src/seo/crawl-policy.ts` retains 24 reviewed public base routes and 144 canonical language URLs. Every one has a 200 route disposition, a self canonical and the same reciprocal set of six `hreflang` links plus German `de-CH` as `x-default`. No retired aliases, private workflows or unreviewed municipality/service combinations enter the sitemap. [Google's language guidance](https://developers.google.com/search/docs/specialty/international/localized-versions) describes reciprocal alternates for genuinely translated main content.

The historical route inventory and decisions are documented in [ROUTE_MIGRATION.md](./ROUTE_MIGRATION.md), with a complete CSV and a separate 410 removal list. `/quote-demo` and `/commercial-quote` remain noindex pending an owner decision about actual usage. Unknown routes return 404.

## Readable content and factual metadata

The HTTP response and client navigation both use `getPageSeo`. The Home H1 identifies Umzugsreinigung Zürich; the three end-of-tenancy landing pages have distinct city content, calculator-derived price rows and visible FAQs. The regional guides and other current service pages retain useful initial HTML. The three legal documents are rendered in all six languages while retaining their existing noindex policy. One H1, translated titles/descriptions and production image paths are checked independently of JavaScript effects.

Initial browser routing uses a separate lightweight router. A token-free SSR route marker, canonical, language, robots policy and expected alternate/schema shape let the client retain a complete matching server head without downloading page metadata or FAQ datasets. Full head synchronization loads only when SPA navigation or a language change makes the head stale. Preview hosts receive matching noindex HTML too. Sensitive query transitions immediately apply noindex and remove public schema/alternates before deferred code loads; generation and current-URL guards discard late results from a previous navigation. Tests inspect the initial App dependency graph and exercise matching SSR entry, preview/private entry, actual head updates and cancelled asynchronous navigation.

Open Graph locales use `de_CH`, `fr_CH`, `it_CH`, and unqualified `en`, `es`, `pt`. Social images and dimensions update on client navigation. When a returning visitor restores a saved non-German preference on a clean URL, the provider records that language in the path using `replaceState`, preserving unrelated query values and the fragment. Explicit URL language selections take precedence.

There is one `LocalBusiness` at the stable `https://krakenpfm.ch/#business` ID, with the operating name Kraken PFM and one real Schaffhausen office. The full registered name stays in the legal notice and copyright. Its coordinates match the approved contact data and [official Swiss address register record 102196962](https://api3.geo.admin.ch/rest/services/ech/MapServer/ch.swisstopo.amtliches-gebaeudeadressverzeichnis/102196962?sr=4326&geometryFormat=geojson), checked on 25 November 2026. `priceRange` describes the calculator-derived end-of-tenancy starting example. Numeric `Service` offers use the calculator's current output and visible pricing conditions. Moving has no numeric quote in the engine, so none is invented. Visible FAQ content has matching `FAQPage` nodes; this does not promise a rich result. No fictitious ratings, reviews, branch addresses, insurance cover or availability are added.

## Crawl files and private workflows

Run from the repository root:

```sh
node --import tsx scripts/generate-sitemap.mjs
node --import tsx scripts/generate-sitemap.mjs --check
node --import tsx scripts/audit-route-migration.mjs
node --import tsx --test tests/seo-*.test.* tests/route-migration.test.ts tests/home-compiled-server.test.mjs
```

The generator writes `public/robots.txt` and `public/sitemap.xml` before Vite copies public assets. It rejects private, duplicate, legacy alias and noncanonical inputs. Sitemap entries are absolute HTTPS URLs without language queries, tracking values or fragments. The XHTML namespace declares alternate language links. No `priority`, `changefreq` or invented `lastmod` timestamps are added. Sitemap inclusion helps discovery and canonicalization; it does not confirm indexing. See [Google's sitemap documentation](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).

The calculator introduction is public. Saved bookings, drafts, payment states, capability tokens, customer access, recovery, authentication, demos, review invitations and APIs remain excluded, including translated prefixes. Sensitive calculator responses retain private/no-store caching and no-referrer handling. Robots preferences and noindex are separate from authentication; they do not grant or protect access to customer data. A robots block also cannot by itself remove an already indexed URL because a crawler must fetch a response to observe its noindex status. Removed public pages remain fetchable so search engines can observe 410.

## Google and ChatGPT discovery

[OpenAI's crawler documentation](https://developers.openai.com/api/docs/bots), checked on 25 November 2026, distinguishes OAI-SearchBot for ChatGPT search, ChatGPT-User for user initiated visits and GPTBot for potential model training. The shared robots group permits public pages for search while preserving all private exclusions. OAI-SearchBot also needs access through any hosting firewall using its genuine published IP ranges. ChatGPT-User does not determine search eligibility. Training preferences remain separate; this branch retains GPTBot's prior wildcard policy.

No special AI text file, invented schema or training opt-in is required to implement this search access. [Google's AI features documentation](https://developers.google.com/search/docs/appearance/ai-features) confirms that its normal SEO requirements apply to AI Overviews and AI Mode, with no additional AI text file or special schema requirement. Crawl access does not guarantee Google inclusion, ranking or a ChatGPT citation.

The owner previously confirmed verified Search Console and Business Profile accounts. The Google session checked on 25 November 2026 did not expose the Kraken Search Console property. No ownership, DNS, account permissions or search submission was changed. After an owner-approved deployment, an existing authorized account should submit the current sitemap, inspect the Home, the three end-of-tenancy landings and representative translations, and verify selected canonicals and the rendered HTML. Inspect representative 301 and 410 URLs from the migration CSV separately. [Google's recrawl instructions](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl) require an owner or full user for indexing requests and explain that requests may take days or weeks without guaranteeing inclusion.

Hosting logs and firewall policy still need checks for genuine Googlebot and OAI-SearchBot traffic. Track indexed canonicals, impressions, clicks and qualified enquiries over time. Record account actions separately from code checks; this PR does not claim that any external index has updated.
