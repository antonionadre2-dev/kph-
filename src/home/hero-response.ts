import { HERO_DAY, HERO_NIGHT, HERO_DESKTOP_MEDIA, heroImage } from './hero-media.ts';
import { sceneCalendar } from './scene-calendar.ts';

const attribute = (value: string | number) => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
function setAttributes(tag: string, attributes: Record<string, string | number | undefined>): string {
  for (const [name, value] of Object.entries(attributes)) {
    const pattern = new RegExp(`\\s${name}="[^"]*"`, 'i');
    const next = value === undefined ? '' : ` ${name}="${attribute(value)}"`;
    tag = pattern.test(tag) ? tag.replace(pattern, () => next) : tag.replace(/\s*\/?>$/, end => next + end);
  }
  return tag;
}
function updateTag(html: string, id: string, attributes: Record<string, string | number | undefined>): string {
  return html.replace(new RegExp(`<[^>]+\\bid="${id}"[^>]*>`, 'i'), tag => setAttributes(tag, attributes));
}

/** Pick the actual room and matching desktop preload in the HTTP response, before any browser paint. */
export function prepareInitialHomeScene(html: string, date = new Date()): string {
  if (!/\bid="sceneCanvas"/.test(html)) return html;
  const calendar = sceneCalendar(date);
  const image = heroImage(calendar.phase === 'night' ? HERO_NIGHT : HERO_DAY);
  html = updateTag(html, 'sceneCanvas', {
    'data-season': calendar.season, 'data-phase': calendar.phase, 'data-celebration': calendar.celebration,
    'data-lights': calendar.phase === 'night' ? 'off' : 'on',
  });
  for (const [id, loading, priority] of [['sceneRoom', 'eager', 'high'], ['sceneRoomMobile', 'lazy', 'low']]) {
    html = updateTag(html, id, { src: image.fallback.src, srcset: image.fallback.srcSet, sizes: image.fallback.sizes, loading, fetchpriority: priority });
  }
  if (image.source) for (const id of ['sceneRoomAvif', 'sceneRoomMobileAvif']) {
    html = updateTag(html, id, { srcset: image.source.srcSet, sizes: image.source.sizes });
  }
  const source = image.source;
  html = updateTag(html, 'hero-room-preload', {
    media: HERO_DESKTOP_MEDIA, type: source?.type,
    imagesrcset: source?.srcSet || image.fallback.srcSet,
    imagesizes: source?.sizes || image.fallback.sizes, fetchpriority: 'high',
  });
  return html;
}
