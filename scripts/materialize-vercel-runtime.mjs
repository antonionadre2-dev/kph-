import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const sha256 = file => createHash('sha256').update(readFileSync(file)).digest('hex');
const within = (base, file) => {
  const relative = path.relative(base, file);
  return !path.isAbsolute(relative) && relative !== '..' && !relative.startsWith('..' + path.sep);
};
const prohibited = file => file.split(path.sep).some(part => part === '.env' || part.startsWith('.env.') || ['.git', '.config', '.vercel'].includes(part)) || /\.(?:pem|key|p12|pfx)$/i.test(file);
const secretFile = file => /^\.env(?:\.|$)/.test(path.basename(file)) || /\.(?:pem|key|p12|pfx)$/i.test(file);
const manifestName = 'runtime-dependency-manifest.json';
const DEFAULT_LIMIT = 200 * 1024 * 1024;

function walk(directory, prefix = '') {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (entry.isSymbolicLink()) throw new Error(`Unexpected symlink in generated function: ${prefix + entry.name}`);
    if (entry.isDirectory()) return entry.name === 'node_modules' && !prefix ? [] : walk(path.join(directory, entry.name), prefix + entry.name + '/');
    return entry.isFile() ? [prefix + entry.name] : [];
  });
}

/** The resulting manifest and every SDK file are local build artifacts only. */
export function verifyRuntimeClosure(root) {
  root = realpathSync(root);
  const output = path.join(root, '.vercel/output');
  const directory = path.join(output, 'functions/index.func');
  const nodeModules = path.join(directory, 'node_modules');
  const manifest = JSON.parse(readFileSync(path.join(output, manifestName), 'utf8'));
  if (manifest.version !== 1 || !Array.isArray(manifest.files) || !manifest.files.length || !Number.isSafeInteger(manifest.maxBytes) || manifest.maxBytes < 1 || manifest.maxBytes > DEFAULT_LIMIT) throw new Error('Invalid runtime dependency manifest.');
  if (!existsSync(nodeModules) || lstatSync(nodeModules).isSymbolicLink()) throw new Error('Function dependencies must be materialized, not linked to the workspace.');
  const expected = new Set();
  let bytes = 0;
  for (const entry of manifest.files) {
    if (typeof entry.path !== 'string' || !entry.path.startsWith('node_modules/') || entry.path.includes('\\') || entry.path.split('/').includes('..')) throw new Error('Invalid runtime dependency path.');
    const file = path.resolve(directory, entry.path);
    if (secretFile(file) || !within(nodeModules, file) || !within(nodeModules, realpathSync(file)) || !lstatSync(file).isFile() || sha256(file) !== entry.sha256 || statSync(file).size !== entry.bytes || expected.has(entry.path)) throw new Error(`Missing or changed runtime dependency: ${entry.path}`);
    expected.add(entry.path); bytes += entry.bytes;
  }
  for (const file of walk(nodeModules)) if (!expected.has('node_modules/' + file)) throw new Error(`Untraced runtime dependency: ${file}`);
  if (bytes !== manifest.bytes || bytes > manifest.maxBytes) throw new Error('Runtime byte budget or manifest total differs.');
  return { runtimeDependencies: expected.size, runtimeBytes: bytes, maxBytes: manifest.maxBytes, sha256Verified: expected.size, missing: 0 };
}

