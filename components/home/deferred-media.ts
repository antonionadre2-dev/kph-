import { mediaAsset, responsiveImage } from '../../src/media/images';

/** Defer CSS atlas work and hidden cargo images while preserving all public copy. */
export function initDeferredHomeMedia(root: HTMLElement): () => void {
  let disposed=false;
  const near = new Set<HTMLImageElement>();
  const images=[...root.querySelectorAll<HTMLImageElement>('img[data-media-source]')];
  const services=root.querySelector<HTMLElement>('#leistungen');
  const hydrateImages=()=>{
    if(disposed)return;
    for(const image of near){
      if(image.closest('[hidden],[inert]'))continue;
      const original=image.dataset.mediaSource;
      if(!original)continue;
      const props=responsiveImage(original,image.dataset.mediaSizes||'(max-width:760px) 100vw, 60vw');
      if(props.srcSet)image.srcset=props.srcSet;
      if(props.sizes)image.sizes=props.sizes;
      image.src=props.src;
      delete image.dataset.mediaSource;
      near.delete(image);
    }
  };
  const hydrateServices=()=>{if(!disposed)services?.style.setProperty('--kh-service-scenes',`url("${mediaAsset('/home-approved/assets/service-scenes-branded-v4.webp')}")`);};
  if(!('IntersectionObserver' in window)){
    images.forEach(image=>near.add(image));
    hydrateServices();hydrateImages();
  }
  const observer='IntersectionObserver' in window?new IntersectionObserver(entries=>{
    if(disposed)return;
    for(const entry of entries){
      if(!entry.isIntersecting)continue;
      if(entry.target===services)hydrateServices();
      else near.add(entry.target as HTMLImageElement);
      observer?.unobserve(entry.target);
    }
    hydrateImages();
  },{rootMargin:'240px 0px'}):null;
  if(services)observer?.observe(services);
  images.forEach(image=>observer?.observe(image));
  const mutations=new MutationObserver(hydrateImages);
  mutations.observe(root,{subtree:true,attributes:true,attributeFilter:['hidden','inert']});
  return ()=>{disposed=true;observer?.disconnect();mutations.disconnect();near.clear();};
}
