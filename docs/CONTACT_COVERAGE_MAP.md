# Contact coverage map

`ContactCoverageMap` renders a local SVG and three native HTML links. Its required
`labels` prop receives the translated `getContactCopy(language).map` values. City
markers identify service regions and link to the existing regional pages. They do
not identify offices or define an exact boundary of service coverage.

## Geographic source and permission

The old local data sample only covers Schaffhausen. The new regional asset uses
the official `ch.swisstopo.base.vt/v1.0.0` data at zoom 10, acquired once for this
regional extent. The SVG contains real landcover, water and major-road geometry.
It has no generated relief, routes, radii, invented roads or artificial lakes.

- [Official dataset and specific attribution requirements](https://www.geo.admin.ch/en/vector-tiles-service-available-services-and-data)
- [swisstopo OGD terms, including processing, publication and commercial use](https://www.swisstopo.admin.ch/en/terms-of-use-free-geodata-and-geoservices)
- [FSDI terms and fair use](https://www.geo.admin.ch/en/general-terms-of-use-fsdi)
- [Official MVT endpoint documentation](https://docs.geo.admin.ch/visualize-data/vector-tiles.html)

The full attribution required for the customized base map is visible beneath the
map and preserved in the SVG description. The source manifest records the exact
tile URLs, SHA-256 checksums, geographic extent, projection and output checksum:
`public/kraken-contact/data/coverage-region-source.json`.

## Reproduction

Run `node --import tsx scripts/generate-contact-coverage.mjs` from the repository.
The script reuses the existing MVT decoder as a preparation tool. Up to twenty
official source tiles are fetched sequentially once, then cached in the ignored
`.cache/contact-coverage` directory. Subsequent runs use the cache. `--refresh`
explicitly downloads current source tiles and updates the provenance manifest.
Do not invoke this generator in a visitor request or the application build.

The script projects all real geometry to one north-up Web Mercator frame, clips
it to the frame and applies subpixel simplification. The same pure projection
places the three accessible HTML markers at the user-supplied WGS84 coordinates.
The delivered page imports neither the source tile decoder nor a mapping library.
There are no runtime map, geolocation, geocoding or routing requests.

## Checks

`node --import tsx --test tests/contact-coverage-map.test.ts` verifies supplied
coordinates, north/east ordering, equal projection scale, real water geometry at
a Zürichsee reference point, Rhine geometry near Schaffhausen, source/output
checksums, safe local SVG content and native regional links in all six locales.

The desktop map has an 800×450 viewBox. Below 600 pixels the browser chooses a
300×450 central SVG crop of exactly the same geometry. This keeps the map and its
14-pixel labels readable on a phone without stretching the geography. Marker
coordinates are transformed into that real crop; the tips remain at the supplied
coordinates. Only the matching image resource is requested by the picture.

The region links have visible keyboard focus. Markers have at least a 44-pixel
interactive target. The glass droplet tip marks the exact geographic point.
No animations are used. The visual
HTML integration and actual device screenshots are checked with the contact page.
