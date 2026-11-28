import test from 'node:test';
import assert from 'node:assert/strict';
import { paymentUiState, checkoutErrorKey } from '../src/booking/paymentUi.ts';
import { bookingText } from '../src/booking/uiCopy.ts';

const now = Date.parse('2026-11-25T12:00:00Z');
const hold = new Date(now + 60_000).toISOString();
const held = { canCheckout: true, scheduling: { status: 'held', holdExpiresAt: hold }, payment: { status: 'not_started' } };

test('a server-approved payment action expires at the actual appointment hold boundary', () => {
  assert.deepEqual(paymentUiState(held, now), { checkoutHasExpired: false, holdHasExpired: false, canOpenCheckout: true, nextUpdateAt: now + 60_000 });
  assert.deepEqual(paymentUiState(held, now + 60_000), { checkoutHasExpired: false, holdHasExpired: true, canOpenCheckout: false, nextUpdateAt: null });
  assert.equal(paymentUiState(held, now + 90_000).canOpenCheckout, false);
  assert.equal(paymentUiState({ ...held, canCheckout: false }, now).canOpenCheckout, false, 'a future date does not create server permission');
  assert.equal(paymentUiState({ ...held, scheduling: { status: 'requested' }, canCheckout: false }, now).canOpenCheckout, false);
});

test('a pending provider payment follows its checkout deadline and never becomes a failed appointment by the clock', () => {
  const pending = { ...held, scheduling: { status: 'held', holdExpiresAt: new Date(now - 1).toISOString() }, payment: { status: 'pending', checkoutExpiresAt: hold } };
  const waiting = paymentUiState(pending, now);
  assert.equal(waiting.holdHasExpired, false);
  assert.equal(waiting.checkoutHasExpired, false);
  assert.equal(waiting.canOpenCheckout, false, 'an expired hold still prevents reopening checkout while verification continues');
  assert.equal(waiting.nextUpdateAt, now + 60_000);
  assert.equal(paymentUiState(pending, now + 60_000).canOpenCheckout, false);
  assert.equal(paymentUiState(pending, now + 60_000).checkoutHasExpired, true);
});

test('paid, test and terminal payment states cannot reopen checkout or become hold-expired notices', () => {
  for (const status of ['paid', 'test_paid', 'refunded', 'partially_refunded', 'chargeback', 'disputed', 'reconciliation_required']) {
    const result = paymentUiState({ ...held, payment: { status }, scheduling: { status: 'held', holdExpiresAt: new Date(now - 1).toISOString() } }, now);
    assert.equal(result.canOpenCheckout, false, status);
    assert.equal(result.holdHasExpired, false, status);
    assert.equal(result.nextUpdateAt, null, status);
  }
  assert.equal(paymentUiState(null, now).canOpenCheckout, false);
  assert.equal(paymentUiState({ ...held, scheduling: { status: 'held', holdExpiresAt: 'invalid' } }, now).holdHasExpired, false, 'malformed dates do not invent an expiry');
});

test('checkout conflicts preserve their real cause instead of all claiming a changed price', () => {
  assert.equal(checkoutErrorKey({ status: 409, code: 'PRICE_CHANGED' }), 'priceChanged');
  assert.equal(checkoutErrorKey({ status: 409, code: 'CHECKOUT_EXPIRED' }), 'checkoutExpired');
  assert.equal(checkoutErrorKey({ status: 409, code: 'CHECKOUT_NOT_AVAILABLE' }), 'paymentUnavailable');
  assert.equal(checkoutErrorKey({ status: 409, code: 'PAYMENT_MODE_CHANGED' }), 'paymentModeChanged');
  assert.equal(checkoutErrorKey({ status: 409, code: 'PAYMENT_RECONCILIATION_REQUIRED' }), 'paymentReviewRequired');
  assert.equal(checkoutErrorKey({ status: 503, code: 'PAYMENT_OUTCOME_UNKNOWN' }), 'paymentReviewRequired');
  assert.equal(checkoutErrorKey({ status: 503, code: 'PAYMENT_NOT_CONFIGURED' }), 'paymentUnavailable');
  assert.equal(checkoutErrorKey({ status: 503, code: 'INVALID_CHECKOUT_URL' }), 'paymentUnavailable');
  assert.equal(checkoutErrorKey({ status: 400, code: 'TERMS_REQUIRED' }), 'checkRequired');
  assert.equal(checkoutErrorKey({ status: 409, code: 'UNKNOWN_CONFLICT' }), 'networkError');
  assert.equal(checkoutErrorKey(null), 'networkError');
});

test('all six languages explain the next payment step and distinguish expiry from a new quote', () => {
  const keys = ['paymentNextStep', 'paymentReadyStep', 'holdExpiredTitle', 'holdExpiredBody', 'paymentUnavailable', 'paymentReviewRequired', 'paymentModeChanged'];
  for (const language of ['de', 'en', 'es', 'fr', 'it', 'pt']) {
    for (const key of keys) {
      const value = bookingText(language, key);
      assert.ok(value && value !== key, `${language}:${key}`);
      if (language !== 'de') assert.notEqual(value, bookingText('de', key));
    }
    assert.ok(bookingText(language, 'paymentNextStep').includes(bookingText(language, 'refresh')));
    assert.match(bookingText(language, 'paymentReadyStep'), /Payrexx/);
    assert.notEqual(bookingText(language, 'paymentUnavailable'), bookingText(language, 'priceChanged'));
  }
  assert.match(bookingText('es', 'paymentReviewRequired'), /No inicie otro pago/);
});

test('full prepayment uses service-start checkout availability, independently of an earlier payment due date',()=>{
 const full={canCheckout:true,scheduling:{status:'confirmed',holdExpiresAt:new Date(now-1).toISOString()},payment:{model:'full_prepayment',status:'awaiting_payment',checkoutAvailableUntil:hold}};
 assert.equal(paymentUiState(full,now).canOpenCheckout,true);
 assert.equal(paymentUiState(full,now+60_000).canOpenCheckout,false);
 assert.equal(paymentUiState(full,now+60_000).holdHasExpired,true);
 assert.equal(paymentUiState({...full,canCheckout:false},now).canOpenCheckout,false);
});
