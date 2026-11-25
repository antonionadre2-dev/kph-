import test from 'node:test';
import assert from 'node:assert/strict';
import { renderBookingEmail } from '../server/booking-email.ts';
import { renderRecoveryEmail } from '../integrations/recovery/emails.mjs';
import { calculatePrice, defaultSelection } from '../src/booking/pricing.ts';
import { buildMovingGuide, movingGuideHtml } from '../src/booking/movingGuide.ts';
import { customerAccessText } from '../src/booking/customerAccessCopy.ts';

const informal = /\b(?:tu|tus|tú|te|ti|contigo|puedes|tienes|necesitas|quieres|quieras|recibirás|verás|pagues|darte|registrarte)\b/i;

test('real Spanish request and receipt templates use formal address and the approved service name', () => {
  const quote = calculatePrice(defaultSelection('endOfTenancy'));
  assert.equal(typeof quote.totalCents, 'number');
  const paid = Math.round(quote.totalCents! * 0.15);
  for (const kind of ['request', 'receipt'] as const) {
    const booking = {
      language: 'es', mode: 'live', bookingId: 'example-booking', reference: 'K-EXAMPLE', quote,
      scheduling: { status: kind === 'receipt' ? 'confirmed' : 'requested', date: '2026-12-15', time: '10:00' },
      customer: { name: 'Cliente de ejemplo', address: 'Ejemplo 1', postalCode: '8200', city: 'Schaffhausen' },
      payment: { amountPaidCents: paid, remainingBalanceCents: quote.totalCents! - paid },
    };
    const message = renderBookingEmail(booking, kind, 'https://kraken.example', 'example-token');
    assert.match(message.subject, kind === 'request' ? /su solicitud/ : /su pago/);
    assert.match(message.text, /Limpieza de fin de alquiler/);
    assert.match(message.text, /K-EXAMPLE/);
    assert.ok(message.text.includes(`CHF ${(quote.totalCents! / 100).toFixed(2)}`));
    assert.ok(message.text.includes('https://kraken.example/quote?booking=example-booking&lang=es#access=example-token'));
    assert.doesNotMatch(message.subject + '\n' + message.text, informal);
    assert.doesNotMatch(message.text, /fin de contrato/i);
  }
});

test('Spanish saved quotes, both reminders and their moving guides keep formal copy in real email output', () => {
  const resumeUrl = 'https://kraken.example/quote?draft=example#resume=example-token';
  for (const service of ['moving', 'endOfTenancy'] as const) {
    const selection = defaultSelection(service);
    for (const kind of ['saved', 'reminder1', 'reminder2']) {
      const message = renderRecoveryEmail({
        draft: { language: 'es', selection, quote: calculatePrice(selection) }, kind, resumeUrl,
        unsubscribeUrl: 'https://kraken.example/recovery/unsubscribe?draft=example#token=example-token',
        publicBaseUrl: 'https://kraken.example',
      });
      assert.match(message.html, /<html lang="es">/);
      assert.match(message.text, /Su plan personal de mudanza/);
      assert.ok(message.text.includes(resumeUrl));
      if (service === 'endOfTenancy') assert.match(message.text, /Limpieza de fin de alquiler/);
      assert.doesNotMatch(message.subject + '\n' + message.text, informal);
      assert.doesNotMatch(message.text, /fin de contrato/i);
    }
  }
});

test('the Spanish downloadable guide and account access match the formal email tone', () => {
  const guide = buildMovingGuide({ language: 'es', service: 'endOfTenancy', preferences: { from: 'zurich', to: 'schaffhausen', vehicle: true } });
  assert.match(guide.copy.title, /Su nueva casa/);
  assert.match(movingGuideHtml(guide), /Limpieza de fin de alquiler/);
  assert.doesNotMatch(JSON.stringify(guide.copy), informal);
  for (const key of ['title', 'queued', 'unavailable', 'failed', 'verifyHint', 'personal', 'noLink'] as const) {
    assert.doesNotMatch(customerAccessText('es', key), informal);
  }
  assert.match(customerAccessText('es', 'queued'), /Revise su correo/);
});
