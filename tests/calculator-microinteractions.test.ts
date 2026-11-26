import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createCalculatorPriceFeedback,createCalculatorSubmissionGate,type CalculatorPricePulse} from '../src/booking/calculatorInteractions.ts';

function clockFixture(){
  const jobs:Array<{callback:()=>void;delay:number;cancelled:boolean}>=[];
  return {jobs,set(callback:()=>void,delay:number){const job={callback,delay,cancelled:false};jobs.push(job);return job;},clear(token:unknown){(token as typeof jobs[number]).cancelled=true;}};
}

test('actual price changes alternate CSS pulses, while stale timers cannot end a newer change',()=>{
  const clock=clockFixture(),pulses:CalculatorPricePulse[]=[];
  const feedback=createCalculatorPriceFeedback(56000,clock),show=(pulse:CalculatorPricePulse)=>pulses.push(pulse);
  feedback.update(56000,false,show);
  assert.deepEqual(pulses,[],'the initial render must not pulse');assert.equal(clock.jobs.length,0);
  feedback.update(69000,false,show);
  assert.deepEqual(pulses,['a']);assert.equal(clock.jobs[0].delay,300);
  feedback.update(69000,false,show);
  assert.equal(clock.jobs.length,1,'formatting or an unrelated render cannot restart the pulse');
  feedback.update(75500,false,show);
  assert.equal(clock.jobs[0].cancelled,true);assert.deepEqual(pulses,['a','b']);
  clock.jobs[0].callback();assert.deepEqual(pulses,['a','b'],'a stale callback must not clear the latest CSS class');
  clock.jobs[1].callback();assert.deepEqual(pulses,['a','b',null]);
  feedback.update(83000,false,show);assert.deepEqual(pulses,['a','b',null,'a']);
  feedback.cancel();feedback.cancel();assert.deepEqual(pulses,['a','b',null,'a',null]);
  assert.equal(clock.jobs[2].cancelled,true);
});

test('reduced motion clears the CSS pulse immediately and disposal prevents later state writes',()=>{
  const clock=clockFixture(),pulses:CalculatorPricePulse[]=[];
  const feedback=createCalculatorPriceFeedback(56000,clock),show=(pulse:CalculatorPricePulse)=>pulses.push(pulse);
  feedback.update(69000,true,show);feedback.update(69000,false,show);
  assert.deepEqual(pulses,[]);assert.equal(clock.jobs.length,0,'motion must not replay after a reduced-motion update');
  feedback.update(75500,false,show);assert.deepEqual(pulses,['a']);
  feedback.update(83000,true,show);assert.deepEqual(pulses,['a',null]);
  assert.equal(clock.jobs[0].cancelled,true);
  clock.jobs[0].callback();assert.deepEqual(pulses,['a',null]);
  feedback.update(99000,false,show);assert.deepEqual(pulses,['a',null,'b']);
  feedback.dispose();assert.equal(clock.jobs[1].cancelled,true);
  clock.jobs[1].callback();assert.deepEqual(pulses,['a',null,'b'],'unmount must not enqueue a later React update');
});

test('synchronous double submission starts only one async UI action and releases after completion',async()=>{
  const gate=createCalculatorSubmissionGate();let calls=0,resolve!:()=>void;
  const pending=new Promise<void>(done=>{resolve=done;});
  const submit=async()=>{
    const release=gate.acquire();if(!release)return false;
    try{calls++;await pending;return true;}finally{release();}
  };
  const first=submit(),second=submit();
  assert.equal(calls,1);assert.equal(gate.busy,true);assert.equal(await second,false);
  resolve();assert.equal(await first,true);assert.equal(gate.busy,false);
});

