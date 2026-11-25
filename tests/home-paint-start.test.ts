import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {HOME_BOOTSTRAP_SRC,startHomeAfterPaint} from '../src/home/paint-start';
const bootstrap=()=>readFileSync(new URL('../public'+HOME_BOOTSTRAP_SRC,import.meta.url),'utf8').replace('import(entry)','load()');

test('homepage bootstrap waits for a paint, starts once and never strands a hidden tab',()=>{
  for(const hidden of [false,true]){
    let calls=0;const frames:Function[]=[];const listeners=new Map();
    const document={hidden,getElementById:()=>({dataset:{entry:'/assets/index-test.js'}}),addEventListener:(name:string,fn:Function)=>listeners.set(name,fn),removeEventListener:(name:string)=>listeners.delete(name)};
    const code=bootstrap();
    new Function('document','requestAnimationFrame','load',code)(document,(fn:Function)=>frames.push(fn),()=>{calls++;return Promise.resolve();});
    assert.equal(calls,hidden?1:0);
    if(!hidden){frames.shift()!();assert.equal(calls,0);frames.shift()!();assert.equal(calls,1);}
    assert.equal(listeners.size,0);
  }
  let calls=0;const frames:Function[]=[],listeners=new Map();
  const document={hidden:false,getElementById:()=>({dataset:{entry:'/assets/index-test.js'}}),addEventListener:(n:string,f:Function)=>listeners.set(n,f),removeEventListener:(n:string)=>listeners.delete(n)};
  new Function('document','requestAnimationFrame','load',bootstrap())(document,(f:Function)=>frames.push(f),()=>{calls++;return Promise.resolve();});
  document.hidden=true;listeners.get('visibilitychange')();frames.shift()!();frames.shift()!();assert.equal(calls,1);
});

test('the cacheable same-origin bootstrap replaces only a recognized home application script',()=>{
  const original='<link rel="modulepreload" href="/assets/react.js"><link rel="stylesheet" href="/assets/main.css"><script type="module" crossorigin src="/assets/index-test.js"></script><div id="root">Visible HTML</div>';
  const next=startHomeAfterPaint(original),source=readFileSync(new URL('../public'+HOME_BOOTSTRAP_SRC,import.meta.url),'utf8');
  assert.ok(HOME_BOOTSTRAP_SRC.includes(createHash('sha256').update(source).digest('hex').slice(0,12)));
  assert.ok(next.includes('src="'+HOME_BOOTSTRAP_SRC+'" data-entry="/assets/index-test.js"'));
  assert.doesNotMatch(next,/modulepreload/);assert.match(next,/Visible HTML/);assert.match(next,/rel="stylesheet"/);
  const other='<script src="https://other.example/app.js"></script>';
  assert.equal(startHomeAfterPaint(other),other);
});
