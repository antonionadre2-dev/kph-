# Route migration for review — no production deployment

German remains the Swiss German reference without a prefix. English, Spanish, Portuguese, Italian and French use `/en/`, `/es/`, `/pt/`, `/it/` and `/fr/`. Every reviewed translation has a self canonical, six reciprocal language links and German `de-CH` as `x-default`. The sitemap contains the same 24 reviewed pages in six languages: 144 canonical URLs, each with a 200 route policy. No unverified modification dates were added.

| Previous URL | Current URL | Status |
| --- | --- | --- |
| `/about` | `/ueber-uns` | 301 |
| `/quote?lang=es&service=end` | `/es/offerte?service=end` | 301 |
| `/services/zurich/end-of-tenancy?hl=fr` | `/fr/umzugsreinigung/zuerich` | 301 |
| `/services/winterthur/daily-cleaning` | `/wohnungsreinigung/winterthur` | 301 |
| `/reinigung/uster` | `/reinigung/region-zuerich` | 301 |
| `/reinigung/neuhausen-am-rheinfall` | `/reinigung/kanton-schaffhausen` | 301 |
| `/services/zurich/gardening` | Removed service | 410 |
| `/commercial` | Removed business page | 410 |

`src/routing/site-paths.ts` is the shared URL authority for native links, navigation and metadata. `src/routing/route-policy.ts` defines permanent redirects and removed routes. Legacy language parameters are removed after the locale is moved to the prefix. Other query values, repeated query keys, service selection and opaque booking/recovery values are preserved. Native links preserve fragments; a browser retains its original fragment across an HTTP redirect whose Location has no fragment. Unknown routes remain 404. API and asset URLs are not language-prefixed.

The reproducible inventory reads four historical sitemap revisions through the pre-migration base `d299da3` from Git and the aliases that the former router accepted. Its complete table is [ROUTE_MIGRATION.csv](./ROUTE_MIGRATION.csv): 735 inventoried URLs, with 284 redirects, 441 removals, 10 retained URLs and no unhandled route. Historical municipality URLs map to their existing parent regional hub; this is not a claim that a date or service at every surrounding address is confirmed. The regional pages request the actual address and check the job individually.

[URL_REMOVALS.csv](./URL_REMOVALS.csv) lists the 410 URLs whose former search results should be retired. After an approved deployment, inspect representative redirects/removals and submit the current sitemap through the existing authorized Search Console property. A 410 must remain fetchable so search engines can observe it. This PR does not remove results from Google or guarantee when they change.

`/quote-demo` and `/commercial-quote` are retained with `noindex`: current usage has not been confirmed. The owner must decide whether to retire those flows. Customer access, authentication, review invitations and opaque saved booking links remain outside the sitemap. The renamed calculator retains no-store caching and no-referrer handling, including translated prefixes.

Service JSON-LD derives numeric offers from the same calculator engine and visible price cards. The moving calculator returns no numeric price, so no moving price is invented. End-of-tenancy FAQs and regional/service FAQs match visible content; FAQ markup does not promise a rich result. The single business entity uses its operating name, the true Schaffhausen address, and coordinates from the official Swiss building address register record `102196962`, checked on 25 November 2026. `priceRange` describes the published calculator-derived end-of-tenancy starting example rather than inventing an upper total. Insurance coverage, any unconfirmed commercial conditions, verified reviews, and a response-time commitment remain owner decisions.

Run `node --import tsx scripts/audit-route-migration.mjs` to regenerate the CSV files. Tests cover the complete inventory, all 144 canonical language URLs and a plain Node server graph with real local HTTP requests for public pages, redirects, 410/404 responses, private indexing, security headers and CORS. No production account, DNS or search account is changed by these checks.
