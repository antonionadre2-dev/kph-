// Optional Lighthouse 13 layout audit, run in an isolated localhost browser.
const packageRoot=process.env.KRAKEN_LIGHTHOUSE_PACKAGE;
if(!packageRoot)throw Error('Set KRAKEN_LIGHTHOUSE_PACKAGE to the installed Lighthouse package directory.');
const {default:Gatherer}=await import(packageRoot+'/core/gather/base-gatherer.js');
const {Audit}=await import(packageRoot+'/core/audits/audit.js');

class HeroFrame extends Gatherer{
  meta={supportedModes:['navigation']};
  async startInstrumentation(context){
    if(process.env.QA_REDUCED_MOTION==='true')await context.driver.defaultSession.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  }
  async getArtifact(context){
    // This is an isolated localhost QA browser. Keep the performance runs separate.
    await context.driver.executionContext.evaluate(async()=>{
      if(!['localhost','127.0.0.1'].includes(location.hostname))throw Error('Layout QA is restricted to localhost.');
      document.querySelector('#cookie-btn-decline')?.click();
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    },{args:[],useIsolation:false});
    const geometry=await context.driver.executionContext.evaluate(()=>{
      const rect=selector=>{const e=document.querySelector(selector);if(!e)return null;const r=e.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
      const toggle=document.querySelector('#sceneMotionToggle');let interaction=true;
      if(toggle&&!toggle.hidden){const before=toggle.getAttribute('aria-pressed');toggle.click();interaction=toggle.getAttribute('aria-pressed')!==before;toggle.click();}
      const dock=document.querySelector('.booking-dock'),panelColors=getComputedStyle(dock).backgroundImage.match(/rgba?\([^)]+\)/g)||[];
      const luminance=color=>{const rgb=color.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;};
      const actionContrast=[...dock.querySelectorAll('.booking-submit,.button-kai')].map(e=>{const css=getComputedStyle(e),fg=luminance(css.color),backgrounds=css.backgroundColor==='rgba(0, 0, 0, 0)'?panelColors:[css.backgroundColor];return{name:e.textContent.trim(),color:css.color,background:css.backgroundColor,ratio:Math.min(...backgrounds.map(color=>{const bg=luminance(color);return(Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05);}))};});
      return{interaction,actionContrast,width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,image:rect('#sceneRoom'),copy:rect('.hero-copy'),hero:rect('.hero'),dock:rect('.booking-dock'),currentSource:document.querySelector('#sceneRoom')?.currentSrc,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,motionPaused:document.querySelector('#sceneCanvas')?.classList.contains('is-paused'),motionToggleHidden:document.querySelector('#sceneMotionToggle')?.hidden,hotspots:[...document.querySelectorAll('.scene-hotspot')].map(e=>{const r=e.getBoundingClientRect();return{name:e.getAttribute('aria-label'),left:r.left,right:r.right,top:r.top,bottom:r.bottom};})};
    },{args:[],useIsolation:true});
    const screenshot=await context.driver.defaultSession.sendCommand('Page.captureScreenshot',{format:'jpeg',quality:90,captureBeyondViewport:true,clip:{x:0,y:0,width:geometry.width,height:Math.min(2600,geometry.hero.bottom),scale:1}});
    return{...geometry,screenshot:'data:image/jpeg;base64,'+screenshot.data};
  }
}
class HeroAudit extends Audit{
  static get meta(){return{id:'hero-frame',title:'House and controls fit the responsive frame',failureTitle:'House or controls exceed the responsive frame',description:'Geometry measured from the rendered local homepage; transparent canvas space is excluded from house bounds.',requiredArtifacts:['HeroFrame']};}
  static audit({HeroFrame:g}){
    const house=g.image?{left:g.image.left+g.image.width*.24609375,right:g.image.right,top:g.image.top+g.image.height*.1005859375,bottom:g.image.top+g.image.height*.9638671875}:null;
    const inside=Boolean(house)&&house.left>=-1&&house.right<=g.width+1;
    const controls=g.hotspots.every(r=>r.left>=-1&&r.right<=g.width+1&&r.bottom<=g.hero.bottom+1);
    const overlap=(a,b)=>a&&b&&a.left<b.right-1&&a.right>b.left+1&&a.top<b.bottom-1&&a.bottom>b.top+1;
    const copyClear=!overlap(house,g.copy),dockClear=!g.hotspots.some(r=>overlap(r,g.dock));
    const floorClear=house&&g.dock&&house.bottom<=g.dock.top+1,contrast=g.actionContrast.length===2&&g.actionContrast.every(action=>action.ratio>=4.5);
    return{score:g.interaction&&g.scrollWidth===g.width&&inside&&controls&&copyClear&&dockClear&&floorClear&&contrast&&(!g.reducedMotion||(g.motionPaused&&g.motionToggleHidden))?1:0,details:{type:'debugdata',...g,house,inside,controls,copyClear,dockClear,floorClear,contrast}};
  }
}
export default{extends:'lighthouse:default',artifacts:[{id:'HeroFrame',gatherer:new HeroFrame()}],audits:[HeroAudit],categories:{hero:{title:'Responsive house',description:'Local layout QA, separate from standard mobile performance scoring.',auditRefs:[{id:'hero-frame',weight:1}]}},settings:{onlyCategories:['hero'],formFactor:Number(process.env.QA_WIDTH||1440)<=760?'mobile':'desktop',screenEmulation:{mobile:Number(process.env.QA_WIDTH||1440)<=760,width:Number(process.env.QA_WIDTH||1440),height:Number(process.env.QA_HEIGHT||1000),deviceScaleFactor:1,disabled:false}}};
