import { readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

const digest = file => createHash('sha256').update(readFileSync(file)).digest('hex');
function localReference(specifier, importer) {
  const clean = decodeURIComponent(specifier.split(/[?#]/)[0]);
  if (!clean || /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(clean)) return null;
  const relative = clean.startsWith('/') ? clean.slice(1) : clean.startsWith('assets/') ? clean : path.posix.join(path.posix.dirname(importer), clean);
  const normalized = path.posix.normalize(relative);
  if (normalized === '..' || normalized.startsWith('../') || normalized.startsWith('/')) throw new Error(`Frontend dependency escapes the public directory: ${importer}`);
  return normalized;
}
function references(source, filename) {
  const found = new Set();
  const add = specifier => { const value = localReference(specifier, filename); if (value) found.add(value); };
  if (/\.html$/i.test(filename)) {
    for (const match of source.matchAll(/(?:src|href)=["'](\/assets\/[^"']+)["']/g)) add(match[1]);
  } else if (/\.(?:m?js)$/i.test(filename)) {
    // Vite's module imports and __vite__mapDeps arrays both contain quoted JS/CSS paths.
    for (const match of source.matchAll(/["']((?:\.{1,2}\/|\/?assets\/)[^"'\s<>]+\.(?:m?js|css)(?:[?#][^"'\s<>]*)?)["']/g)) add(match[1]);
  } else if (/\.css$/i.test(filename)) {
    for (const match of source.matchAll(/url\(\s*["']?([^\s"')]+)["']?\s*\)|@import\s+["']([^"']+)["']/g)) add(match[1] || match[2]);
  }
  return [...found].sort();
}

/** Checks entry files AND every generated lazy JS/CSS dependency against the exact publication set. */
export function frontendAssetManifest(files, runtimeHtml) {
  const assets = new Set([...files.keys()].filter(name => name.startsWith('assets/')));
  const html = runtimeHtml.map(({ name, source }) => ({ path: `dist/${name}`, sha256: digest(source), assets: references(readFileSync(source,'utf8'),name) }));
  const entry = html.find(item => item.path === 'dist/index.html');
  if (!entry?.assets.some(name => /\.(?:m?js)$/.test(name)) || !entry.assets.some(name => /\.css$/.test(name))) throw new Error('Frontend entry must reference published JavaScript and CSS.');
  for (const item of html) for (const dependency of item.assets) {
    if (!files.has(dependency)) throw new Error(`Built HTML references an unpublished frontend file: ${dependency}`);
    assets.add(dependency);
  }
  const dependencies = new Map();
  for (const name of assets) {
    const filename = files.get(name);
    if (!filename) throw new Error(`Missing published frontend dependency: ${name}`);
    const linked = /\.(?:m?js|css)$/i.test(name) ? references(readFileSync(filename,'utf8'),name) : [];
    dependencies.set(name,linked);
    for (const dependency of linked) {
      if (!files.has(dependency)) throw new Error(`Missing published frontend dependency: ${dependency} (from ${name})`);
      assets.add(dependency);
    }
  }
  return { version: 1, html: html.sort((a,b)=>a.path.localeCompare(b.path)), assets: [...assets].sort().map(name => ({ path: '/'+name, bytes: statSync(files.get(name)).size, sha256: digest(files.get(name)), dependencies: (dependencies.get(name)||[]).map(value=>'/'+value) })) };
}
