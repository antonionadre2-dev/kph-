/** Private, read-only deployment diagnostic. Never import into browser code.
 * No environment reads, logging, transactions, Gateway creation or KYC inference.
 */
export type PayrexxConnectionCheck = {
  authStatus: 'accepted' | 'http_401' | 'http_403' | 'provider_unavailable' | 'invalid_provider_response' | 'methods_unavailable' | 'invalid_methods_response' | 'invalid_configuration' | 'timeout';
  methodsChecked: boolean;
  liveCHFOneTimeAvailable: boolean | null;
  testCHFOneTimeAvailable: boolean | null;
  unknownModePresent: boolean | null;
};
export type PayrexxConnectionCheckOptions = {
  instance: string;
  apiSecret: string;
  fetchImpl?: typeof fetch;
};
export type PayrexxConnectionCheckOnceOptions = PayrexxConnectionCheckOptions & {
  enabledUntil: string | undefined;
  now?: () => number;
};

const API_ORIGIN = 'https://api.payrexx.com/v1.19/';
const TIMEOUT_MS = 10_000;
const MAX_BODY_BYTES = 512 * 1024;
const attempts = new Set<string>();
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const unchecked = (authStatus: PayrexxConnectionCheck['authStatus']): PayrexxConnectionCheck => ({ authStatus, methodsChecked: false, liveCHFOneTimeAvailable: null, testCHFOneTimeAvailable: null, unknownModePresent: null });
class InvalidPayload extends Error {}

