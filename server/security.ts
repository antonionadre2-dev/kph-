import type { Request, Response, NextFunction } from 'express';

export const ENFORCED_CSP = "frame-ancestors 'self'; object-src 'none'; base-uri 'self'";
/** Start resource restrictions in report-only mode; existing auth/payment integrations keep working. */
export const REPORT_ONLY_CSP = [
  "default-src 'self'", "base-uri 'self'", "object-src 'none'",
  "script-src 'self' https://apis.google.com https://www.gstatic.com https://www.google.com https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline'", "font-src 'self'",
  "img-src 'self' data: blob: https:", "media-src 'self' blob:",
  "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://*.cloudfunctions.net https://api.open-meteo.com",
  "frame-src 'self' https://*.firebaseapp.com https://*.payrexx.com https://www.google.com https://challenges.cloudflare.com",
  "form-action 'self' https://*.payrexx.com", "worker-src 'self' blob:",
].join('; ');
export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.removeHeader('X-Powered-By');
  res.setHeader('Content-Security-Policy', ENFORCED_CSP);
  res.setHeader('Content-Security-Policy-Report-Only', REPORT_ONLY_CSP);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self), payment=(self "https://krakenpfm.payrexx.com"), usb=(), browsing-topics=()');
  next();
}
export function isAllowedOrigin(origin: string, requestHost: string): boolean {
  try {
    const url = new URL(origin);
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin) return false;
    return ['https://krakenpfm.ch', 'https://www.krakenpfm.ch'].includes(origin) || url.host === requestHost;
  } catch { return false; }
}
/** Fixed categories only: rejected recovery requests must never disclose request data. */
export function logRecoveryOriginRejection(req: Pick<Request, 'path' | 'method' | 'get'>, layer: 'cors' | 'booking'): void {
  if (req.path !== '/api/recovery/drafts') return;
  const origin = req.get('Origin');
  const host = (req.get('host') || '').toLowerCase();
  const originKind = !origin ? 'missing' : origin === 'null' ? 'opaque'
    : origin === 'https://krakenpfm.ch' ? 'canonical' : origin === 'https://www.krakenpfm.ch' ? 'www' : 'other';
  const hostKind = /^krakenpfm\.ch(?::\d+)?$/.test(host) ? 'canonical'
    : /^www\.krakenpfm\.ch(?::\d+)?$/.test(host) ? 'www'
    : /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+vercel\.app(?::\d+)?$/.test(host) ? 'deployment' : 'other';
  console.warn('[recovery:origin-rejected]', { layer, originKind, hostKind, method: req.method === 'POST' ? 'POST' : 'other' });
}
/** Browser origins are restricted. This is not authentication; webhook signatures and access tokens still apply. */
export function sameOriginCors(req: Request, res: Response, next: NextFunction): void {
  const origin = req.get('Origin');
  if (!origin) { next(); return; }
  res.vary('Origin');
  if (!isAllowedOrigin(origin, req.get('host') || '')) {
    logRecoveryOriginRejection(req, 'cors');
    res.status(403).json({ code: 'ORIGIN_NOT_ALLOWED' }); return;
  }
  res.setHeader('Access-Control-Allow-Origin', origin);
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Booking-Token, X-Idempotency-Key');
    res.setHeader('Access-Control-Max-Age', '600');
    res.status(204).end(); return;
  }
  next();
}

export function isImmutableAsset(pathname: string): boolean {
  return /^\/(?:media|fonts|assets)\/[^?#]*[.-][a-f0-9]{8,}(?:[.-]|\.)/i.test(pathname)
    || /^\/assets\/.+-[A-Za-z0-9_-]{8,}\.[a-z0-9]+$/i.test(pathname);
}
