import test from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import { checkPayrexxConnection, runPayrexxConnectionCheckOnce } from '../server/payrexx-connection-check.ts';

const secret = 'SYNTHETIC-SECRET-NEVER-OUTPUT';
const instance = 'local-diagnostic-test';
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const providers = () => json({ status: 'success', data: [{ id: 44, name: secret, availableBalance: [{ currency: 'CHF', amount: '999999' }], paymentMethods: ['visa'], activePaymentMethods: ['visa'] }, { id: 36, activePaymentMethods: ['visa'] }, { id: 55, activePaymentMethods: ['visa'] }] });
const method = (options: unknown) => ({ id: 'visa', options_by_psp: options });
const option = (mode: unknown = 'live', currencies: unknown = ['CHF'], types: unknown = ['one-time']) => ({ mode, currencies, payment_types: types });
const invoke = (responses: Response[]) => {
  const calls: { url: URL; options: RequestInit }[] = [];
  const fetchImpl = (async (input, options) => { calls.push({ url: new URL(String(input)), options: options! }); const response = responses.shift(); if (!response) throw new Error(secret); return response; }) as typeof fetch;
  return { calls, result: checkPayrexxConnection({ instance, apiSecret: secret, fetchImpl }) };
};

test('only two read-only official requests, CHF/one-time filtering and strictly sanitized output', async () => {
  const { calls, result } = invoke([providers(), json({ status: 'success', data: [method({ 44: option('live'), 36: option('TEST'), 55: option(null), 12: option('live', ['EUR']), 15: option('live', ['CHF'], ['authorization']) })] })]);
  assert.deepEqual(await result, { authStatus: 'accepted', methodsChecked: true, liveCHFOneTimeAvailable: true, testCHFOneTimeAvailable: true, unknownModePresent: true });
  assert.equal(calls.length, 2);
  assert.deepEqual(calls.map(call => call.url.pathname), ['/v1.19/PaymentProvider/', '/v1.19/PaymentMethod/']);
  for (const call of calls) {
    assert.equal(call.url.origin, 'https://api.payrexx.com');
    assert.equal(call.url.searchParams.get('instance'), instance);
    assert.equal(call.url.href.includes(secret), false);
    assert.equal(call.options.method, 'GET');
    assert.equal(call.options.body, undefined);
    assert.equal(call.options.redirect, 'error');
    assert.equal(new Headers(call.options.headers).get('X-API-KEY'), secret);
  }
  assert.equal(calls[1].url.searchParams.get('filterCurrency'), 'CHF');
  assert.equal(calls[1].url.searchParams.get('filterPaymentType'), 'one-time');
  assert.equal(calls[0].options.signal, calls[1].options.signal);
  const output = JSON.stringify(await result);
  for (const forbidden of [secret, '999999', 'availableBalance', 'paymentMethods', 'referenceId', 'id', 'name', 'kyc']) assert.equal(output.includes('"' + forbidden + '"'), false);
  assert.equal(output.includes(secret), false);
});

test('a successful empty methods list is checked absence, not unverified account/KYC inference', async () => {
  const { result } = invoke([providers(), json({ status: 'success', data: [] })]);
  assert.deepEqual(await result, { authStatus: 'accepted', methodsChecked: true, liveCHFOneTimeAvailable: false, testCHFOneTimeAvailable: false, unknownModePresent: false });
});

test('catalog entries require a matching configured PSP and explicitly active method', async () => {
  const { result } = invoke([json({ status: 'success', data: [{ id: 44, activePaymentMethods: [] }] }), json({ status: 'success', data: [method({ 44: option('live'), 36: option('live') })] })]);
  assert.deepEqual(await result, { authStatus: 'accepted', methodsChecked: true, liveCHFOneTimeAvailable: false, testCHFOneTimeAvailable: false, unknownModePresent: false });
  const apple = invoke([json({ status: 'success', data: [{ id: 44, activePaymentMethods: { 3: 'apple_pay' } }] }), json({ status: 'success', data: [{ id: 'apple-pay', options_by_psp: { 44: option('live') } }] })]);
  assert.equal((await apple.result).liveCHFOneTimeAvailable, true);
});

test('an absent provider activation list leaves authentication accepted and availability unverified', async () => {
  const { calls, result } = invoke([json({ status: 'success', data: [{ id: 44 }] })]);
  assert.deepEqual(await result, { authStatus: 'accepted', methodsChecked: false, liveCHFOneTimeAvailable: null, testCHFOneTimeAvailable: null, unknownModePresent: null });
  assert.equal(calls.length, 1);
});

test('missing or unexpected method mode stays unknown and never defaults to LIVE', async () => {
  for (const mode of [undefined, null, '', 'sandbox', true, ' live ']) {
    const { result } = invoke([providers(), json({ status: 'success', data: [method({ 44: { ...option(), mode } })] })]);
    assert.deepEqual(await result, { authStatus: 'accepted', methodsChecked: true, liveCHFOneTimeAvailable: false, testCHFOneTimeAvailable: false, unknownModePresent: true });
  }
});

test('HTTP 401/403 and provider failures never attempt the methods request', async () => {
  for (const status of [401, 403, 500]) {
    const { result, calls } = invoke([json({ status: 'error', message: secret }, status)]);
    const output = await result;
    assert.equal(output.authStatus, status === 500 ? 'provider_unavailable' : 'http_' + status);
    assert.equal(output.methodsChecked, false);
    assert.equal(output.liveCHFOneTimeAvailable, null);
    assert.equal(calls.length, 1);
    assert.equal(JSON.stringify(output).includes(secret), false);
  }
});

