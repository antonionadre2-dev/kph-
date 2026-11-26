import { waitUntil } from '@vercel/functions';

/** true means the host runtime has taken responsibility for the whole Promise. */
export type PaymentEmailScheduler = (work: Promise<unknown>) => boolean;

export function createVercelPaymentEmailScheduler(enabled: boolean): PaymentEmailScheduler | undefined {
  if (!enabled) return undefined;
  return work => {
    // waitUntil deliberately becomes a no-op without a Vercel request context.
    // Treat a missing context as synchronous execution, including local tests
    // with VERCEL=1, rather than leaving a serverless task untracked.
    const runtime = globalThis as typeof globalThis & {
      [key: symbol]: { get?: () => { waitUntil?: (pending: Promise<unknown>) => void } } | undefined;
    };
    const context = runtime[Symbol.for('@vercel/request-context')]?.get?.();
    if (typeof context?.waitUntil !== 'function') return false;
    waitUntil(work);
    return true;
  };
}
