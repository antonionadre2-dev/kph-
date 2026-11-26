import { publicHref, SITE_ORIGIN, type RouteLanguage } from '../routing/site-paths.ts';

/** Keyboard and viewport contracts shared by the Kai composer and its focused tests. */
export interface KaiComposerKey {
  key: string;
  shiftKey: boolean;
  isComposing: boolean;
  keyCode?: number;
}

export function shouldSubmitKaiMessage(event: KaiComposerKey, message: string, busy: boolean): boolean {
  return event.key === 'Enter' && !event.shiftKey && !event.isComposing && event.keyCode !== 229
    && !busy && message.trim().length > 0;
}

/** Keep the launcher clear of the calculator's actual, translated sticky price bar. */
export function kaiLauncherClearance(priceBarHeight: number): number {
  return Number.isFinite(priceBarHeight) && priceBarHeight > 0 ? Math.ceil(priceBarHeight) + 12 : 16;
}

/** German has no URL prefix, so preserve its explicit intent through the SPA router. */
export function kaiCalculatorNavigationTarget(path: string, language: RouteLanguage): string {
  const target = publicHref(path, language);
  if (language !== 'de') return target;
  const url = new URL(target, SITE_ORIGIN);
  url.searchParams.set('lang', 'de');
  return url.pathname + url.search + url.hash;
}
