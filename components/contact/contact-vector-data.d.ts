import type { Feature, Geometry, Position } from 'geojson';

export const SWISS_VECTOR_BOUNDS: readonly [number, number, number, number];
export interface ContactVectorTile { z: number; x: number; y: number; key: string; url: string }
export interface ContactVectorProjection {
  invert(point: [number, number]): [number, number];
  scale(): number;
}
export type ContactVectorFeature = Feature<Geometry, Record<string, unknown> & { class: string }> & { class: string };
export interface ContactVectorLabel {
  name: string;
  kind: 'place' | 'road' | 'water';
  class: string;
  rank: number;
  coordinates: Position;
}
export interface ContactVectorLayers {
  land: ContactVectorFeature[];
  water: ContactVectorFeature[];
  buildings: ContactVectorFeature[];
  roads: ContactVectorFeature[];
  labels: ContactVectorLabel[];
}
export function viewportTiles(projection: ContactVectorProjection, width: number, height: number): ContactVectorTile[];
export function decodeSwissTile(bytes: Uint8Array | ArrayBuffer, tile: Pick<ContactVectorTile, 'z' | 'x' | 'y'>): ContactVectorLayers;
export function mergeVectorLayers(tileLayers: ReadonlyArray<ContactVectorLayers | null | undefined>): ContactVectorLayers;
