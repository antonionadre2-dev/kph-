# Kraken customer email collection

Server-only copy of the supplied version1.2.0 collection:30templates, six catalogs and one distinct illustration for each template. Public images and the original logo are under `public/kraken-emails/assets/`; PNG bytes are preserved exactly from the supplied ZIP. The original reference sources remain in `reference/kraken-emails/`.

`prepareCollectionEnvelope(notificationSnapshot, authorisedLinks, origin)` calls `prepareServerEmail()` in production mode with the persisted language, revision and recipient. It has no database or transport. Its caller must load a trusted outbox row, create and authorize links close to the first attempt, persist the resulting envelope, preserve it on retries, and enforce event/recipient deduplication. Template event strings are validation, not evidence that an event happened.

Exports include `catalogs`, `TEMPLATE_REVISION`, `renderEmail`, `prepareServerEmail`, all language helpers, localized service labels, preparation instructions and artwork mapping. `brandForLanguage()` provides the confirmed public sender/Reply-To and localized home/privacy links. Only HTTPS website origins without credentials, paths, queries or fragments are accepted. No secret or demonstration data is imported by the runtime modules.

Integration adaptations:

- Spanish follows the formal `usted` voice and `limpieza de fin de alquiler` already used by the site.
- Email-only saved selections use a neutral greeting and omit unknown names from subjects and preheaders. Unknown localities omit only the optional location phrase. No name is inferred from an email and no locality is invented.
- All secondary actions say “Contact Kraken” in the corresponding language, matching the existing contact route. They do not pretend to offer calendar exports or an unavailable customer portal.
- Body values and lists use16px; regular labels use14px. CTA labels have no decorative arrow. The reason for receiving a message appears in both HTML and plain text.
- The interactive unsubscribe page is represented by `List-Unsubscribe`; `List-Unsubscribe-Post` is removed by the production wrapper because the current route does not implement RFC8058 one-click POST.
- Unknown template revisions are rejected so a deployment cannot silently render a queued notification against an unsupported revision.

The existing sender, database, event verification and activation gates are owned by the booking/recovery runtime. These modules never activate communications, infer a payment, confirm availability or send an email themselves.

Validation: `node --import tsx --test tests/email-collection-render.test.mjs` checks all180production combinations, language isolation, missing dynamic translations, neutral email-only selections, event-state guards, authorized links, footer/signature, PNG decoding and unique artwork. The original package tests, language demo and gallery build run independently in the reference directory and are synthetic.
