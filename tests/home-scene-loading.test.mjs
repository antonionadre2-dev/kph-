import test from 'node:test';
import assert from 'node:assert/strict';
import { createSceneMediaGate } from '../components/home/scene-loading.js';

const settle=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(decode){
  let cleanup,visible=true,activated=0,decoded=0,next=0;
  const frames=new Map();
  const gate=createSceneMediaGate({disposed:false,cleanup(fn){cleanup=fn;}},{image:{decode(){decoded++;return decode();}},isVisible:()=>visible,onReady:()=>activated++,requestFrame:fn=>{frames.set(++next,fn);return next;},cancelFrame:id=>frames.delete(id)});
  return{gate,dispose:()=>cleanup(),visible:value=>visible=value,paint(){const queued=[...frames.values()];frames.clear();queued.forEach(fn=>fn());},get activated(){return activated;},get decoded(){return decoded;},get queued(){return frames.size;}};
}
test('animated layers wait for image decode and a paint opportunity, with no duplicate activation',async()=>{
  let decoded;const f=fixture(()=>new Promise(resolve=>decoded=resolve));
  f.gate.request();f.gate.request();await settle();assert.equal(f.decoded,1);assert.equal(f.activated,0);assert.equal(f.queued,0);
  decoded();await settle();f.paint();assert.equal(f.activated,0);f.paint();assert.equal(f.activated,1);
  f.gate.request();await settle();assert.equal(f.decoded,1);
});
test('leaving the scene or unmounting during decode prevents stale asset requests',async()=>{
  let decoded;const f=fixture(()=>new Promise(resolve=>decoded=resolve));f.gate.request();await settle();f.dispose();decoded();await settle();f.paint();f.paint();assert.equal(f.activated,0);assert.equal(f.queued,0);
  const again=fixture(()=>Promise.resolve());again.gate.request();await settle();again.visible(false);again.paint();again.paint();assert.equal(again.activated,0);
  again.visible(true);again.gate.request();await settle();again.paint();again.paint();assert.equal(again.activated,1);
});
test('an image decode error still leaves scene controls usable and queued frames are cancelled on unmount',async()=>{
  const f=fixture(()=>Promise.reject(Error('image unavailable')));f.gate.request();await settle();f.paint();f.paint();assert.equal(f.activated,1);
  const cancelled=fixture(()=>Promise.resolve());cancelled.gate.request();await settle();assert.equal(cancelled.queued,1);cancelled.dispose();assert.equal(cancelled.queued,0);cancelled.paint();assert.equal(cancelled.activated,0);
});
test('responsive media activation decodes the visible image, never the hidden desktop placeholder on mobile',async()=>{
  let mobile=true, desktopDecodes=0, mobileDecodes=0, activated=0, next=0;
  const desktop={decode:()=>{desktopDecodes++;return Promise.resolve();}},phone={decode:()=>{mobileDecodes++;return Promise.resolve();}},frames=new Map();
  const gate=createSceneMediaGate({disposed:false,cleanup(){}},{image:()=>mobile?phone:desktop,isVisible:()=>true,onReady:()=>activated++,requestFrame:fn=>{frames.set(++next,fn);return next;},cancelFrame:id=>frames.delete(id)});
  const paint=()=>{const queued=[...frames.values()];frames.clear();queued.forEach(fn=>fn());};
  gate.request();await settle();assert.equal(mobileDecodes,1);assert.equal(desktopDecodes,0);
  mobile=false;paint();paint();await settle();assert.equal(desktopDecodes,1);assert.equal(activated,0);
  paint();paint();assert.equal(activated,1);
});