test('failed or cancelled UI actions cannot strand the form or unlock a newer action',async()=>{
  const gate=createCalculatorSubmissionGate();
  const failing=async()=>{const release=gate.acquire()!;try{await Promise.reject(new Error('fixture failure'));}finally{release();}};
  await assert.rejects(failing(),/fixture failure/);assert.equal(gate.busy,false);
  const oldRelease=gate.acquire()!;gate.cancel();const currentRelease=gate.acquire()!;
  oldRelease();assert.equal(gate.busy,true,'a stale completion cannot re-enable a newer request');
  currentRelease();assert.equal(gate.busy,false);
});

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const bundle=await build({stdin:{contents:`import React from 'react';import{renderToStaticMarkup}from'react-dom/server';import{CalculatorPriceSurface,CalculatorCompletionCheck,CalculatorSubmitButton}from'./components/CalculatorFeedback.tsx';export const prices=()=>renderToStaticMarkup(<><CalculatorPriceSurface className="kr-calc-total" amount={69000}><strong>CHF 690</strong></CalculatorPriceSurface><CalculatorPriceSurface className="kr-calc-mobile-price" amount={69000}><strong>CHF 690</strong></CalculatorPriceSurface></>);export const button=(busy,disabled)=>renderToStaticMarkup(<CalculatorSubmitButton busy={busy} disabled={disabled} label="Anfrage senden" busyLabel="Wird gesendet"/>);export const check=()=>renderToStaticMarkup(<CalculatorCompletionCheck/>);`,resolveDir:root,loader:'tsx'},bundle:true,platform:'node',format:'cjs',packages:'external',write:false,loader:{'.css':'empty'},logLevel:'silent'});
const module={exports:{}} as {exports:{prices:()=>string;button:(busy:boolean,disabled:boolean)=>string;check:()=>string}};
new Function('require','module','exports',bundle.outputFiles[0].text)(createRequire(import.meta.url),module,module.exports);

test('both price surfaces announce the real final amount politely and the submit button exposes loading',()=>{
  const html=module.exports.prices();
  assert.equal((html.match(/aria-live="polite"/g)||[]).length,2);
  assert.equal((html.match(/aria-atomic="true"/g)||[]).length,2);
  assert.equal((html.match(/CHF 690/g)||[]).length,2);
  const busy=module.exports.button(true,false);
  assert.match(busy,/type="submit"/);assert.match(busy,/disabled=""/);assert.match(busy,/aria-busy="true"/);
  assert.match(busy,/kr-calc-spin/);assert.match(busy,/Wird gesendet/);assert.doesNotMatch(busy,/Anfrage senden/);
  const idle=module.exports.button(false,false);
  assert.doesNotMatch(idle,/disabled=|aria-busy=|kr-calc-spin/);assert.match(idle,/Anfrage senden/);
  assert.match(module.exports.button(false,true),/disabled=""/);
  const check=module.exports.check();
  assert.match(check,/aria-hidden="true"/);assert.doesNotMatch(check,/<svg|<h[1-6]|confirmed|bestätigt/);
});

test('step and check animations cannot change layout; reduced motion retains an instant completed mark',()=>{
  const calculator=readFileSync(path.join(root,'components/service-calculator.css'),'utf8');
  const check=readFileSync(path.join(root,'components/calculator-feedback.css'),'utf8');
  for(const name of ['kr-calc-enter','kr-calc-enter-schedule','kr-calc-enter-review']){
    const start=calculator.indexOf('@keyframes '+name+' '),compact=calculator.indexOf('@keyframes '+name+'{');
    const offset=start>=0?start:compact;assert.ok(offset>=0,name);
    let index=calculator.indexOf('{',offset),depth=1,end=index+1;
    for(;depth&&end<calculator.length;end++){if(calculator[end]==='{')depth++;else if(calculator[end]==='}')depth--;}
    const frames=calculator.slice(index,end);
    assert.match(frames,/opacity/);assert.doesNotMatch(frames,/width|height|margin|padding|top|left|translate/);
  }
  assert.match(calculator,/kr-calc-enter \.2s ease-out/);
  for(const name of ['kr-calc-price-pulse-a','kr-calc-price-pulse-b']){
    assert.match(check,new RegExp('animation:'+name+' \\.3s ease-out'));
    assert.match(check,new RegExp('@keyframes '+name+'\\{from\\{background-color:[^}]+\\}to\\{background-color:[^}]+\\}\\}'));
  }
  const component=readFileSync(path.join(root,'components/CalculatorFeedback.tsx'),'utf8');
  assert.doesNotMatch(component,/\.animate\(|getComputedStyle/,'feedback must use existing React state and CSS, not WAAPI');
  assert.match(check,/animation:kr-calc-check-short \.4s ease-out/);
  assert.match(check,/animation:kr-calc-check-long \.4s ease-out/);
  assert.doesNotMatch(check,/stroke-dash|width:[^;]+(?:transition|animation)|shake/);
  assert.match(check,/@media\(prefers-reduced-motion:reduce\)[\s\S]*animation:none!important;transform:scaleX\(1\)/);
  assert.match(calculator,/:active:not\(:disabled\):not\(\[aria-disabled="true"\]\)\{transform:scale\(\.98\)/);
  assert.match(calculator,/@media\(prefers-reduced-motion:reduce\)[\s\S]*transition:none!important;transform:none!important/);
});
