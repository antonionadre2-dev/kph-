import formats from '../media/hero-formats.json' with { type: 'json' };
import { responsiveImage } from '../media/images.ts';

export const HERO_DAY = '/home-approved/assets/hero-room-day-v4.webp';
export const HERO_NIGHT = '/home-approved/assets/hero-room-night-v4.webp';
/** Matches conversion-home.css; dimensions describe the whole transparent canvas. */
export const HERO_ROOM_SIZES = '(max-width:767px) 100vw, (max-width:1100px) calc(132.65vw - 63.67px), (min-width:1440px) 1008px, calc(100vw - 432px)';
export const HERO_DESKTOP_MEDIA = '(min-width: 768px)';
export const HERO_MOBILE_MEDIA = '(max-width: 767px)';
/** Inactive responsive pictures never request the other viewport's real room image. */
export const HERO_EMPTY_SOURCE = 'data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%221%22%20height=%221%22/%3E';

export function heroImage(originalPath=HERO_DAY, sizes=HERO_ROOM_SIZES) {
  const asset = formats.assets[originalPath as keyof typeof formats.assets];
  return {
    fallback: responsiveImage(originalPath, sizes),
    source: asset ? {type:asset.type,srcSet:asset.variants.map(variant=>`${variant.src} ${variant.width}w`).join(', '),sizes} : null,
  };
}
