export type BookingMailState = 'queued' | 'sending' | 'sent' | 'failed' | 'delivery_unknown';

/** Past provider acceptance stays truthful even when delivery is later disabled. */
export function bookingMailStatusKey(state: BookingMailState | undefined, receipt: boolean, emailReady: boolean): string | null {
  if (state === 'sent') return receipt ? 'receiptSent' : 'mailSent';
  if (state === 'failed' || state === 'delivery_unknown') return 'mailFailed';
  if (!emailReady || (state !== 'queued' && state !== 'sending')) return null;
  return receipt ? 'receiptQueued' : 'mailQueued';
}

/** A booking mail provider alone does not make saved-quote recovery available. */
export function recoveryEmailAvailable(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const config = value as Record<string, unknown>;
  return config.enabled === true && config.emailReady === true;
}

export async function fetchRecoveryEmailAvailability(fetcher: typeof fetch = fetch, signal?: AbortSignal): Promise<boolean> {
  try {
    const response = await fetcher('/api/recovery/config', {
      method: 'GET', credentials: 'same-origin', headers: { Accept: 'application/json' }, signal,
    });
    if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) return false;
    return recoveryEmailAvailable(await response.json());
  } catch { return false; }
}
