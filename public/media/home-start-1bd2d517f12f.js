// The full homepage is already visible as HTML. Enhance it after its first paint.
const entry=document.getElementById('kraken-home-start')?.dataset.entry;
if(entry&&/^\/assets\/[A-Za-z0-9_.-]+\.js$/.test(entry)){
  let started=false;
  const start=()=>{if(started)return;started=true;document.removeEventListener('visibilitychange',visibility);import(entry).catch(()=>console.error('Kraken: application could not load'));};
  const visibility=()=>{if(document.hidden)start();};
  if(document.hidden||typeof requestAnimationFrame!=='function')start();
  else{document.addEventListener('visibilitychange',visibility);requestAnimationFrame(()=>requestAnimationFrame(start));}
}