test('provider schema failures are distinct from unavailable network/provider responses', async () => {
  for (const body of [{ status: 'error', data: [] }, { status: 'success', data: {} }, { status: 'success', data: [{ name: secret }] }]) {
    const { calls, result } = invoke([json(body)]);
    assert.equal((await result).authStatus, 'invalid_provider_response');
    assert.equal(calls.length, 1);
  }
  const output = await checkPayrexxConnection({ instance, apiSecret: secret, fetchImpl: (async () => { throw new Error(secret); }) as typeof fetch });
  assert.equal(output.authStatus, 'provider_unavailable');
  assert.equal(JSON.stringify(output).includes(secret), false);
});

test('failed methods reads retain unknown availability instead of reporting no payment methods', async () => {
  for (const status of [401, 403, 503]) {
    const { calls, result } = invoke([providers(), json({ error: secret }, status)]);
    const output = await result;
    assert.equal(output.authStatus, status === 503 ? 'methods_unavailable' : 'http_' + status);
    assert.equal(output.methodsChecked, false);
    assert.equal(output.testCHFOneTimeAvailable, null);
    assert.equal(output.unknownModePresent, null);
    assert.equal(calls.length, 2);
  }
});

test('malformed currency/type/options responses cannot produce a false LIVE result', async () => {
  for (const data of [[{ id: 'visa' }], [method({ 44: { mode: 'live' } })], [method({ 44: option('live', 'CHF') })], [method({ invalid: option() })]]) {
    const { result } = invoke([providers(), json({ status: 'success', data })]);
    const output = await result;
    assert.equal(output.authStatus, 'invalid_methods_response');
    assert.equal(output.methodsChecked, false);
    assert.equal(output.liveCHFOneTimeAvailable, null);
  }
});

test('bounded response parsing rejects oversized or malformed JSON without leaking its contents', async () => {
  for (const response of [new Response(secret, { status: 200 }), new Response(secret, { status: 200, headers: { 'Content-Length': String(600 * 1024) } }), new Response(' '.repeat(513 * 1024), { status: 200 })]) {
    const { result, calls } = invoke([response]);
    const output = await result;
    assert.equal(output.authStatus, 'invalid_provider_response');
    assert.equal(calls.length, 1);
    assert.equal(JSON.stringify(output).includes(secret), false);
  }
});

test('invalid local configuration makes no remote request', async () => {
  let calls = 0;
  for (const config of [{ instance: 'https://attacker.test', apiSecret: secret }, { instance, apiSecret: '' }, { instance, apiSecret: 'key\r\nX-Test: unsafe' }]) {
    const output = await checkPayrexxConnection({ ...config, fetchImpl: (async () => { calls++; throw new Error(secret); }) as typeof fetch });
    assert.equal(output.authStatus, 'invalid_configuration');
  }
  assert.equal(calls, 0);
});

test('one shared ten-second deadline covers both requests, even if fetch ignores abort', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let resolveProvider!: (value: Response) => void;
  let calls = 0, settled = false;
  const result = checkPayrexxConnection({ instance, apiSecret: secret, fetchImpl: (async () => { calls++; return calls === 1 ? new Promise(resolve => { resolveProvider = resolve; }) : new Promise(() => {}); }) as typeof fetch });
  void result.then(() => { settled = true; });
  t.mock.timers.tick(9000);
  resolveProvider(providers());
  await setImmediate();
  assert.equal(calls, 2);
  t.mock.timers.tick(999);
  await setImmediate();
  assert.equal(settled, false);
  t.mock.timers.tick(1);
  assert.equal((await result).authStatus, 'timeout');
});

test('an absent, expired or more-than-fifteen-minute flag never performs the check', async () => {
  const now = Date.parse('2026-11-26T00:00:00.000Z');
  let calls = 0;
  const fetchImpl = (async () => { calls++; throw new Error(secret); }) as typeof fetch;
  for (const flag of [undefined, '', 'not-a-timestamp', '2026-11-25T23:59:59.999Z', '2026-11-26T00:00:00.000Z', '2026-11-26T00:15:00.001Z', '2026-11-26T00:10:00+00:00']) {
    assert.equal(await runPayrexxConnectionCheckOnce({ enabledUntil: flag, instance: 'gate-disabled', apiSecret: secret, fetchImpl, now: () => now }), null);
  }
  assert.equal(calls, 0);
});

test('the bounded timestamp/instance gate is consumed before concurrent checks and does not retry failures', async () => {
  const now = Date.parse('2026-11-26T00:00:00.000Z');
  let calls = 0;
  const config = { enabledUntil: '2026-11-26T00:15:00.000Z', instance: 'gate-once', apiSecret: secret, now: () => now, fetchImpl: (async () => { calls++; return json({ error: secret }, 403); }) as typeof fetch };
  const [first, duplicate] = await Promise.all([runPayrexxConnectionCheckOnce(config), runPayrexxConnectionCheckOnce(config)]);
  assert.equal(first?.authStatus, 'http_403');
  assert.equal(duplicate, null);
  assert.equal(await runPayrexxConnectionCheckOnce(config), null);
  assert.equal(calls, 1);
});
