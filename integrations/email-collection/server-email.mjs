import { languageForBackgroundEmail, normalizeEmailLanguage } from './language.mjs';
import { renderEmail } from './render.mjs';

function object(value, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${field} must be an object.`);
  return value;
}

function textValue(value, field) {
  if (typeof value !== 'string' || !value.trim() || value !== value.trim() || value.length > 256 || /[\r\n\u0000]/.test(value)) {
    throw new TypeError(`${field} must be a non-empty, bounded string without control characters.`);
  }
  return value;
}

function mailbox(value, field) {
  textValue(value, field);
  if (!/^[^\s@<>(),;]+@[^\s@<>(),;]+\.[^\s@<>(),;]+$/.test(value)) throw new TypeError(`${field} must be one email address.`);
  return value;
}

function sameIfPresent(value, expected, field) {
  if (value !== undefined && value !== null && value !== expected) throw new Error(`${field} conflicts with the persisted notification snapshot.`);
}

/**
 * Prepare one provider-neutral envelope. This function performs NO database,
 * payment, queue or network operations and cannot prove an object's DB origin.
 * Call it ONLY with a trusted server snapshot loaded from the existing outbox.
 *
 * Required notificationSnapshot fields:
 *   id: stable outbox notification ID (opaque ASCII token, <=128 characters)
 *   eventId, eventType, entityId, recipientIdentity, recipientEmail
 *   templateId, templateRevision
 *   languageSnapshot: {language, source, version:1}
 *   renderData: server-approved data expected by renderEmail()
 *
 * The website's selected language must already have been validated and saved
 * before creating the outbox row. renderData.language is deliberately ignored:
 * a browser, administrator or webhook locale must never override that snapshot.
 * Recipient and event fields duplicated in renderData must agree with it.
 *
 * `links` contains fresh authorised URLs built when the message becomes due,
 * before its FIRST attempt. This function never edits or signs URLs. Persist
 * the returned envelope before attempting a send; retries reuse that envelope
 * and its idempotency key instead of calling this function with new data.
 *
 * The caller must enforce a durable unique constraint for the logical business
 * notification (event + template + recipient identity). Language and template
 * revision must NOT generate another notification for an existing event. The
 * key below depends only on the persisted notification ID. A successful render
 * does not claim provider acceptance or delivery, and is not Payrexx validation.
 *
 * Required configured brand values: name, email, privacyUrl. replyToEmail is
 * optional and defaults to brand.email. Map `from` to the existing provider's
 * sender format; do not blindly interpolate the name into a raw mail header.
 */
export function prepareServerEmail(
  { templateId, notificationSnapshot, links } = {},
  { catalogs, brand, assetBaseUrl } = {}
) {
  const snapshot = object(notificationSnapshot, 'notificationSnapshot');
  const notificationId = textValue(snapshot.id, 'notificationSnapshot.id');
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(notificationId)) {
    throw new TypeError('notificationSnapshot.id must be a stable opaque ASCII token.');
  }
  for (const field of ['eventId', 'eventType', 'entityId', 'recipientIdentity', 'templateId', 'templateRevision']) {
    textValue(snapshot[field], `notificationSnapshot.${field}`);
  }
  textValue(templateId, 'templateId');
  sameIfPresent(templateId, snapshot.templateId, 'templateId');

  const language = languageForBackgroundEmail(snapshot.languageSnapshot);
  if (snapshot.emailLanguage !== undefined && snapshot.emailLanguage !== null) {
    sameIfPresent(normalizeEmailLanguage(snapshot.emailLanguage), language, 'notificationSnapshot.emailLanguage');
  }
  const to = mailbox(snapshot.recipientEmail, 'notificationSnapshot.recipientEmail');
  const data = object(snapshot.renderData, 'notificationSnapshot.renderData');
  const customer = object(data.customer, 'renderData.customer');
  sameIfPresent(customer.email, to, 'renderData.customer.email');
  sameIfPresent(customer.id, snapshot.recipientIdentity, 'renderData.customer.id');
  sameIfPresent(data.customerId, snapshot.recipientIdentity, 'renderData.customerId');
  sameIfPresent(data.entityId, snapshot.entityId, 'renderData.entityId');
  sameIfPresent(data.templateId, snapshot.templateId, 'renderData.templateId');
  if (data.event !== undefined && data.event !== null) {
    object(data.event, 'renderData.event');
    sameIfPresent(data.event.id, snapshot.eventId, 'renderData.event.id');
    sameIfPresent(data.event.type, snapshot.eventType, 'renderData.event.type');
  }

  object(links, 'links');
  // Signed URLs can legitimately be much longer than an identifier or header.
  // The production renderer validates their protocol and control characters.
  if (typeof links.primary !== 'string' || !links.primary) throw new TypeError('links.primary must be a fresh authorised URL.');
  const configuredBrand = object(brand, 'brand');
  const fromName = textValue(configuredBrand.name, 'brand.name');
  const fromEmail = mailbox(configuredBrand.email, 'brand.email');
  const replyTo = mailbox(configuredBrand.replyToEmail ?? fromEmail, 'brand.replyToEmail');

  const result = renderEmail(templateId, {
    ...data,
    language,
    customer: { ...customer, email: to },
    event: { id: snapshot.eventId, type: snapshot.eventType },
    links: { ...links }
  }, { mode: 'production', catalogs, brand: configuredBrand, assetBaseUrl });

  return Object.freeze({
    notificationId,
    idempotencyKey: `kraken-email:${notificationId}`,
    to,
    from: Object.freeze({ name: fromName, email: fromEmail }),
    replyTo,
    subject: result.subject,
    html: result.html,
    text: result.text,
    headers: Object.freeze({ ...result.headers, 'Content-Language': language }),
    language,
    templateId,
    templateRevision: snapshot.templateRevision
  });
}
