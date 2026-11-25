# Contact intake: local implementation and activation

The form posts JSON to `POST /api/contact/messages`. Its seven fields are validated on both sides. A four-digit Swiss postcode checks formatting only. Phone is optional; a phone/WhatsApp preference without a number falls back to email and this is explained before submission. UI copy is shared across the six existing languages.

Only a successful Firestore Admin transaction can produce `{accepted:true,reference:"KCT-…"}`. `contact_messages` remains visible to authorized staff in the existing dashboard. Its `subject` is derived by the server from service, postcode, preferred/effective channel and supplied telephone; the browser cannot supply a subject. The structured fields are also retained. Contact does not create or confirm a reservation, price, payment or date.

The browser retains the form and its stable content-specific retry key in memory. An uncertain response, timeout or language change keeps those values. A generic HTTP 200 is insufficient for success. Ordinary HTML submission explicitly uses POST, preventing form contents from entering URLs before JavaScript runs. No form values enter localStorage, analytics, application logs or email-provider errors.

## Required private configuration

- `CONTACT_INTAKE_ENABLED=true` only after the configuration below is provisioned.
- `CONTACT_TURNSTILE_SITE_KEY`: public key for a real Cloudflare Turnstile widget registered for the intended hostnames.
- `CONTACT_TURNSTILE_SECRET_KEY`: corresponding server-only secret.
- `CONTACT_INTAKE_SECRET`: random secret of at least 32 characters for keyed fingerprints and rate identities. Existing `BOOKING_TOKEN_SECRET` is a supported fallback, with separate purpose contexts.
- Existing Firebase Admin configuration: `FIREBASE_SERVICE_ACCOUNT_JSON`, `GOOGLE_APPLICATION_CREDENTIALS` or `BOOKING_USE_APPLICATION_DEFAULT=true`. The existing booking project/database defaults and the `kraken-booking` Admin app are reused.
- `CONTACT_ALLOWED_ORIGINS`: exact comma-separated origins; defaults to `https://krakenpfm.ch,https://www.krakenpfm.ch`. Preview hosts must be explicitly provisioned both here and in Turnstile. Local HTTP is accepted only outside production, for localhost/127.0.0.1.

`GET /api/contact/intake/config` exposes only availability and the public widget configuration. Without credentials or enabled protection, it reports unavailable; direct WhatsApp, telephone and email remain usable. No provider keys or accounts were created during this task and no production settings were changed.

Turnstile is loaded explicitly only when available. Its server result must contain `success:true`, the exact request-origin hostname and action `kraken_contact`, plus a fresh challenge timestamp. Siteverify uses the submission UUID as its verification idempotency key. The widget uses compact sizing below 300 px to avoid its documented flexible minimum overflowing small cards. Script/frame CSP entries allow only Cloudflare's challenge host.

## Storage and duplicate protection

- `contact_messages`: durable enquiries and server references; Admin creates, verified authorized staff can manage.
- `kraken_contact_idempotency`: opaque hashed retry keys linked to keyed content fingerprints and the durable record.
- `kraken_contact_rates`: durable keyed IP and email counters. Raw IPs are never saved. Limits are ten attempts per IP per ten minutes and five verified new messages per email per hour. The window resets in code; `deleteAfter` is a Firestore timestamp compatible with an optional TTL policy for expired counters.
- `kraken_contact_outbox`: isolated acknowledgement jobs, never mixed with booking/payment jobs.

Browser SDK access to the latter three collections is denied. Direct browser creation of `contact_messages` is also denied by the proposed rules so it cannot bypass API validation or antispam. These rules still require a separate reviewed deployment. The adapter uses transactions for the enquiry, idempotency row and optional acknowledgement together. Retries reuse the original record/reference, including across server instances. A different payload with the same key returns 409.

Owner decisions remain necessary for the enquiry retention period and operational deletion process; this task does not silently delete existing enquiries. If an enquiry is removed, retain its minimal idempotency tombstone according to that process so a stale retry cannot recreate it. Rate TTL configuration is optional and separate from enquiry retention.

## Optional acknowledgement

Acknowledgement is enabled only by `CONTACT_ACKNOWLEDGEMENT_ENABLED=true`, an existing `RESEND_API_KEY`, verified `BOOKING_EMAIL_FROM` and a `CRON_SECRET` of at least 32 characters. The contact renderer uses Kraken's navy/mint identity, the persisted website language, the real reference and the explicit statement that no booking/payment/date is confirmed. It links to real contact/privacy routes; it does not invent a conversation portal.

After registration, a server-only `GET` or `POST /api/contact/maintenance` with `Authorization: Bearer <CRON_SECRET>` processes at most five queued jobs. Provision a protected scheduler if acknowledgements are enabled. The existing booking cron and booking/payment outboxes are unchanged. Provider calls reuse the existing Resend adapter and a stable per-enquiry idempotency key. Provider acceptance is not delivery. Ambiguous outcomes become `delivery_unknown` and are not automatically resent; only definitely-unsent rate-limit failures retry, with a bound of three attempts.

Registration succeeds independently of email configuration and the UI never claims that an email was delivered. All verification used test doubles/local HTTP; no real email was sent.

## Checks

`tests/contact-intake.test.ts` covers required/optional fields, whitelist validation, origin/honeypot, frequency limits, actual Siteverify result checks, missing configuration, failed writes, lost responses after commit, cross-handler retries, language snapshots, false-success rejection and bounded isolated email dispatch. `tests/contact-intake-store.test.ts` uses a strict atomic transaction double to check concurrent duplicate creates, no partial commit, durable frequency windows and exclusive outbox leases; it does not claim a live Firestore test. Existing contact copy/SSR and Firestore-emulator suites validate the visible translations and client-access boundary separately. Browser QA of the configured external widget requires a real site key for the preview hostname; it must not use production visitors or client email addresses as test recipients.

Sources: [Cloudflare server validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/), [widget configuration](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/widget-configurations/), [Vercel request headers](https://vercel.com/docs/headers/request-headers).
