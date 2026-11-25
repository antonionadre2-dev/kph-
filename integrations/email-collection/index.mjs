import de from './content/catalog.de.json' with { type: 'json' };
import en from './content/catalog.en.json' with { type: 'json' };
import es from './content/catalog.es.json' with { type: 'json' };
import fr from './content/catalog.fr.json' with { type: 'json' };
import it from './content/catalog.it.json' with { type: 'json' };
import pt from './content/catalog.pt.json' with { type: 'json' };
import { defaultBrand, renderEmail } from './render.mjs';
import { languageForBackgroundEmail, normalizeEmailLanguage } from './language.mjs';
import { prepareServerEmail } from './server-email.mjs';

export * from './language.mjs';
export { renderEmail, prepareServerEmail };
export { labels, localeTags, serviceNames } from './labels.mjs';
export { preparation } from './preparation.mjs';
export { emailArtwork } from './artwork.mjs';
export const TEMPLATE_REVISION = '1.2.0';
export const catalogs = Object.freeze({ de, en, es, fr, it, pt });

function siteOrigin(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || !['', '/'].includes(url.pathname)) {
    throw new TypeError('An HTTPS website origin without credentials, path, query or fragment is required.');
  }
  return url.origin;
}

/** Public identity only. Transport credentials never enter the renderer. */
export function brandForLanguage(language, origin = 'https://krakenpfm.ch') {
  const selected = normalizeEmailLanguage(language);
  const base = siteOrigin(origin);
  return Object.freeze({
    ...defaultBrand,
    name: 'Kraken PFM',
    email: 'kai@krakenpfm.ch',
    replyToEmail: 'kai@krakenpfm.ch',
    address: `Seewadelstrasse 3 · 8203 Schaffhausen · ${{de:'Schweiz',en:'Switzerland',es:'Suiza',fr:'Suisse',it:'Svizzera',pt:'Suíça'}[selected]}`,
    website: `${base}/?lang=${selected}`,
    privacyUrl: `${base}/gdpr?lang=${selected}`,
    instagram: null,
  });
}

/** Called with a trusted persisted outbox snapshot, never browser render data. */
export function prepareCollectionEnvelope(notificationSnapshot, links, origin = 'https://krakenpfm.ch') {
  const language = languageForBackgroundEmail(notificationSnapshot?.languageSnapshot);
  if (notificationSnapshot.templateRevision !== TEMPLATE_REVISION) throw new TypeError('Unsupported persisted email template revision.');
  const base = siteOrigin(origin);
  const envelope = prepareServerEmail({
    templateId: notificationSnapshot.templateId,
    notificationSnapshot,
    links,
  }, {
    catalogs,
    brand: brandForLanguage(language, base),
    assetBaseUrl: `${base}/kraken-emails/assets`,
  });
  // The current unsubscribe route is an interactive confirmation page. Do not
  // advertise RFC8058 one-click POST support that it does not implement.
  const headers = { ...envelope.headers };
  delete headers['List-Unsubscribe-Post'];
  return Object.freeze({ ...envelope, headers: Object.freeze(headers) });
}
