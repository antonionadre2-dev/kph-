import type { KrakenD3 } from './contact-controller.js';
export declare function normaliseVectorFeature(value: any, d3: KrakenD3): any;
export declare function createSwissBasemap(options: {
  d3: KrakenD3;
  rootLayer: any;
  view: Window;
  status?: HTMLElement | null;
  t?: (source: string) => string;
  initialLayers: any;
  initialBounds: [number, number, number, number];
  getExclusions?: () => { x: number; y: number; width: number; height: number }[];
  getScale?: () => number;
}): {
  align(projection: any): void;
  schedule(projection: any, width: number, height: number, immediate?: boolean): void;
  destroy(): void;
};
