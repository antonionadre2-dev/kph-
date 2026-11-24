/** D3 is injected; this controller never imports a library or reads a D3 global. */
export interface KrakenD3 {
  select: (...args: any[]) => any;
  geoMercator: (...args: any[]) => any;
  geoPath: (...args: any[]) => any;
  geoArea: (...args: any[]) => any;
  zoom: (...args: any[]) => any;
  zoomIdentity: any;
  dragEnable?: (...args: any[]) => any;
}

export interface KrakenRoute {
  distance_m: number;
  duration_s: number;
  geometry: { type: 'LineString'; coordinates: [number, number][] };
  [key: string]: unknown;
}

export interface KrakenDestination {
  id?: string;
  label: string;
  address: string;
  coordinates: [number, number];
  routes?: { outbound?: KrakenRoute | null; inbound?: KrakenRoute | null };
}

export interface KrakenContactCandidate {
  id: string;
  label: string;
  coordinates: [number, number];
  kind: 'address' | 'postcode' | 'place';
}

export interface KrakenMapData {
  office: { coordinates: [number, number]; [key: string]: unknown };
  bbox: [number, number, number, number];
  map: {
    layers: {
      land?: any[];
      water?: any[];
      buildings?: any[];
      roads?: any[];
      labels?: { name: string; kind: string; coordinates: [number, number]; [key: string]: unknown }[];
    };
    [key: string]: unknown;
  };
  destinations: KrakenDestination[];
  [key: string]: unknown;
}

export interface KrakenContactOptions {
  d3: KrakenD3;
  /** Static, precomputed demonstration routes. This is not a geocoding API. */
  data: KrakenMapData;
  assets: { logo: string; exterior: string; interior: string };
  /** Optional synchronous initializer, e.g. root => lucide.createIcons({ root }). */
  icons?: (root: HTMLElement) => void;
  /** Existing calculator route, including the site's locale if appropriate. */
  calculatorUrl?: string;
  /** The site's six-language dictionary, keyed by the supplied German source. */
  t?: (source: string) => string;
  /** Locale for distance and duration formatting; e.g. de-CH or es. */
  locale?: string;
  /** Live Swiss address search. Static example routes are never used in this mode. */
  live?: boolean;
  routingAvailable?: boolean;
  search?: (query: string, signal: AbortSignal) => Promise<KrakenContactCandidate[]>;
  route?: (candidate: KrakenContactCandidate, direction: 'outbound' | 'inbound', signal: AbortSignal) => Promise<KrakenRoute>;
}

export interface KrakenContactController {
  /** Idempotent. Call when unmounting, including React effect cleanup. */
  destroy(): void;
}

export declare function mountKrakenContact(root: HTMLElement, options: KrakenContactOptions): KrakenContactController;
export default mountKrakenContact;