export async function materializeVercelRuntime(root, { nftModule, trace, dryRun = false, maxBytes = DEFAULT_LIMIT } = {}) {
  root = realpathSync(root);
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > DEFAULT_LIMIT) throw new Error('Runtime dependency budget must be at most 200 MiB.');
  const directory = path.join(root, '.vercel/output/functions/index.func');
  const dependencies = realpathSync(path.join(root, 'node_modules'));
  const workspaceModules = path.join(root, 'node_modules');
  const packagedModules = path.join(directory, 'node_modules');
  let base = root;
  while (!within(base, dependencies)) base = path.dirname(base);
  const allowed = file => within(directory, file) || within(dependencies, file) || within(workspaceModules, file);
  const entries = walk(directory).filter(file => /\.(?:js|mjs|cjs)$/.test(file)).map(file => path.join(directory, file));
  if (!entries.length || !existsSync(path.join(directory, '.vc-config.json'))) throw new Error('Build the Express Vercel function first.');
  if (!trace) {
    if (!nftModule) throw new Error('Pass --nft with an already installed official @vercel/nft entry; no dependency is installed automatically.');
    const sdk = await import(pathToFileURL(path.resolve(nftModule)).href);
    trace = sdk.nodeFileTrace || sdk.default?.nodeFileTrace;
    if (typeof trace !== 'function') throw new Error('The supplied module does not expose nodeFileTrace.');
  }
  const traced = await trace(entries, {
    base, processCwd: directory, conditions: ['node'],
    ignore: file => {
      const absolute = path.resolve(base, file);
      // No credential/config directories outside the existing function and its
      // actual dependency tree can enter the trace, even with a broad base.
      return secretFile(absolute) || !allowed(absolute) || (!within(directory, absolute) && prohibited(absolute));
    },
    readFile: async file => {
      const absolute = path.resolve(file);
      if (secretFile(absolute) || !allowed(absolute) || (!within(directory, absolute) && prohibited(absolute))) return null;
      try { return readFileSync(absolute, 'utf8'); } catch { return null; }
    },
  });
  const files = new Map();
  for (const name of traced.fileList) {
    const source = path.resolve(base, name);
    const dependencyBase = within(dependencies, source) ? dependencies : within(packagedModules, source) ? packagedModules : null;
    if (!dependencyBase || secretFile(source) || (dependencyBase === dependencies && prohibited(source))) continue;
    const canonical = realpathSync(source);
    if (!within(dependencyBase, canonical)) throw new Error('Traced dependency escapes the installed dependency tree.');
    if (statSync(canonical).isDirectory()) continue;
    if (!statSync(canonical).isFile()) throw new Error('Runtime dependencies must be regular files.');
    const relative = 'node_modules/' + path.relative(dependencyBase, source).split(path.sep).join('/');
    files.set(relative, { path: relative, source: canonical, bytes: statSync(canonical).size, sha256: sha256(canonical) });
  }
  const bytes = [...files.values()].reduce((sum, file) => sum + file.bytes, 0);
  if (!files.size || bytes > maxBytes) throw new Error(`Traced runtime closure ${bytes} bytes exceeds the allowed ${maxBytes}, or is empty.`);
  const warnings = [...(traced.warnings || [])].map(value => value.message || String(value));
  const expectedWarning = message => /^Failed to resolve dependency "(?:utf-8-validate|bufferutil)":/.test(message) && /\/node_modules\/ws\/lib\//.test(message)
    || /^Failed to resolve dependency "supports-color":/.test(message) && /\/node_modules\/debug\/src\/node\.js/.test(message)
    || /^Failed to parse /.test(message) && /\/@grpc\/grpc-js\/proto\/(?:xds|protoc-gen-validate)\/LICENSE as (?:script|module):/.test(message);
  if (warnings.some(message => !expectedWarning(message))) throw new Error('Unexpected dependency-trace warning; review the trace before packaging: ' + warnings.filter(message => !expectedWarning(message)).join('\n'));
  const result = { entries: entries.length, runtimeDependencies: files.size, runtimeBytes: bytes, maxBytes, warnings, dryRun };
  if (dryRun) return result;
  const nodeModules = path.join(directory, 'node_modules');
  if (existsSync(nodeModules)) {
    const existing = verifyRuntimeClosure(root);
    const manifest = JSON.parse(readFileSync(path.join(root, '.vercel/output', manifestName), 'utf8'));
    if (manifest.files.length !== files.size || manifest.files.some(file => files.get(file.path)?.sha256 !== file.sha256)) throw new Error('Existing function dependencies differ; rebuild the generated function before materializing again.');
    return { ...result, ...existing };
  }
  for (const file of files.values()) {
    const destination = path.join(directory, file.path);
    mkdirSync(path.dirname(destination), { recursive: true });
    copyFileSync(file.source, destination);
  }
  writeFileSync(path.join(root, '.vercel/output', manifestName), JSON.stringify({ version: 1, tracer: '@vercel/nft', maxBytes, bytes, files: [...files.values()].map(({ source, ...file }) => file).sort((a, b) => a.path.localeCompare(b.path)) }, null, 2) + '\n');
  return { ...result, ...verifyRuntimeClosure(root) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const args = process.argv.slice(2);
  if (args.includes('--verify')) console.log(JSON.stringify(verifyRuntimeClosure(root), null, 2));
  else {
    const nft = args.indexOf('--nft');
    console.log(JSON.stringify(await materializeVercelRuntime(root, { nftModule: nft < 0 ? null : args[nft + 1], dryRun: args.includes('--dry-run') }), null, 2));
  }
}
