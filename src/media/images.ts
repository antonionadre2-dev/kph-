import manifest from './manifest.json' with { type: 'json' };

interface ImageVariant { src: string; width: number; height: number; bytes: number }
interface OptimizedImage { width: number; height: number; hasAlpha: boolean; kind: string; originalBytes: number; variants: ImageVariant[] }
const images=manifest.assets as Record<string, OptimizedImage>;
export interface ResponsiveImage { src: string; srcSet?: string; sizes?: string; width?: number; height?: number }

/** Natural resolution is the fallback; srcset lets the browser choose a smaller native derivative. */
export function responsiveImage(originalPath: string, sizes='100vw'): ResponsiveImage {
  const asset=images[originalPath];
  if(!asset)return {src:originalPath};
  const natural=asset.variants.at(-1)!;
  return {
    src:natural.src,
    ...(asset.variants.length>1?{srcSet:asset.variants.map(variant=>`${variant.src} ${variant.width}w`).join(', '),sizes}:{}),
    width:asset.width,height:asset.height,
  };
}

/** Atlases stay natural; an optional physical target avoids oversized SVG logo downloads. */
export function mediaAsset(originalPath: string, targetWidth?: number): string {
  const asset=images[originalPath];
  if(!asset)return originalPath;
  return (targetWidth?asset.variants.find(variant=>variant.width>=targetWidth):undefined)?.src
    || asset.variants.at(-1)?.src || originalPath;
}
