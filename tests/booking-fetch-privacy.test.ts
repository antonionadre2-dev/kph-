import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { bookingLanguage } from '../src/booking/uiCopy.ts';

type FetchCall = { path: string; options: RequestInit };

// Execute the real private handlers without exporting test-only production APIs
// or replacing their request construction with a second implementation.
function actualHandlers(file: string, names: string[], bindings: Record<string, unknown>) {
  const filename = fileURLToPath(new URL('../' + file, import.meta.url));
  const source = ts.createSourceFile(filename, readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declarations = new Map<string, string>();
  function visit(node: ts.Node): void {
    if ((ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) && node.name && names.includes(node.name.text)) {
      declarations.set(node.name.text, node.getText(source));
    }
    if (ts.isVariableStatement(node)) {
      for (const declaration of node.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name) && names.includes(declaration.name.text)) declarations.set(declaration.name.text, node.getText(source));
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.deepEqual(names.filter(name => !declarations.has(name)), [], 'The exercised production handlers must still exist');
  const javascript = ts.transpileModule([...new Set(declarations.values())].join('\n'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  return runInNewContext(javascript + '\n;({' + names.join(',') + '})', {
    AbortController, crypto: webcrypto, window: { setTimeout, clearTimeout }, ...bindings,
  }) as Record<string, (...args: any[]) => any>;
}

function assertPrivateRequest(call: FetchCall, signal?: AbortSignal) {
  assert.equal(call.options.referrerPolicy, 'strict-origin', call.path + ': browser origin proof must survive the private document policy');
  assert.equal(call.options.credentials, 'same-origin', call.path + ': signed cookies stay same-origin');
  if (signal) assert.equal(call.options.signal, signal);
  const headers = new Headers(call.options.headers);
  assert.equal(headers.has('Origin'), false, 'The browser supplies Origin; application code must not forge it');
}

test('calculator request and status actions preserve payload and cancellation while setting private fetch policy', async () => {
  const calls: FetchCall[] = [];
  const controller = new AbortController();
  const body = JSON.stringify({ selection: { service: 'regular', frequency: 'weekly', hours: 2.5 }, idempotencyKey: 'synthetic_calculator_request_01' });
  const handlers = actualHandlers('components/ServiceCalculatorPage.tsx', ['BookingApiError', 'api'], {
    fetch: async (path: string, options: RequestInit) => {
      calls.push({ path, options });
      return Response.json({ bookingId: 'synthetic_booking_12345678', state: options.body ? 'created' : 'pending' });
    },
  });
  const created = await handlers.api('/api/booking/requests', { method: 'POST', body, signal: controller.signal, referrerPolicy: 'unsafe-url' });
  assert.equal(created.state, 'created');
  assertPrivateRequest(calls[0]);
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[0].options.body, body);
  assert.equal(new Headers(calls[0].options.headers).get('Content-Type'), 'application/json');
  assert.ok(calls[0].options.signal instanceof AbortSignal);
  const status = await handlers.api('/api/booking/requests/synthetic_booking_12345678', { signal: controller.signal });
  assert.equal(status.state, 'pending');
  assertPrivateRequest(calls[1]);
  assert.equal(calls[1].options.body, undefined);
  assert.equal(calls.length, 2);
});

function savedSelectionFixture(preview = false) {
  const calls: FetchCall[] = [], states: string[] = [], accepted: string[] = [], drafts: unknown[] = [];
  const selection = { service: 'regular', frequency: 'weekly', hours: 2.5 };
  const email = 'synthetic@example.test';
  const payload = { email, selection, language: 'es', reminderConsent: false, consentVersion: 'recovery-2026-11-24' };
  const fingerprint = JSON.stringify(payload);
  const keysRef = { current: new Map<string, string>() };
  const handlers = actualHandlers('components/QuoteRecoveryCard.tsx', ['saveQuote', 'newKey', 'isValidEmail', 'validDraftResponse', 'MAIL_STATUSES'], {
    saveState: 'idle', canSave: true, selection, selectedService: 'regular', quote: { totalCents: 10_000 },
    normalizedEmail: email, payload, fingerprint, fingerprintRef: { current: fingerprint }, keysRef,
    requestRef: { current: { serial: 0, controller: null } }, mountedRef: { current: true }, previewRef: { current: preview },
    savedRef: { current: null }, preview, accountOptIn: false,
    setError: () => {}, setSaveState: (state: string) => states.push(state), setDemoAccount: () => {},
    emailInputRef: { current: { focus() {} } }, onEmailAccepted: (value: string) => accepted.push(value),
    onDraftSaved: (value: unknown) => drafts.push(value),
    fetch: async (path: string, options: RequestInit) => {
      calls.push({ path, options });
      return Response.json({ id: 'synthetic_saved_draft_12345678', accessToken: 'a'.repeat(43), expiresAt: '2030-01-01T00:00:00.000Z', mailStatus: 'sent', remindersEnabled: false });
    },
  });
  return { handlers, calls, states, accepted, drafts, payload, keysRef, fingerprint };
}

test('saving a selection uses the actual handler and retains one request identity and explicit reminder choice', async () => {
  const f = savedSelectionFixture();
  await f.handlers.saveQuote();
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].path, '/api/recovery/drafts');
  assertPrivateRequest(f.calls[0]);
  assert.equal(f.calls[0].options.method, 'POST');
  const payload = JSON.parse(String(f.calls[0].options.body));
  assert.deepEqual({ ...payload, idempotencyKey: undefined }, { ...f.payload, idempotencyKey: undefined });
  assert.match(payload.idempotencyKey, /^[A-Za-z0-9_-]{16,128}$/);
  assert.equal(new Headers(f.calls[0].options.headers).get('Idempotency-Key'), payload.idempotencyKey);
  assert.equal(f.keysRef.current.get(f.fingerprint), payload.idempotencyKey);
  assert.deepEqual(f.states, ['saving', 'sent']);
  assert.deepEqual(f.accepted, ['synthetic@example.test']);
  assert.equal(f.drafts.length, 1);
  await f.handlers.saveQuote();
  assert.equal(JSON.parse(String(f.calls[1].options.body)).idempotencyKey, payload.idempotencyKey, 'The same selection retry keeps its original idempotency key');
});

test('the labelled saved-selection preview still performs no request', async () => {
  const f = savedSelectionFixture(true);
  await f.handlers.saveQuote();
  assert.equal(f.calls.length, 0);
  assert.deepEqual(f.states, ['preview']);
  assert.deepEqual(f.accepted, ['synthetic@example.test']);
  assert.equal(f.drafts.length, 0);
});

function accessRequestFixture(available: boolean) {
  const calls: FetchCall[] = [], states: string[] = [];
  const requestKey = { current: { identity: '', key: '' } };
  const handlers = actualHandlers('components/BookingAccessRecovery.tsx', ['request', 'prepare', 'call'], {
    state: 'idle', reference: ' k-2026-abcdefgh ', email: ' synthetic@example.test ', language: 'es', bookingLanguage,
    active: { current: null }, requestKey, setState: (state: string) => states.push(state),
    fetch: async (path: string, options: RequestInit) => {
      calls.push({ path, options });
      return Response.json(path === '/api/booking/config' ? { available } : { status: 'accepted' });
    },
  });
  return { handlers, calls, states, requestKey };
}

test('requesting lost access renews the signed session before posting only the reference and email', async () => {
  const f = accessRequestFixture(true);
  let prevented = false;
  await f.handlers.request({ preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.deepEqual(f.calls.map(call => call.path), ['/api/booking/config', '/api/booking/access-requests']);
  for (const call of f.calls) {
    assertPrivateRequest(call, f.calls[0].options.signal!);
    assert.equal(call.options.cache, 'no-store');
  }
  assert.equal(f.calls[0].options.body, undefined);
  assert.equal(f.calls[1].options.method, 'POST');
  const payload = JSON.parse(String(f.calls[1].options.body));
  assert.deepEqual(payload, { reference: 'K-2026-ABCDEFGH', email: 'synthetic@example.test', language: 'es', idempotencyKey: f.requestKey.current.key });
  assert.match(payload.idempotencyKey, /^[A-Za-z0-9_-]{16,128}$/);
  assert.deepEqual(f.states, ['sending', 'accepted']);
});

test('a failed access-session preparation stops before requesting an email', async () => {
  const f = accessRequestFixture(false);
  await f.handlers.request({ preventDefault() {} });
  assert.deepEqual(f.calls.map(call => call.path), ['/api/booking/config']);
  assertPrivateRequest(f.calls[0]);
  assert.deepEqual(f.states, ['sending', 'error']);
});
