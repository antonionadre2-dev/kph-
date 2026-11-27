import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolveStaffNotes,teamNotesSummary} from '../src/auth/private-request-notes.ts';
import {planNotesMigration,applyNotesMigration} from '../scripts/migrate-request-notes.ts';
const note={id:'synthetic-note',author:'Synthetic staff',text:'Internal synthetic note',createdAt:'2026-11-27'};
const snapshot=(data:any,time=1)=>({exists:data!==undefined,data:()=>structuredClone(data),updateTime:data===undefined?undefined:{seconds:time,nanoseconds:0}});
function fixture(data:any,privateData?:any){
 const state:any={source:snapshot(data),destination:snapshot(privateData)},writes:any[]=[];
 const db:any={collection:(name:string)=>({doc:(id:string)=>({name,id})}),runTransaction:async(fn:any)=>fn({get:async(ref:any)=>ref.name==='maintenance_requests'?state.source:state.destination,create:(ref:any,value:any)=>writes.push({operation:'create',ref,value}),update:(ref:any,value:any)=>writes.push({operation:'update',ref,value})})};
 return {state,writes,db};
}
test('private history overrides all legacy/local values, including intentionally empty history; malformed private data never falls back',()=>{
 assert.deepEqual(resolveStaffNotes({teamNotes:[]},{teamNotes:[note]},[note]),[]);
 assert.deepEqual(resolveStaffNotes({teamNotes:[note]},{notes:'Customer'},undefined),[note]);
 assert.throws(()=>resolveStaffNotes({teamNotes:'invalid'},{teamNotes:[note]},[]));
 assert.deepEqual(resolveStaffNotes(undefined,{teamNotes:[note]},[]),[note]);
 assert.deepEqual(resolveStaffNotes(undefined,{},[note]),[note]);
});
test('dry-run plans only known structured histories; plain notes and existing private history require review',()=>{
 const f=fixture({teamNotes:[note],notes:teamNotesSummary([note])});
 const plan=planNotesMigration('synthetic-request',f.state.source,f.state.destination);
 assert.equal(plan.action,'migrate');assert.equal(plan.removeSummary,true);assert.equal(f.writes.length,0);
 assert.equal(planNotesMigration('synthetic',snapshot({notes:'Could be customer instructions'}),snapshot(undefined)).action,'manual_review');
 assert.equal(planNotesMigration('synthetic',snapshot({teamNotes:[note]}),snapshot({teamNotes:[]})).action,'manual_review');
 assert.equal(planNotesMigration('synthetic',snapshot({teamNotes:['malformed']}),snapshot(undefined)).action,'manual_review');
 assert.ok(!JSON.stringify(plan).includes(note.text),'manifest contains hashes/preconditions, not note content');
});
test('migration copies the full private history and removes only the proven public mirror atomically',async()=>{
 for(const mirrored of [true,false]){
  const f=fixture({teamNotes:[note],notes:mirrored?teamNotesSummary([note]):'Customer instructions'});
  const plan=planNotesMigration('synthetic',f.state.source,f.state.destination);
  await applyNotesMigration(f.db,plan,{timestamp:()=>'<server-time>',remove:()=>'<delete>'});
  assert.deepEqual(f.writes.map(row=>row.operation),['create','update']);
  assert.deepEqual(f.writes[0].value.teamNotes,[note]);assert.equal(f.writes[0].ref.name,'maintenance_request_internal');
  assert.equal(f.writes[1].value.teamNotes,'<delete>');assert.equal('notes' in f.writes[1].value,mirrored);
 }
});
test('changed source, changed update time or a newly saved private history aborts migration without writes',async()=>{
 for(const change of ['text','time','private']){
  const f=fixture({teamNotes:[note],notes:teamNotesSummary([note])}),plan=planNotesMigration('synthetic',f.state.source,f.state.destination);
  if(change==='text')f.state.source=snapshot({teamNotes:[{...note,text:'Changed'}]});
  if(change==='time')f.state.source=snapshot({teamNotes:[note],notes:teamNotesSummary([note])},2);
  if(change==='private')f.state.destination=snapshot({teamNotes:[note]});
  await assert.rejects(applyNotesMigration(f.db,plan,{timestamp:()=>0,remove:()=>null}),/MIGRATION_SOURCE_CHANGED/);assert.equal(f.writes.length,0);
 }
});
test('UI uses staff-only storage, waits for loading and retains historical local notes without writing internal summaries to public requests',async()=>{
 const source=await readFile(new URL('../components/DetailInspectorModal.tsx',import.meta.url),'utf8');
 const save=source.slice(source.indexOf('const updateAndPersistTeamNotes'),source.indexOf('const handleAddNote'));
 assert.match(save,/if\(!isStaff\|\|!notesReady/);assert.match(save,/runTransaction/);assert.match(save,/actual!==expectedRevision/);assert.match(save,/PRIVATE_REQUEST_NOTES/);
 assert.doesNotMatch(save,/maintenance_requests|notes:|localStorage/);
 assert.match(source,/\{isStaff && <div/);assert.match(source,/localStorage\.getItem\(`kraken_team_notes_/);assert.doesNotMatch(source,/localStorage\.(?:setItem|removeItem)/);
});