async function boundedJson(response: Response, signal: AbortSignal): Promise<unknown> {
  if (Number(response.headers.get('content-length')) > MAX_BODY_BYTES) {
    await response.body?.cancel().catch(() => {});
    throw new InvalidPayload();
  }
  if (!response.body) throw new InvalidPayload();
  const reader = response.body.getReader();
  const abort = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener('abort', abort, { once: true });
  try {
    const chunks: Uint8Array[] = []; let size = 0;
    for (;;) {
      if (signal.aborted) throw new InvalidPayload();
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) { await reader.cancel().catch(() => {}); throw new InvalidPayload(); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
    catch { throw new InvalidPayload(); }
  } finally { signal.removeEventListener('abort', abort); reader.releaseLock(); }
}

function successfulRows(value: unknown): unknown[] {
  if (!record(value) || value.status !== 'success' || !Array.isArray(value.data) || value.data.length > 256) throw new InvalidPayload();
  return value.data;
}
function stringList(value: unknown): string[] {
  // Official provider examples include both lists and numeric-keyed PHP lists.
  const list = Array.isArray(value) ? value : record(value) && Object.keys(value).every(key => /^\d+$/.test(key)) ? Object.values(value) : null;
  if (!list || list.length > 256 || !list.every(item => typeof item === 'string' && item.length <= 128)) throw new InvalidPayload();
  return list as string[];
}
const methodName = (value: string) => value.toLowerCase().replaceAll('_', '-');
function inspectMethods(rows: unknown[], activeByProvider: Map<string, Set<string>>): Pick<PayrexxConnectionCheck, 'liveCHFOneTimeAvailable' | 'testCHFOneTimeAvailable' | 'unknownModePresent'> {
  let live = false, test = false, unknown = false;
  for (const method of rows) {
    if (!record(method) || typeof method.id !== 'string' || !method.id || method.id.length > 128 || !record(method.options_by_psp)) throw new InvalidPayload();
    const options = Object.entries(method.options_by_psp);
    if (options.length > 256) throw new InvalidPayload();
    for (const [id, option] of options) {
      if (!/^[1-9]\d{0,8}$/.test(id) || !record(option)) throw new InvalidPayload();
      const currencies = stringList(option.currencies);
      const types = stringList(option.payment_types);
      if (!currencies.includes('CHF') || !types.includes('one-time')) continue;
      // Also require explicit activation in the separate provider response.
      // A catalog option or an unconfigured PSP cannot establish availability.
      if (!activeByProvider.get(id)?.has(methodName(method.id))) continue;
      // No fallback to the website's configured mode, provider name or key scope.
      const mode = typeof option.mode === 'string' ? option.mode.toLowerCase() : '';
      if (mode === 'live') live = true;
      else if (mode === 'test') test = true;
      else unknown = true;
    }
  }
  return { liveCHFOneTimeAvailable: live, testCHFOneTimeAvailable: test, unknownModePresent: unknown };
}

export async function checkPayrexxConnection(options: PayrexxConnectionCheckOptions): Promise<PayrexxConnectionCheck> {
  if (!/^[a-z0-9-]{1,80}$/i.test(options.instance) || typeof options.apiSecret !== 'string' || !options.apiSecret.trim() || options.apiSecret.length > 4096 || /[\r\n]/.test(options.apiSecret)) return unchecked('invalid_configuration');
  const fetcher = options.fetchImpl || fetch;
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<PayrexxConnectionCheck>(resolve => {
    timer = setTimeout(() => { controller.abort(); resolve(unchecked('timeout')); }, TIMEOUT_MS);
  });
  const perform = async (): Promise<PayrexxConnectionCheck> => {
    let stage: 'provider' | 'methods' = 'provider';
    try {
      const request = async (resource: 'PaymentProvider/' | 'PaymentMethod/') => {
        const url = new URL(resource, API_ORIGIN);
        url.searchParams.set('instance', options.instance);
        if (resource === 'PaymentMethod/') { url.searchParams.set('filterCurrency', 'CHF'); url.searchParams.set('filterPaymentType', 'one-time'); }
        return fetcher(url.href, { method: 'GET', redirect: 'error', credentials: 'omit', cache: 'no-store', headers: { 'X-API-KEY': options.apiSecret, Accept: 'application/json' }, signal: controller.signal });
      };
      const providers = await request('PaymentProvider/');
      if (providers.status === 401 || providers.status === 403) { void providers.body?.cancel().catch(() => {}); return unchecked(providers.status === 401 ? 'http_401' : 'http_403'); }
      if (providers.status !== 200) { void providers.body?.cancel().catch(() => {}); return unchecked('provider_unavailable'); }
      const providerRows = successfulRows(await boundedJson(providers, controller.signal));
      if (!providerRows.every(row => record(row) && Number.isSafeInteger(row.id) && Number(row.id) > 0)) throw new InvalidPayload();
      const activeByProvider = new Map<string, Set<string>>();
      try {
        for (const row of providerRows as Record<string, unknown>[]) activeByProvider.set(String(row.id), new Set(stringList(row.activePaymentMethods).map(methodName)));
      } catch {
        // Authentication succeeded; activity is not proven by this schema.
        return unchecked('accepted');
      }
      stage = 'methods';
      const methods = await request('PaymentMethod/');
      if (methods.status === 401 || methods.status === 403) { void methods.body?.cancel().catch(() => {}); return unchecked(methods.status === 401 ? 'http_401' : 'http_403'); }
      if (methods.status !== 200) { void methods.body?.cancel().catch(() => {}); return unchecked('methods_unavailable'); }
      const capabilities = inspectMethods(successfulRows(await boundedJson(methods, controller.signal)), activeByProvider);
      return { authStatus: 'accepted', methodsChecked: true, ...capabilities };
    } catch (error) {
      if (controller.signal.aborted) return unchecked('timeout');
      return unchecked(error instanceof InvalidPayload ? stage === 'provider' ? 'invalid_provider_response' : 'invalid_methods_response' : stage === 'provider' ? 'provider_unavailable' : 'methods_unavailable');
    }
  };
  try { return await Promise.race([perform(), timeout]); }
  finally { clearTimeout(timer!); controller.abort(); }
}

/** An expired/missing/overlong flag never calls Payrexx. A valid flag is consumed
 * before awaiting the check, including errors, preventing concurrent re-runs.
 * HTTP 403 is factual: it may indicate WAF/permissions, not necessarily a bad key.
 */
export async function runPayrexxConnectionCheckOnce(options: PayrexxConnectionCheckOnceOptions): Promise<PayrexxConnectionCheck | null> {
  const flag = options.enabledUntil;
  if (typeof flag !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(flag)) return null;
  const now = (options.now || Date.now)(), until = Date.parse(flag), remaining = until - now;
  if (!Number.isFinite(now) || !Number.isFinite(until) || remaining <= 0 || remaining > 15 * 60_000) return null;
  const canonicalFlag = flag.includes('.') ? flag.replace(/\.(\d{1,3})Z$/, (_, fraction: string) => '.' + fraction.padEnd(3, '0') + 'Z') : flag.slice(0, -1) + '.000Z';
  if (new Date(until).toISOString() !== canonicalFlag) return null;
  const identity = options.instance + '\0' + flag;
  if (attempts.has(identity)) return null;
  attempts.add(identity);
  return checkPayrexxConnection(options);
}
