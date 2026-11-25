# Kraken icon in browsers and search

The public PNG icons had been passed through UTF-8 text encoding: the PNG signature byte `89` had become `EF BF BD`, and compressed image data was also corrupted. They returned HTTP200 and `image/png` but were not decodable. The ICO container had the same corruption inside its embedded PNG frames and invalid offsets as a result. This provides a concrete cause for the generic globe in the supplied Google screenshot, independently of crawl delays.

The approved original binaries were restored byte for byte from `Kraken-PFM-Codigo-7986211.zip`, including PNG16–1024, three-frame ICO, Apple touch icon and Android/maskable icons. The original `favicon.png` placeholder was invalid even in that archive; it now aliases the approved96px PNG. The original brand artwork and URLs are preserved. The ICO declaration lists its real16/32/48 sizes instead of claiming scalable `any`.

Every application page inherits these links from `index.html`. Server SEO injection preserves them in all six languages. The existing manifest uses the repaired Android files. The original public paths are crawlable, return image MIME types, and are not blocked by robots.txt. No special Googlebot HTML or user-agent-specific behavior is used.

`tests/favicon-integrity.test.ts` decodes all15 PNG files and all three ICO frames, verifies bounds and dimensions, checks manifest references and checks the head after server injection. This catches broken binary files even if status, extension and Content-Type all look correct.

After deployment, verify the actual CDN responses decode as well, including `/favicon.ico`, `/favicon-96x96.png`, `/apple-touch-icon.png` and manifest icons. Request a recrawl of the homepage using Search Console URL Inspection when that account is available. An indexing request is not confirmation that the displayed search result has updated.

[Google's official favicon documentation](https://developers.google.com/search/docs/appearance/favicon-in-search) requires a square icon, a stable URL and access for Googlebot/Home and Googlebot-Image/icon. It currently recommends resolution larger than48px. Processing can take days to weeks, and display is not guaranteed. The96px PNG and larger application icons satisfy the resolution recommendation. The same valid ICO/PNG resources work with conventional browser favicon discovery; the exact icon shown by any search engine remains its decision.
