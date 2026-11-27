import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { materializeVercelRuntime, verifyRuntimeClosure } from '../scripts/materialize-vercel-runtime.mjs';

function fixture() {
  const temporary = realpathSync(mkdtempSync(path.join(tmpdir(), 'kraken-runtime-closure-')));
  const root = path.join(temporary, 'workspace'), dependencies = path.join(temporary, 'deps');
  const directory = path.join(root, '.vercel/output/functions/index.func');
  mkdirSync(directory, { recursive: true }); mkdirSync(path.join(dependencies, 'sdk'), { recursive: true });
  symlinkSync(dependencies, path.join(root, 'node_modules'), 'dir');
  writeFileSync(path.join(directory, 'server.js'), 'import "sdk";');
  writeFileSync(path.join(directory, '.vc-config.json'), '{"runtime":"nodejs24.x","handler":"server.js"}');
  writeFileSync(path.join(dependencies, 'sdk/index.js'), 'export const ready=true;');
  writeFileSync(path.join(dependencies, 'sdk/package.json'), '{"type":"module","main":"index.js"}');
  const trace = async (_entries, options) => {
    assert.equal(options.ignore(path.relative(options.base, path.join(temporary, 'outside.js'))), true);
    assert.equal(options.ignore(path.relative(options.base, path.join(directory, '.env.synthetic'))), true);
    assert.equal(await options.readFile(path.join(temporary, 'outside.js')), null);
    return { fileList: new Set(['sdk/index.js', 'sdk/package.json'].map(file => path.relative(options.base, path.join(dependencies, file)))), warnings: new Set() };
  };
  return { temporary, root, directory, dependencies, trace, destroy: () => rmSync(temporary, { recursive: true, force: true }) };
}

test('runtime closure copies only traced dependencies, never the workspace symlink, and verifies bytes', async () => {
  const f = fixture();
  try {
    writeFileSync(path.join(f.dependencies, 'unneeded.js'), 'not a dependency');
    const preview = await materializeVercelRuntime(f.root, { trace: f.trace, dryRun: true });
    assert.equal(preview.runtimeDependencies, 2); assert.equal(existsSync(path.join(f.directory, 'node_modules')), false);
    const result = await materializeVercelRuntime(f.root, { trace: f.trace });
    assert.equal(result.sha256Verified, 2); assert.equal(existsSync(path.join(f.directory, 'node_modules/unneeded.js')), false);
    assert.equal(readFileSync(path.join(f.directory, 'node_modules/sdk/index.js'), 'utf8'), 'export const ready=true;');
    writeFileSync(path.join(f.directory, 'node_modules/sdk/index.js'), 'changed');
    assert.throws(() => verifyRuntimeClosure(f.root), /Missing or changed runtime dependency/);
  } finally { f.destroy(); }
});

test('verified external dependency closure removes only its redundant upload map on first and repeated packaging', async () => {
  const f = fixture();
  try {
    const filename = path.join(f.directory, '.vc-config.json');
    const config = {
      runtime: 'nodejs24.x', handler: 'server.js', environment: { EXAMPLE: 'unchanged' },
      filePathMap: { 'dist/index.html': 'dist/index.html', 'dist/terms.html': 'dist/terms.html', node_modules: 'node_modules' },
    };
    const original = JSON.stringify(config);
    writeFileSync(filename, original);
    assert.equal(realpathSync(path.join(f.root, 'node_modules')), f.dependencies);
    await materializeVercelRuntime(f.root, { trace: f.trace, dryRun: true });
    assert.equal(readFileSync(filename, 'utf8'), original);

    const result = await materializeVercelRuntime(f.root, { trace: f.trace });
    assert.equal(result.sha256Verified, 2);
    const expected = { ...config, filePathMap: { 'dist/index.html': 'dist/index.html', 'dist/terms.html': 'dist/terms.html' } };
    assert.deepEqual(JSON.parse(readFileSync(filename, 'utf8')), expected);
    const prepared = readFileSync(filename, 'utf8');
    await materializeVercelRuntime(f.root, { trace: f.trace });
    assert.equal(readFileSync(filename, 'utf8'), prepared);

    // Existing prebuilt artifacts can retain the stale map from an older run.
    writeFileSync(filename, original);
    await materializeVercelRuntime(f.root, { trace: f.trace });
    assert.deepEqual(JSON.parse(readFileSync(filename, 'utf8')), expected);

    writeFileSync(filename, original);
    writeFileSync(path.join(f.directory, 'node_modules/sdk/index.js'), 'changed');
    await assert.rejects(materializeVercelRuntime(f.root, { trace: f.trace }), /Missing or changed runtime dependency/);
    assert.equal(readFileSync(filename, 'utf8'), original);
  } finally { f.destroy(); }
});

test('runtime closure preserves dependency maps whose source differs from the verified package', async () => {
  const f = fixture();
  try {
    const filename = path.join(f.directory, '.vc-config.json');
    const config = JSON.stringify({ runtime: 'nodejs24.x', handler: 'server.js', filePathMap: { node_modules: 'vendor/node_modules', 'dist/index.html': 'dist/index.html' } });
    writeFileSync(filename, config);
    await materializeVercelRuntime(f.root, { trace: f.trace });
    assert.equal(readFileSync(filename, 'utf8'), config);
  } finally { f.destroy(); }
});

test('runtime closure rejects excess size and symlinks escaping the real dependency tree before copying', async () => {
  const f = fixture();
  try {
    await assert.rejects(materializeVercelRuntime(f.root, { trace: f.trace, maxBytes: 1 }), /exceeds/);
    assert.equal(existsSync(path.join(f.directory, 'node_modules')), false);
    writeFileSync(path.join(f.temporary, 'outside.js'), 'synthetic outside file');
    symlinkSync(path.join(f.temporary, 'outside.js'), path.join(f.dependencies, 'sdk/escape.js'));
    const trace = async (_entries, options) => ({ fileList: new Set([path.relative(options.base, path.join(f.dependencies, 'sdk/escape.js'))]), warnings: new Set() });
    await assert.rejects(materializeVercelRuntime(f.root, { trace }), /escapes/);
    assert.equal(existsSync(path.join(f.directory, 'node_modules')), false);
  } finally { f.destroy(); }
});

test('unresolved nonoptional dependencies stop packaging before writing output', async () => {
  const f = fixture();
  try {
    const trace = async (...args) => ({ ...await f.trace(...args), warnings: new Set([new Error('Failed to resolve dependency "required-sdk"')]) });
    await assert.rejects(materializeVercelRuntime(f.root, { trace }), /Unexpected dependency-trace warning/);
    assert.equal(existsSync(path.join(f.directory, 'node_modules')), false);
  } finally { f.destroy(); }
});
