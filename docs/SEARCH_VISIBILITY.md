# Search visibility and crawler policy

The public search surface has 24 reviewed base routes and 144 canonical language URLs, backed by readable HTML and matching page metadata. These are the homepage, services, about, contact, the calculator introduction, coverage overview, three regional pages, and five core services in Zürich, Schaffhausen and Winterthur. `src/seo/crawl-policy.ts` contains the shared `INDEXABLE_PATHS` manifest; `src/seo/metadata.ts` determines each response's canonical URL and indexing policy.

## Local SEO package integration, 25 November 2026

The package updates the existing `/einsatzgebiete`, `/reinigung/region-zuerich`, `/reinigung/kanton-schaffhausen` and `/reinigung/region-winterthur` routes. It does not create duplicate regional URLs or remove the 15 reviewed service/city pages. The regional pages contain distinct local guidance, service information and official-source links in all six languages. Their initial HTML uses the same body content as browser navigation.

The nine supplied German titles and descriptions (the four local routes plus Home, Services, About, Contact and the calculator) are integrated verbatim, with genuine translations. `src/seo/local-metadata.ts` supplies approved copy and production asset paths; lightweight regional metadata stays separate from the translated regional body files. The page's Open Graph image dimensions match the actual assets, including the About image in `/about-approved/assets/`. The package's preview `noindex,nofollow` default and standalone schema generator are not used in production. The existing indexing policy and single business identity remain authoritative. Verified prices previously approved on Home and Services remain in place; the regional pages add no numeric prices.

The sitemap still contains 144 language URLs. No modification dates are invented or reset across unchanged pages. Request fresh inspection of the four local routes after deployment; their presence in the sitemap alone does not confirm that a search engine has indexed the updated text.

Legacy routes still function, but a route's existence does not automatically qualify it for the sitemap. Historical service/location combinations, unreviewed municipality pages, duplicate aliases and other unreviewed content are omitted. Promoting another page requires checking its visible content, actual service availability, useful local detail, response HTML, canonical and indexing policy before adding it to the manifest.

German retains the existing URL without a language query. English, Spanish, Portuguese, Italian and French use the existing `?lang=en/es/pt/it/fr` URLs with a self-referencing canonical. Each public translation exposes the same reciprocal set of six `hreflang` links plus `x-default` in its initial HTML, client navigation and sitemap. The default points to German. Unknown tracking and service-selection parameters are omitted from canonicals; saved booking, account and recovery links remain excluded. Business and website identity IDs stay stable while page, breadcrumb and service URLs follow the language. No `/en/` route migration or new location pages were introduced. [Google's localized page guidance](https://developers.google.com/search/docs/specialty/international/localized-versions) requires reciprocal links and describes translated main content as distinct language versions.

When a returning visitor restores a saved non-German preference on a URL without a language selection, the provider adds that language to the visible URL using `replaceState`. It preserves the path, fragment and all unrelated query values. Explicit `lang`/`hl` selections take precedence; the default German URL is left clean. This keeps the personalized body, title and canonical aligned with the visitor's current language URL.

## Generated crawl files

Run from the repository root:

```sh
node --import tsx scripts/generate-sitemap.mjs
node --import tsx scripts/generate-sitemap.mjs --check
node --import tsx --test tests/seo-crawl.test.ts
```

The generator writes `public/robots.txt` and `public/sitemap.xml`. Production builds must run it before Vite copies `public/` to `dist/`. The legacy prerender script also uses this generator, so it cannot restore the former list of every city/service combination. The generator rejects unknown, private, duplicate, noncanonical or nonindexable routes. The `--check` mode fails when either committed crawl file is stale.

The sitemap uses absolute canonical URLs on `https://krakenpfm.ch`, with only the normalized public language query where applicable, without tracking parameters, session links or fragments. It declares the XHTML namespace for its alternate links. It intentionally omits `priority`, `changefreq` and invented modification timestamps. Google ignores the first two; `lastmod` should describe a verifiable significant content change. Sitemap inclusion is a discovery and canonicalization signal, not a promise of indexing. See [Google's sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap) and [canonical URL guidance](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls).

## Search access and private workflows

The shared robots group names `OAI-SearchBot` and `ChatGPT-User` alongside the wildcard agent. This avoids a more specific bot group accidentally bypassing private exclusions. Public HTML and its rendering assets remain crawlable by Google, Bing and ChatGPT search.

The calculator introduction at `/quote` is public. Saved booking/draft links, payment states, capability tokens, customer access, recovery, authentication, demos, review invitations and APIs are excluded from the sitemap and receive the private indexing policy. Robots rules also discourage fetching those workflows and sensitive query parameters. These are crawler preferences, not authentication or authorization. Robots blocking alone does not remove an already indexed URL; a crawler must fetch a response to observe `noindex`. Existing private URL removals therefore need inspection in Search Console rather than assumptions based on robots.txt.

[OpenAI's crawler documentation](https://developers.openai.com/api/docs/bots), checked on 25 November 2026, separates three purposes:

- `OAI-SearchBot` supports ChatGPT search discovery. Hosting or firewall rules must also permit its genuine published IP ranges.
- `ChatGPT-User` performs user initiated visits. It is not the automatic search indexing crawler, and robots.txt rules may not apply to those visits.
- `GPTBot` concerns potential foundation model training. Its prior wildcard public access policy is retained. Search eligibility does not require allowing training; changing training preferences is a separate owner decision.

No `llms.txt`, invented ratings or special AI markup is required by this implementation. [Google's AI feature guidance](https://developers.google.com/search/docs/appearance/ai-features) says ordinary SEO fundamentals still apply and no additional AI text file or special schema is needed.

## After an owner approved deployment

The owner confirmed that Google Search Console and Google Business Profile are already verified. The existing browser session checked on 25 November 2026 did not expose the Kraken Search Console property, so that session could not inspect performance, indexing or sitemap status. No property, account or access settings were changed. Record any subsequent successful account inspection separately. The following checks remain pending in the existing authorized accounts:

1. Open the existing verified Google Search Console property with an account that has access. After publication, submit `https://krakenpfm.ch/sitemap.xml`. Inspect `/einsatzgebiete`, `/reinigung/region-zuerich`, `/reinigung/kanton-schaffhausen` and `/reinigung/region-winterthur`, and representative translated URLs. Confirm the fetched HTML, selected canonical, indexing eligibility and structured data, then request indexing where appropriate. Check excluded legacy URLs separately.
2. Check Bing Webmaster Tools verification, sitemap processing and URL inspection if the owner uses it.
3. Check the existing verified Google Business Profile's real business name, address or service area, contact details, hours and website against the visible site. Edit only facts confirmed by the owner.
4. Review the deployed CDN/WAF and access logs. Confirm genuine Googlebot and OAI-SearchBot requests receive usable HTML rather than a challenge or denial; verify crawler identity against official published ranges before changing firewall rules.
5. Track search impressions, clicks, indexed canonical pages and qualified enquiries over time. No ranking position, ChatGPT citation or indexing date is guaranteed.

The code and deployment checks do not submit a sitemap, request indexing or change an external business account. Those account actions must be recorded separately when access is available.

[Google's recrawl instructions](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl) require an owner or full user for URL Inspection indexing requests. A request can take days or weeks and does not guarantee inclusion; repeating it for the same URL does not make it faster. For ChatGPT search, keep public pages discoverable through working internal links, readable HTML and allowed OAI-SearchBot access. This integration does not claim that ChatGPT has already crawled, indexed or cited these pages. Search visibility is separate from GPTBot training preferences.
