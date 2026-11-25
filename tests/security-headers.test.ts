import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createServer, request } from 'node:http';
import { securityHeaders, sameOriginCors, isAllowedOrigin, isImmutableAsset } from '../server/security.ts';
import { emailDraftHref, emailPreviewDocument, identityScope, isClientEditableStatus } from '../src/auth/dashboard-safety.ts';

test('real local HTTP responses enforce security headers, restricted CORS and explicit preflight', async () => {
  const app = express(); app.disable('x-powered-by'); app.use(securityHeaders); app.use(sameOriginCors); app.get('/health', (_req, res) => res.json({ ok: true }));
  const server = createServer(app); await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const call = (origin?: string, method = 'GET') => new Promise<{status: number;headers:Record<string,any>}>(resolve => {
    const req = request({ hostname: '127.0.0.1', port: (server.address() as {port:number}).port, path: '/health', method, headers: { Host: 'krakenpfm.ch', ...(origin ? { Origin: origin } : {}) } }, res => { res.resume(); res.on('end', () => resolve({ status: res.statusCode!, headers: res.headers })); }); req.end();
  });
  try {
    const page = await call(); assert.equal(page.status, 200); assert.equal(page.headers['x-powered-by'], undefined);
    assert.equal(page.headers['x-content-type-options'], 'nosniff'); assert.equal(page.headers['x-frame-options'], 'SAMEORIGIN');
    assert.match(page.headers['content-security-policy'], /frame-ancestors 'self'/); assert.ok(page.headers['content-security-policy-report-only']);
    assert.ok(page.headers['permissions-policy']); assert.equal(page.headers['access-control-allow-origin'], undefined);
    const allowed = await call('https://krakenpfm.ch'); assert.equal(allowed.status, 200); assert.equal(allowed.headers['access-control-allow-origin'], 'https://krakenpfm.ch');
    assert.match(allowed.headers.vary, /Origin/);
    for (const origin of ['https://other.example', 'https://krakenpfm.ch.other.example', 'null', 'https://krakenpfm.ch/path']) assert.equal((await call(origin)).status, 403, origin);
    const preflight = await call('https://krakenpfm.ch', 'OPTIONS'); assert.equal(preflight.status, 204); assert.match(preflight.headers['access-control-allow-headers'], /Authorization/);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
});

test('cache and origin helpers distinguish immutable assets from originals and unrelated browser origins', () => {
  for (const asset of ['/assets/index-Abcdef12.js', '/media/hero.1234abcd.webp', '/fonts/manrope.1234abcd.woff2']) assert.equal(isImmutableAsset(asset), true, asset);
  for (const asset of ['/home-approved/assets/logo.webp', '/assets/config.json', '/offerte']) assert.equal(isImmutableAsset(asset), false, asset);
  assert.equal(isAllowedOrigin('https://preview.example', 'preview.example'), true);
  assert.equal(isAllowedOrigin('http://localhost:3000', 'localhost:3000'), true);
  assert.equal(isAllowedOrigin('https://other.example', 'krakenpfm.ch'), false);
});

test('staff drafts require an explicit recipient and cannot become automatic sends or an executable preview', () => {
  const href = emailDraftHref('customer@example.test', '', 'A & bcc=other@example.test', 'Agreed details\nNo automatic send');
  assert.match(href, /^mailto:customer@example.test\?/);
  const query = new URLSearchParams(href.slice(href.indexOf('?')));
  assert.equal(query.get('bcc'), null); assert.equal(query.get('subject'), 'A & bcc=other@example.test');
  assert.equal(query.get('body'), 'Agreed details\nNo automatic send');
  assert.throws(() => emailDraftHref('customer@example.test\r\nbcc:other@example.test', '', 's', 'b'));
  const preview = emailPreviewDocument('<img src="https://other.example/pixel"><script>fetch("/api")</script>');
  assert.match(preview, /default-src 'none'/); assert.match(preview, /form-action 'none'/); assert.match(preview, /img-src data:/);
  assert.notEqual(identityScope('one', true), identityScope('two', true)); assert.notEqual(identityScope('one', true), identityScope('one', false));
  assert.equal(isClientEditableStatus('Pending'), true); assert.equal(isClientEditableStatus('In Progress'), false); assert.equal(isClientEditableStatus('Completed'), false);
});
