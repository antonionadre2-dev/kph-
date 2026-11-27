/** Explicit, resumable staff-note migration. Default is read-only; never prints document IDs or text. */
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import firebaseConfig from '../firebase-applet-config.json' with {type:'json'};
import {PRIVATE_REQUEST_NOTES,validTeamNotes,teamNotesSummary} from '../src/auth/private-request-notes.ts';

const fingerprint=(data:any)=>createHash('sha256').update(JSON.stringify({teamNotes:data?.teamNotes??null,notes:data?.notes??null})).digest('hex');
const stamp=(snapshot:any)=>snapshot?.updateTime?{seconds:snapshot.updateTime.seconds,nanoseconds:snapshot.updateTime.nanoseconds}:null;
const same=(a:any,b:any)=>JSON.stringify(a)===JSON.stringify(b);
export function planNotesMigration(id:string,source:any,destination:any){
  const data=source.data();
  if(!Array.isArray(data?.teamNotes)||!data.teamNotes.length)return {action:typeof data?.notes==='string'&&data.notes.trim()?'manual_review':'none'};
  if(!validTeamNotes(data.teamNotes)||destination.exists)return {action:'manual_review'};
  return {action:'migrate',id,sourceUpdateTime:stamp(source),sourceDigest:fingerprint(data),destinationUpdateTime:stamp(destination),removeSummary:data.notes===teamNotesSummary(data.teamNotes)};
}
/** All checks and both writes are atomic. Changed source/private history is never overwritten. */
export async function applyNotesMigration(db:any,entry:any,values:{timestamp:()=>any;remove:()=>any}){
  return db.runTransaction(async(transaction:any)=>{
    const sourceRef=db.collection('maintenance_requests').doc(entry.id),destinationRef=db.collection(PRIVATE_REQUEST_NOTES).doc(entry.id);
    const source=await transaction.get(sourceRef),destination=await transaction.get(destinationRef);
    if(!source.exists)throw Error('MIGRATION_SOURCE_CHANGED');
    const data=source.data();
    if(!same(stamp(source),entry.sourceUpdateTime)||fingerprint(data)!==entry.sourceDigest||destination.exists||!same(stamp(destination),entry.destinationUpdateTime))throw Error('MIGRATION_SOURCE_CHANGED');
    if(!validTeamNotes(data.teamNotes)||!data.teamNotes.length)throw Error('MIGRATION_SOURCE_CHANGED');
    // Re-evaluate rather than trusting a mutable manifest's removeSummary flag.
    const removeSummary=data.notes===teamNotesSummary(data.teamNotes);
    transaction.create(destinationRef,{requestId:entry.id,teamNotes:data.teamNotes,revision:1,migratedAt:values.timestamp(),updatedAt:values.timestamp(),legacySourceDigest:entry.sourceDigest});
    transaction.update(sourceRef,{teamNotes:values.remove(),...(removeSummary?{notes:values.remove()}:{}),updatedAt:values.timestamp()});
    return {migrated:1,summaryRemoved:removeSummary?1:0};
  });
}

async function main(){
  const args=process.argv.slice(2),option=(name:string)=>{const index=args.indexOf(name);return index<0?undefined:args[index+1];};
  const apply=args.includes('--apply'),planPath=option('--plan'),project=option('--project'),database=option('--database');
  if(!planPath||!path.isAbsolute(planPath)||!project||!database||!args.includes('--use-application-default'))throw Error('EXPLICIT_PROJECT_DATABASE_PRIVATE_PLAN_AND_AUTH_REQUIRED');
  const localEmulator=/^(?:127\.0\.0\.1|localhost):\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST||'')&&project.startsWith('demo-');
  if(!localEmulator&&(project!==firebaseConfig.projectId||database!==firebaseConfig.firestoreDatabaseId))throw Error('UNEXPECTED_PROJECT_OR_DATABASE');
  const repo=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
  if(path.resolve(planPath).startsWith(repo+path.sep))throw Error('PLAN_MUST_BE_OUTSIDE_REPOSITORY');
  const {initializeApp,applicationDefault,deleteApp}=await import('firebase-admin/app');
  const {getFirestore,FieldValue,FieldPath}=await import('firebase-admin/firestore');
  const app=initializeApp({projectId:project,credential:applicationDefault()},'explicit-note-migration');
  const db=getFirestore(app,database);
  try{
    if(apply){
      const plan=JSON.parse(await readFile(planPath,'utf8'));
      if(plan.format!=='kraken-notes-migration-v1'||plan.project!==project||plan.database!==database||!Array.isArray(plan.entries))throw Error('PLAN_TARGET_MISMATCH');
      let migrated=0,conflicts=0;
      for(const entry of plan.entries){try{await applyNotesMigration(db,entry,{timestamp:()=>FieldValue.serverTimestamp(),remove:()=>FieldValue.delete()});migrated++;}catch{conflicts++;}}
      console.log(JSON.stringify({mode:'apply',migrated,conflicts,documentsPrinted:0}));
      if(conflicts)process.exitCode=1;
    }else{
      const entries:any[]=[];let scanned=0,manualReview=0,cursor:any;
      while(true){
        let query=db.collection('maintenance_requests').orderBy(FieldPath.documentId()).limit(100);
        if(cursor)query=query.startAfter(cursor);
        const batch=await query.get();if(batch.empty)break;
        for(const source of batch.docs){
          const destination=await db.collection(PRIVATE_REQUEST_NOTES).doc(source.id).get();
          const entry=planNotesMigration(source.id,source,destination);scanned++;
          if(entry.action==='migrate')entries.push(entry);else if(entry.action==='manual_review')manualReview++;
        }
        cursor=batch.docs.at(-1);if(batch.size<100)break;
      }
      await mkdir(path.dirname(planPath),{recursive:true,mode:0o700});
      await writeFile(planPath,JSON.stringify({format:'kraken-notes-migration-v1',project,database,createdAt:new Date().toISOString(),entries},null,2)+'\n',{mode:0o600,flag:'wx'});
      console.log(JSON.stringify({mode:'dry-run',scanned,migratable:entries.length,manualReview,documentsPrinted:0,writesToFirestore:0}));
    }
  }finally{await db.terminate();await deleteApp(app);}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(()=>{console.error(JSON.stringify({error:'NOTES_MIGRATION_NOT_COMPLETED',detailsPrinted:false}));process.exitCode=1;});
