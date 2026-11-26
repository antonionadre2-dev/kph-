import test from 'node:test';
import assert from 'node:assert/strict';
import { sceneCalendar, initialSceneCalendar, DEFAULT_SCENE } from '../src/home/scene-calendar.ts';
import { prepareInitialHomeScene } from '../src/home/hero-response.ts';
import { HERO_DAY, HERO_NIGHT, HERO_EMPTY_SOURCE, HERO_DESKTOP_MEDIA, heroImage } from '../src/home/hero-media.ts';

const day = heroImage(HERO_DAY);
const fixture = `<link id="hero-room-preload" rel="preload" as="image" type="image/avif" imagesrcset="${day.source!.srcSet}" imagesizes="${day.source!.sizes}" fetchpriority="high"/>
<div id="sceneCanvas" data-season="autumn" data-phase="day" data-weather="unknown" data-celebration="none" data-lights="on">
<picture><source media="(max-width: 767px)" srcset="${HERO_EMPTY_SOURCE}"/><source id="sceneRoomAvif" media="(min-width: 768px)" srcset="${day.source!.srcSet}" sizes="${day.source!.sizes}"/>
<img id="sceneRoom" src="${day.fallback.src}" srcset="${day.fallback.srcSet}" sizes="${day.fallback.sizes}" loading="eager" fetchpriority="high"/></picture>
<picture><source media="(min-width: 768px)" srcset="${HERO_EMPTY_SOURCE}"/><source id="sceneRoomMobileAvif" media="(max-width: 767px)" srcset="${day.source!.srcSet}" sizes="${day.source!.sizes}"/>
<img id="sceneRoomMobile" src="${day.fallback.src}" srcset="${day.fallback.srcSet}" sizes="${day.fallback.sizes}" loading="lazy" fetchpriority="low"/></picture>
<img id="unrelated" src="/unrelated.webp"/></div>`;
const tag = (html: string, id: string) => html.match(new RegExp(`<[^>]+\\bid="${id}"[^>]*>`))![0];

test('the same Zurich calendar selects day/night and editorial boundaries without weather or host timezone', () => {
  for (const [utc, phase] of [['2026-11-26T05:14:00Z', 'night'], ['2026-11-26T05:15:00Z', 'dawn'], ['2026-11-26T06:30:00Z', 'day'], ['2026-11-26T16:00:00Z', 'evening'], ['2026-11-26T17:30:00Z', 'night']]) {
    assert.equal(sceneCalendar(new Date(utc)).phase, phase, utc);
  }
  assert.deepEqual(sceneCalendar(new Date('2026-07-01T21:35:00Z')), { season: 'summer', phase: 'night', celebration: 'none', month: 7 });
  assert.equal(sceneCalendar(new Date('2026-12-01T11:00:00Z')).celebration, 'christmas');
  assert.equal(sceneCalendar(new Date('2026-12-31T11:00:00Z')).celebration, 'newyear');
});

test('night HTTP markup selects the real room and matching desktop-only preload before decoding any image', () => {
  assert.doesNotMatch(HERO_EMPTY_SOURCE, /\s/, 'The inactive picture candidate must be a valid single srcset URL.');
  const html = prepareInitialHomeScene(fixture, new Date('2026-11-26T22:00:00Z'));
  const night = heroImage(HERO_NIGHT);
  assert.match(tag(html, 'sceneCanvas'), /data-phase="night"/);
  assert.match(tag(html, 'sceneCanvas'), /data-lights="off"/);
  assert.ok(tag(html, 'hero-room-preload').includes(`media="${HERO_DESKTOP_MEDIA}"`));
  assert.ok(tag(html, 'hero-room-preload').includes(`imagesrcset="${night.source!.srcSet}"`));
  for (const id of ['sceneRoomAvif', 'sceneRoomMobileAvif']) assert.ok(tag(html, id).includes(`srcset="${night.source!.srcSet}"`));
  for (const id of ['sceneRoom', 'sceneRoomMobile']) {
    assert.ok(tag(html, id).includes(`src="${night.fallback.src}"`));
    assert.doesNotMatch(tag(html, id), /hero-room-day/);
  }
  assert.match(tag(html, 'sceneRoom'), /loading="eager" fetchpriority="high"/);
  assert.match(tag(html, 'sceneRoomMobile'), /loading="lazy" fetchpriority="low"/);
  assert.equal(html.split(HERO_EMPTY_SOURCE).length, fixture.split(HERO_EMPTY_SOURCE).length);
  assert.equal(tag(html, 'unrelated'), tag(fixture, 'unrelated'));
});

test('day HTTP markup preloads its displayed day variant, while unrelated pages stay untouched', () => {
  const html = prepareInitialHomeScene(fixture, new Date('2026-11-26T11:00:00Z'));
  assert.ok(tag(html, 'hero-room-preload').includes(`imagesrcset="${day.source!.srcSet}"`));
  assert.match(tag(html, 'sceneCanvas'), /data-phase="day"/);
  assert.ok(day.source!.sizes.startsWith('(max-width:767px) 100vw'));
  const other = '<html><head></head><body><img src="/other.webp"/></body></html>';
  assert.equal(prepareInitialHomeScene(other), other);
});

test('hydration reads the server-selected scene rather than resetting a night room to the built daytime default', () => {
  const previous = globalThis.document;
  try {
    globalThis.document = { getElementById: () => ({ dataset: { phase: 'night', season: 'winter', celebration: 'christmas' } }) } as unknown as Document;
    assert.deepEqual(initialSceneCalendar(), { phase: 'night', season: 'winter', celebration: 'christmas' });
    globalThis.document = undefined!;
    assert.equal(initialSceneCalendar(), DEFAULT_SCENE);
  } finally { globalThis.document = previous; }
});
