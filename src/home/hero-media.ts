import formats from '../media/hero-formats.json';
import { responsiveImage } from '../media/images';

export const HERO_DAY = '/home-approved/assets/hero-room-day-v4.webp';
export const HERO_NIGHT = '/home-approved/assets/hero-room-night-v4.webp';
/** Matches conversion-home.css; dimensions describe the whole transparent canvas. */
export const HERO_ROOM_SIZES = '(max-width:760px) calc(132.65vw - 42.45px), (max-width:1100px) calc(132.65vw - 63.67px), (min-width:1440px) 1008px, calc(100vw - 432px)';

export function heroImage(originalPath=HERO_DAY, sizes=HERO_ROOM_SIZES) {
  const asset = formats.assets[originalPath as keyof typeof formats.assets];
  return {
    fallback: responsiveImage(originalPath, sizes),
    source: asset ? {type:asset.type,srcSet:asset.variants.map(variant=>`${variant.src} ${variant.width}w`).join(', '),sizes} : null,
  };
}
