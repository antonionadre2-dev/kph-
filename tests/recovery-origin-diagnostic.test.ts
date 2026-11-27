import test from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import express from 'express';
import { logRecoveryOriginRejection, sameOriginCors } from '../server/security.ts';
import { createBookingHandlers } from '../server/booking.ts';

const marker = '[recovery:origin-rejected]';
const sensitive = 'PRIVATE_ORIGIN_DIAGNOSTIC_CANARY';
function call(url: string, options: { method?: string; headers?: Record<string, string>; body?: string } = {}) {
  return new Promise<{ status: number; json(): Promise<unknown> }>((resolve, reject) => {
    const outgoing = request(url, { method: options.method, headers: options.headers }, response => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { body += chunk; });
      response.on('end', () => resolve({ status: response.statusCode!, json: async () => JSON.parse(body) }));
      response.on('error', reject);
    });
    outgoing.on('error', reject);
    outgoing.end(options.body);
  });
}

test('origin rejection diagnostics contain only fixed categories and ignore unrelated paths', t => {
  const logs: unknown[][] = [];
  t.mock.method(console, 'warn', (...args: unknown[]) => { logs.push(args); });
  const cases = [
    [undefined, 'krakenpfm.ch', 'POST', 'missing', 'canonical', 'POST'],
    ['null', 'WWW.KRAKENPFM.CH:443', 'POST', 'opaque', 'www', 'POST'],
    ['https://krakenpfm.ch', 'build-123.project.vercel.app', 'POST', 'canonical', 'deployment', 'POST'],
    ['https://www.krakenpfm.ch', 'krakenpfm.ch:443', 'PATCH', 'www', 'canonical', 'other'],
    [`https://${sensitive}.example/private?token=${sensitive}`, `${sensitive}.vercel.app.attacker`, 'POST', 'other', 'other', 'POST'],
    ['https://krakenpfm.ch.attacker', `krakenpfm.ch@${sensitive}.example`, 'GET', 'other', 'other', 'other'],
  ] as const;
  for (const [origin, host, method, originKind, hostKind, methodKind] of cases) {
    const request = { path: '/api/recovery/drafts', method, get: (name: string) => name.toLowerCase() === 'origin' ? origin : name.toLowerCase() === 'host' ? host : sensitive };
    logRecoveryOriginRejection(request as any, 'booking');
    assert.deepEqual(logs.at(-1), [marker, { layer: 'booking', originKind, hostKind, method: methodKind }]);
  }
  const count = logs.length;
  for (const pathname of ['/api/recovery/config', '/api/booking/requests', '/api/recovery/drafts/', '/api/recovery/drafts/secret']) {
    logRecoveryOriginRejection({ path: pathname, method: 'POST', get: () => sensitive } as any, 'cors');
  }
  assert.equal(logs.length, count);
  assert.doesNotMatch(JSON.stringify(logs), new RegExp(sensitive));
});

test('CORS still rejects opaque and malicious origins before any capture side effect', async t => {
  const logs: unknown[][] = [];
  t.mock.method(console, 'warn', (...args: unknown[]) => { logs.push(args); });
  let captures = 0;
  const app = express();
  app.use(sameOriginCors);
  app.use(express.json());
  app.post('/api/recovery/drafts', (_req, res) => { captures++; res.status(201).json({ synthetic: true }); });
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.on('listening', resolve));
  try {
    const base = `http://127.0.0.1:${(server.address() as any).port}`;
    for (const origin of ['null', `https://${sensitive}.example`]) {
      const response = await call(`${base}/api/recovery/drafts?token=${sensitive}`, {
        method: 'POST', headers: { Origin: origin, Host: 'krakenpfm.ch', 'Content-Type': 'application/json', Cookie: `private=${sensitive}`, Authorization: `Bearer ${sensitive}`, Referer: `https://private.example/${sensitive}` },
        body: JSON.stringify({ email: `${sensitive}@example.test`, token: sensitive }),
      });
      assert.equal(response.status, 403);
      assert.deepEqual(await response.json(), { code: 'ORIGIN_NOT_ALLOWED' });
    }
    assert.equal(captures, 0);
    assert.deepEqual(logs, [
      [marker, { layer: 'cors', originKind: 'opaque', hostKind: 'canonical', method: 'POST' }],
      [marker, { layer: 'cors', originKind: 'other', hostKind: 'canonical', method: 'POST' }],
    ]);
    const valid = await call(`${base}/api/recovery/drafts`, { method: 'POST', headers: { Origin: 'https://krakenpfm.ch', Host: 'krakenpfm.ch', 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(valid.status, 201);
    assert.equal(captures, 1);
    assert.equal(logs.length, 2);
    const unrelated = await call(`${base}/api/recovery/config`, { headers: { Origin: 'null', Host: 'krakenpfm.ch' } });
    assert.equal(unrelated.status, 403);
    assert.equal(logs.length, 2);
    assert.doesNotMatch(JSON.stringify(logs), new RegExp(sensitive));
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
});

test('booking exact-origin rejection logs categories without changing its gate or invoking providers', async t => {
  const logs: unknown[][] = [];
  t.mock.method(console, 'warn', (...args: unknown[]) => { logs.push(args); });
  let providerCalls = 0;
  const handlers = createBookingHandlers({ env: { APP_URL: 'https://krakenpfm.ch/' }, fetcher: async () => { providerCalls++; throw new Error('Provider must not run'); } });
  const app = express();
  app.use(sameOriginCors);
  app.use(express.json());
  app.use(handlers.middleware);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.on('listening', resolve));
  try {
    const base = `http://127.0.0.1:${(server.address() as any).port}`;
    for (const origin of [undefined, 'https://www.krakenpfm.ch']) {
      const response = await call(`${base}/api/recovery/drafts?token=${sensitive}`, {
        method: 'POST', headers: { ...(origin ? { Origin: origin } : {}), Host: 'krakenpfm.ch', 'Content-Type': 'application/json', Cookie: `private=${sensitive}` },
        body: JSON.stringify({ email: `${sensitive}@example.test` }),
      });
      assert.equal(response.status, 403);
      assert.deepEqual(await response.json(), { code: 'ORIGIN_NOT_ALLOWED' });
    }
    assert.deepEqual(logs.filter(entry => entry[0] === marker), [
      [marker, { layer: 'booking', originKind: 'missing', hostKind: 'canonical', method: 'POST', fetchSite: 'missing', referrerKind: 'missing', cookieValid: false }],
      [marker, { layer: 'booking', originKind: 'www', hostKind: 'canonical', method: 'POST' }],
    ]);
    const valid = await call(`${base}/api/recovery/drafts`, { method: 'POST', headers: { Origin: 'https://krakenpfm.ch', Host: 'krakenpfm.ch', 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(valid.status, 503);
    assert.deepEqual(await valid.json(), { code: 'RECOVERY_NOT_CONFIGURED' });
    assert.equal(logs.filter(entry => entry[0] === marker).length, 2);
    assert.equal(providerCalls, 0);
    assert.doesNotMatch(JSON.stringify(logs), new RegExp(sensitive));
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
});
