import type { KrakenDestination, KrakenRoute, KrakenContactCandidate } from './contact-controller.js';
export declare function normaliseExampleAddress(value: unknown): string;
export declare function findExampleDestination(destinations: KrakenDestination[], value: unknown): number;
export declare function exampleRoute(destination: KrakenDestination | undefined, direction: string): KrakenRoute | null;
export declare function validRoute(route: unknown): KrakenRoute | null;
export declare function validCandidate(candidate: unknown): candidate is KrakenContactCandidate;
export interface LiveRouteState {
  query: string;
  direction: 'outbound' | 'inbound';
  selected: KrakenContactCandidate | null;
  candidates: KrakenContactCandidate[];
  route: KrakenRoute | null;
  status: 'idle' | 'searching' | 'candidates' | 'empty' | 'routing' | 'ready' | 'error';
  phase: 'search' | 'route' | null;
  errorCode: string | null;
}
export declare function createLiveRouteSession(options: {
  search: (query: string, signal: AbortSignal) => Promise<KrakenContactCandidate[]>;
  route: (candidate: KrakenContactCandidate, direction: string, signal: AbortSignal) => Promise<KrakenRoute>;
  routingAvailable: boolean;
  onChange: (state: LiveRouteState) => void;
  initial?: Partial<LiveRouteState>;
}): {
  edit(query: string): void;
  find(query?: string): Promise<void>;
  select(candidate: KrakenContactCandidate): Promise<void>;
  setDirection(direction: string): void;
  restore(): void;
  snapshot(): LiveRouteState;
  destroy(): void;
};
