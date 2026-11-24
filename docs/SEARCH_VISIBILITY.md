# Search visibility and crawler policy

The public search surface is deliberately small: 24 reviewed canonical routes, backed by readable HTML and matching page metadata. These are the homepage, services, about, contact, the calculator introduction, coverage overview, three regional pages, and five core services in Zürich, Schaffhausen and Winterthur. `src/seo/crawl-policy.ts` contains the shared `INDEXABLE_PATHS` manifest; `src/seo/metadata.ts` determines each response's canonical URL and indexing policy.

Legacy routes still function, but a route's existence does not automatically qualify it for the sitemap. Historical service/location combinations, unreviewed municipality pages, duplicate aliases and other unreviewed content are omitted. Promoting another page requires checking its visible content, actual service availability, useful local detail, response HTML, canonical and indexing policy before adding it to the manifest.

Language selections remain user preferences on the same base canonical URL. The sitemap does not invent separate language pages or `hreflang` relationships. A later multilingual indexing project must establish stable translated pages, matching canonicals and reciprocal language links first. [Google's localized page guidance](https://developers.google.com/search/docs/specialty/international/localized-versions) explains those requirements.

## Generated crawl files

Run from the repository root:

```sh
node --import tsx scripts/generate-sitemap.mjs
node --import tsx scripts/generate-sitemap.mjs --check
node --import tsx --test tests/seo-crawl.test.ts
```

The generator writes `public/robots.txt` and `public/sitemap.xml`. Production builds must run it before Vite copies `public/` to `dist/`. The legacy prerender script also uses this generator, so it cannot restore the former list of every city/service combination. The generator rejects unknown, private, duplicate, noncanonical or nonindexable routes. The `--check` mode fails when either committed crawl file is stale.

The sitemap uses absolute canonical URLs on `https://krakenpfm.ch`, without tracking parameters, session links or fragments. It intentionally omits `priority`, `changefreq` and invented modification timestamps. Google ignores the first two; `lastmod` should describe a verifiable significant content change. Sitemap inclusion is a discovery and canonicalization signal, not a promise of indexing. See [Google's sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap) and [canonical URL guidance](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls).

## Search access and private workflows

The shared robots group names `OAI-SearchBot` and `ChatGPT-User` alongside the wildcard agent. This avoids a more specific bot group accidentally bypassing private exclusions. Public HTML and its rendering assets remain crawlable by Google, Bing and ChatGPT search.

The calculator introduction at `/quote` is public. Saved booking/draft links, payment states, capability tokens, customer access, recovery, authentication, demos, review invitations and APIs are excluded from the sitemap and receive the private indexing policy. Robots rules also discourage fetching those workflows and sensitive query parameters. These are crawler preferences, not authentication or authorization. Robots blocking alone does not remove an already indexed URL; a crawler must fetch a response to observe `noindex`. Existing private URL removals therefore need inspection in Search Console rather than assumptions based on robots.txt.

[OpenAI's crawler documentation](https://developers.openai.com/api/docs/bots), checked on 24 November 2026, separates three purposes:

- `OAI-SearchBot` supports ChatGPT search discovery. Hosting or firewall rules must also permit its genuine published IP ranges.
- `ChatGPT-User` performs user initiated visits. It is not the automatic search indexing crawler, and robots.txt rules may not apply to those visits.
- `GPTBot` concerns potential foundation model training. Its prior wildcard public access policy is retained. Search eligibility does not require allowing training; changing training preferences is a separate owner decision.

No `llms.txt`, invented ratings or special AI markup is required by this implementation. [Google's AI feature guidance](https://developers.google.com/search/docs/appearance/ai-features) says ordinary SEO fundamentals still apply and no additional AI text file or special schema is needed.

## After an owner approved deployment

The owner confirmed that Google Search Console and Google Business Profile are already verified. A read-only browser check on 24 November 2026 found that the active Google session could not access the Kraken Search Console property, so performance, indexing and sitemap status could not be inspected. No property, account or access settings were changed. The following checks remain pending in the existing authorized accounts:

1. Open the existing verified Google Search Console property with an account that has access. After publication, submit `/sitemap.xml` and inspect representative public URLs. Confirm the fetched HTML, selected canonical, indexing eligibility and structured data. Check excluded legacy URLs separately.
2. Check Bing Webmaster Tools verification, sitemap processing and URL inspection if the owner uses it.
3. Check the existing verified Google Business Profile's real business name, address or service area, contact details, hours and website against the visible site. Edit only facts confirmed by the owner.
4. Review the deployed CDN/WAF and access logs. Confirm genuine Googlebot and OAI-SearchBot requests receive usable HTML rather than a challenge or denial; verify crawler identity against official published ranges before changing firewall rules.
5. Track search impressions, clicks, indexed canonical pages and qualified enquiries over time. No ranking position, ChatGPT citation or indexing date is guaranteed.

The code and deployment checks do not submit a sitemap, request indexing or change an external business account. Those account actions must be recorded separately when access is available.
