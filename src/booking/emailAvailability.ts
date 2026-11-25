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

export interface RecoveryEmailSettings { available: boolean; remindersEnabled: boolean; }

/** Requested quote delivery remains available independently of optional reminders. */
export function recoveryEmailSettings(value: unknown): RecoveryEmailSettings {
  const available = recoveryEmailAvailable(value);
  return { available, remindersEnabled: available && (value as Record<string, unknown>).remindersEnabled === true };
}

export function recoveryReminderFeedbackKey(preview: boolean, selected: boolean, effectiveRemindersEnabled: unknown): 'previewWithReminders' | 'previewNoReminders' | 'liveReminderNote' | 'liveNoReminderNote' {
  if (preview) return selected ? 'previewWithReminders' : 'previewNoReminders';
  return effectiveRemindersEnabled === true ? 'liveReminderNote' : 'liveNoReminderNote';
}

export async function fetchRecoveryEmailSettings(fetcher: typeof fetch = fetch, signal?: AbortSignal): Promise<RecoveryEmailSettings> {
  try {
    const response = await fetcher('/api/recovery/config', {
      method: 'GET', credentials: 'same-origin', headers: { Accept: 'application/json' }, signal,
    });
    if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) return { available: false, remindersEnabled: false };
    return recoveryEmailSettings(await response.json());
  } catch { return { available: false, remindersEnabled: false }; }
}

export async function fetchRecoveryEmailAvailability(fetcher: typeof fetch = fetch, signal?: AbortSignal): Promise<boolean> {
  return (await fetchRecoveryEmailSettings(fetcher, signal)).available;
}
