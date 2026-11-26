import { existsSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { prepareVercelOutput } from './prepare-vercel-output.mjs';

/** Local build only. Never pulls settings/secrets, creates a deployment or changes an alias. */
export function makeVercelPrebuilt(root, { cli = 'vercel', run = spawnSync, prepare = prepareVercelOutput } = {}) {
  const projectFile = path.join(root,'.vercel/project.json');
  const previewEnvironment = path.join(root,'.vercel/.env.preview.local');
  if (!existsSync(projectFile) || !existsSync(previewEnvironment)) throw new Error('Local preview project settings and .vercel/.env.preview.local are required. Nothing will be pulled automatically; production environment files are not used.');
  const project = JSON.parse(readFileSync(projectFile,'utf8'));
  const settings = project.settings || project.projectSettings;
  if (!project.projectId || !project.orgId || settings?.framework !== 'express' || settings.buildCommand !== 'npm run build:vercel') throw new Error('Review the local Vercel preview project settings before building. No automatic project linking or configuration changes are allowed.');
  rmSync(path.join(root,'.vercel/output/frontend-asset-manifest.json'),{force:true});
  const result = run(cli,['build'],{cwd:root,env:{...process.env,KRAKEN_PREBUILT_BUILD:'1'},stdio:'inherit'});
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error('Local Vercel build failed. The output is not verified for deployment.');
  prepare(root);
  return prepare(root,{verifyOnly:true});
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  if (args.length && !(args.length===2 && args[0]==='--cli')) throw new Error('Usage: node --import tsx scripts/make-vercel-prebuilt.mjs [--cli /path/to/vercel]. This command only prepares a local Preview artifact.');
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
  console.log(JSON.stringify(makeVercelPrebuilt(root,{cli:args[1]||'vercel'}),null,2));
}
