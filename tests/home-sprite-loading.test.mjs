import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialClothingGate, kaiSpriteTargetWidth, seasonalKaiClothing } from '../components/home/scene-sprites.js';
import { mediaAsset } from '../src/media/images.ts';

function fakeScope(){
  let callback,cleanup,delay;
  return {scope:{disposed:false,timeout(fn,ms){callback=fn;delay=ms;return 1;},clearTimeout(){},cleanup(fn){cleanup=fn;}},fire:()=>callback(),dispose:()=>cleanup(),delay:()=>delay};
}
test('the first sprite waits for weather with a 500 ms seasonal fallback and one readiness event',()=>{
  const timer=fakeScope();let ready=0;
  const gate=createInitialClothingGate(timer.scope,()=>ready++);
  assert.equal(gate.isReady(),false);assert.equal(timer.delay(),500);
  gate.resolve();timer.fire();gate.resolve();
  assert.equal(gate.isReady(),true);assert.equal(ready,1);
  const fallback=fakeScope();let fallbackReady=0;
  const fallbackGate=createInitialClothingGate(fallback.scope,()=>fallbackReady++);
  fallback.fire();assert.equal(fallbackGate.isReady(),true);assert.equal(fallbackReady,1);
  const leaving=fakeScope();let late=0;
  createInitialClothingGate(leaving.scope,()=>late++);leaving.dispose();leaving.fire();assert.equal(late,0);
  assert.equal(seasonalKaiClothing(11),'warm');assert.equal(seasonalKaiClothing(1),'warm');assert.equal(seasonalKaiClothing(7),'light');
});
test('mobile Kai uses a complete 768 atlas while high-DPR desktop retains the natural atlas',()=>{
  const original='/home-approved/assets/kai-tasks.webp';
  assert.equal(kaiSpriteTargetWidth(120,3,3,true),768);
  assert.match(mediaAsset(original,kaiSpriteTargetWidth(120,3,3,true)),/-768-/);
  assert.match(mediaAsset(original,kaiSpriteTargetWidth(240,3,2,false)),/-1536-/);
  assert.match(mediaAsset('/home-approved/assets/kai-windows-cold-v3.webp',kaiSpriteTargetWidth(120,2,3,true)),/-768-/);
});
