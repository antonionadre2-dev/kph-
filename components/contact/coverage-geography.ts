/** Shared only by the static-map generator and the three HTML region markers.
 * Coordinates are longitude/latitude in WGS84. North stays at the top.
 */
export const COVERAGE_MAP = Object.freeze({
  width: 800,
  height: 450,
  west: 7.96,
  east: 9.28,
  north: 47.79,
});
/** A narrower, undistorted crop of the same vectors keeps 14px labels readable
 * on phones. No geographic coordinates are moved to make the labels fit. */
export const COVERAGE_MOBILE_VIEW = Object.freeze({ x: 250, y: 0, width: 300, height: 450 });

const radians = Math.PI / 180;
const mercatorY = (latitude: number) => Math.log(Math.tan(Math.PI / 4 + latitude * radians / 2));
const northY = mercatorY(COVERAGE_MAP.north);
const scale = COVERAGE_MAP.width / ((COVERAGE_MAP.east - COVERAGE_MAP.west) * radians);
export const COVERAGE_MAP_SOUTH = (2 * Math.atan(Math.exp(northY - COVERAGE_MAP.height / scale)) - Math.PI / 2) / radians;

export function projectCoverageCoordinate([longitude, latitude]: readonly [number, number]) {
  return {
    x: (longitude - COVERAGE_MAP.west) * radians * scale,
    y: (northY - mercatorY(latitude)) * scale,
  };
}

export const COVERAGE_REGIONS = Object.freeze([
  { id: 'zurich', name: 'Zürich', coordinates: [8.548064, 47.381934] as const, path: '/reinigung/region-zuerich' },
  { id: 'winterthur', name: 'Winterthur', coordinates: [8.724130, 47.505640] as const, path: '/reinigung/region-winterthur' },
  { id: 'schaffhausen', name: 'Schaffhausen', coordinates: [8.632998, 47.706003] as const, path: '/reinigung/kanton-schaffhausen' },
]);
