import test from 'node:test';
import assert from 'node:assert/strict';
import { bookingMailStatusKey, fetchRecoveryEmailAvailability, recoveryEmailAvailable } from '../src/booking/emailAvailability.ts';
import { bookingText } from '../src/booking/uiCopy.ts';

test('unavailable email never turns queued requests or receipts into a preparation or sent notice', () => {
  for (const receipt of [false, true]) {
    for (const state of ['queued', 'sending'] as const) {
      assert.equal(bookingMailStatusKey(state, receipt, false), null);
      assert.equal(bookingMailStatusKey(state, receipt, true), receipt ? 'receiptQueued' : 'mailQueued');
    }
    assert.equal(bookingMailStatusKey(undefined, receipt, true), null);
  }
  assert.match(bookingText('es', 'mailUnavailable'), /no está disponible.*solicitud sigue guardada.*referencia/s);
  assert.match(bookingText('es', 'emailUnavailableBeforeRequest'), /Puede enviar su solicitud.*guarde la referencia/s);
});

test('a previous sent or uncertain delivery remains tied to its real provider status', () => {
  for (const ready of [false, true]) {
    assert.equal(bookingMailStatusKey('sent', false, ready), 'mailSent');
    assert.equal(bookingMailStatusKey('sent', true, ready), 'receiptSent');
    for (const state of ['failed', 'delivery_unknown'] as const) {
      assert.equal(bookingMailStatusKey(state, false, ready), 'mailFailed');
      assert.equal(bookingMailStatusKey(state, true, ready), 'mailFailed');
    }
  }
  assert.match(bookingText('es', 'mailFailed'), /no está confirmado.*Contacte.*antes de intentar otro envío/s);
});

test('saved quote recovery requires both explicit recovery enablement and email readiness', () => {
  for (const payload of [null, undefined, [], {}, { enabled: true }, { emailReady: true },
    { enabled: false, emailReady: true }, { enabled: true, emailReady: false },
    { enabled: 'true', emailReady: true }, { enabled: true, emailReady: 'true' }]) {
    assert.equal(recoveryEmailAvailable(payload), false, JSON.stringify(payload));
  }
  assert.equal(recoveryEmailAvailable({ enabled: true, emailReady: true }), true);
  // A configured booking mail provider with no recovery secret is still blocked.
  assert.equal(recoveryEmailAvailable({ available: true, emailReady: true, enabled: false }), false);
});

test('recovery availability loader uses GET only and fails closed on HTTP, JSON and network errors', async () => {
  const controller = new AbortController();
  const cases: [() => Response | Promise<Response>, boolean][] = [
    [() => Response.json({ enabled: true, emailReady: true }), true],
    [() => Response.json({ enabled: false, emailReady: true }), false],
    [() => Response.json({ enabled: true, emailReady: false }), false],
    [() => Response.json({ enabled: true, emailReady: true }, { status: 503 }), false],
    [() => new Response('<html>not a config</html>', { headers: { 'content-type': 'text/html' } }), false],
    [() => new Response('{', { headers: { 'content-type': 'application/json' } }), false],
    [() => { throw new Error('offline'); }, false],
    [() => { throw new DOMException('cancelled', 'AbortError'); }, false],
  ];
  let calls = 0;
  for (const [makeResponse, expected] of cases) {
    const fetcher = (async (input, options) => {
      calls++;
      assert.equal(input, '/api/recovery/config');
      assert.equal(options?.method, 'GET');
      assert.equal(options?.body, undefined);
      assert.equal(options?.credentials, 'same-origin');
      assert.equal(options?.signal, controller.signal);
      return makeResponse();
    }) as typeof fetch;
    assert.equal(await fetchRecoveryEmailAvailability(fetcher, controller.signal), expected);
  }
  assert.equal(calls, cases.length);
});

test('lost access guidance supports people who never received an email', () => {
  const copy = bookingText('es', 'returnMissing');
  assert.match(copy, /enlace personal si lo tiene/);
  assert.match(copy, /contacte con Kraken indicando su referencia/);
  assert.doesNotMatch(copy, /Abre el enlace personal de tu correo/);
});
