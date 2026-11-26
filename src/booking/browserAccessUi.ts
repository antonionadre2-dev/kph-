const validId = /^[A-Za-z0-9_-]{1,128}$/;
const validToken = /^[A-Za-z0-9_-]{20,256}$/;

/** In-memory permission for the initial authenticated read; polling cannot renew the cookie. */
export function createBrowserAccessUiGate() {
  const pending = new Set<string>(), consumed = new Set<string>();
  return {
    establish(id: string, token: string) {
      if (validId.test(id) && validToken.test(token) && !consumed.has(id)) pending.add(id);
    },
    headers(id: string, token: string): Record<string, string> {
      const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
      if (pending.delete(id)) { consumed.add(id); headers['X-Kraken-Browser-Access'] = 'establish'; }
      return headers;
    },
    clear() { pending.clear(); consumed.clear(); },
  };
}
