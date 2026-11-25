import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrateEmailLanguages, EmailLanguageMigrationError } from '../server/email-language-migration.ts';

const usage='node --import tsx scripts/migrate-email-language.ts [--dry-run | --apply] [--page-size=20] [--max-pages=1000]. Apply additionally requires BOOKING_OPERATOR_ID. No emails are sent.';
export function migrationArguments(argv:string[],env:NodeJS.ProcessEnv) {
  if(argv.includes('--help'))return {help:true,apply:false,pageSize:20,maxPages:1000,operatorId:undefined};
  let apply=false,dryRun=false,pageSize=20,maxPages=1000;
  for(const argument of argv) {
    if(argument==='--apply')apply=true;
    else if(argument==='--dry-run')dryRun=true;
    else if(/^--page-size=\d+$/.test(argument))pageSize=Number(argument.split('=')[1]);
    else if(/^--max-pages=\d+$/.test(argument))maxPages=Number(argument.split('=')[1]);
    else throw new EmailLanguageMigrationError('INVALID_ARGUMENTS');
  }
  if((apply&&dryRun)||pageSize<1||pageSize>50||maxPages<1||maxPages>10000)throw new EmailLanguageMigrationError('INVALID_ARGUMENTS');
  const operatorId=env.BOOKING_OPERATOR_ID;
  if(apply&&(!operatorId?.trim()||operatorId.length>128||/[\r\n\u0000]/.test(operatorId)))throw new EmailLanguageMigrationError('OPERATOR_REQUIRED');
  return {help:false,apply,pageSize,maxPages,operatorId};
}

/** Called only by the explicit CLI, not when this file is imported or tested. */
async function configuredDatabase(env:NodeJS.ProcessEnv) {
  const config=JSON.parse(fs.readFileSync(new URL('../firebase-applet-config.json',import.meta.url),'utf8'));
  const projectId=env.BOOKING_FIREBASE_PROJECT_ID||config.projectId;
  const databaseId=env.BOOKING_FIREBASE_DATABASE_ID||config.firestoreDatabaseId;
  if(typeof projectId!=='string'||!projectId||typeof databaseId!=='string'||!databaseId||databaseId==='(default)')throw new EmailLanguageMigrationError('NAMED_DATABASE_REQUIRED');
  const {initializeApp,cert,applicationDefault,deleteApp}=await import('firebase-admin/app');
  const {getFirestore}=await import('firebase-admin/firestore');
  let credential;
  if(env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    let serviceAccount;
    try {serviceAccount=JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON);}
    catch {throw new EmailLanguageMigrationError('FIREBASE_CREDENTIALS_INVALID');}
    if(serviceAccount.project_id!==projectId)throw new EmailLanguageMigrationError('FIREBASE_PROJECT_MISMATCH');
    credential=cert(serviceAccount);
  } else if(env.GOOGLE_APPLICATION_CREDENTIALS||env.BOOKING_USE_APPLICATION_DEFAULT==='true')credential=applicationDefault();
  else throw new EmailLanguageMigrationError('FIREBASE_CREDENTIALS_REQUIRED');
  const app=initializeApp({credential,projectId},'email-language-migration');
  const db=getFirestore(app,databaseId);
  return {db,close:async()=>{await db.terminate();await deleteApp(app);}};
}

export async function runEmailLanguageMigrationCli({argv,env,connect=configuredDatabase,write=(text:string)=>console.log(text)}:{
  argv:string[];env:NodeJS.ProcessEnv;connect?:(env:NodeJS.ProcessEnv)=>Promise<any>;write?:(text:string)=>void;
}) {
  const options=migrationArguments(argv,env);
  if(options.help){write(usage);return 0;}
  const connection=await connect(env);
  try {
    const report=await migrateEmailLanguages({db:connection.db,...options});
    write(JSON.stringify(report));
    return report.truncated||Object.keys(report.errors).length?2:0;
  } finally {await connection.close?.();}
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {process.exitCode=await runEmailLanguageMigrationCli({argv:process.argv.slice(2),env:process.env});}
  catch(error) {
    // No raw SDK errors: they may contain paths, record IDs or customer values.
    console.error(JSON.stringify({error:error instanceof EmailLanguageMigrationError?error.code:'EMAIL_LANGUAGE_MIGRATION_FAILED'}));
    process.exitCode=1;
  }
}
