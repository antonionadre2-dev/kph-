// Progressive enhancement only. Copy, links and disclosures work without JS.
document.querySelectorAll('[data-checklist]').forEach(list => {
  const inputs=[...list.querySelectorAll('input[type="checkbox"]')];
  const section=list.closest('section');
  const progress=section.querySelector('progress');
  const output=section.querySelector('output');
  function update(){const checked=inputs.filter(input=>input.checked).length;progress.value=checked;output.textContent=`${checked} von ${inputs.length} Punkten vorbereitet`;}
  inputs.forEach(input=>input.addEventListener('change',update));
  update();
});
function revealService(){
  let id;try{id=decodeURIComponent(location.hash.slice(1));}catch{return;}
  const detail=document.getElementById(id);
  if(detail?.matches('details.region-service')) detail.open=true;
}
revealService();
addEventListener('hashchange',revealService);
