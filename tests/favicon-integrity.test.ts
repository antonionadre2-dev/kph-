import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { Jimp } from 'jimp';
import { injectPageSeo } from '../src/seo/html.ts';

const root = new URL('../', import.meta.url);
const publicFile = (name: string) => readFileSync(new URL(`public/${name}`, root));
const html = readFileSync(new URL('index.html', root), 'utf8');
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

test('all browser and search icons contain valid square PNG pixels, not UTF-8 replacement bytes', async () => {
  const names = readdirSync(fileURLToPath(new URL('public/', root)))
    .filter(name => /^(?:favicon.*|apple-touch-icon|android-chrome.*)\.png$/.test(name));
  assert.equal(names.length, 15);
  for (const name of names) {
    const bytes = publicFile(name);
    assert.deepEqual(bytes.subarray(0, 8), pngSignature, `${name}: invalid PNG signature`);
    // Decode the compressed pixels and CRCs too. HTTP200/image/png alone did
    // not reveal the original corruption beyond the file extension.
    const decoded = await Jimp.read(bytes);
    const expected = name === 'apple-touch-icon.png' ? 180
      : name === 'favicon.png' ? 96 : Number(name.match(/(\d+)(?:x\d+)?\.png$/)?.[1]);
    assert.ok(expected >= 16, `${name}: unknown declared dimensions`);
    assert.equal(decoded.bitmap.width, expected, name);
    assert.equal(decoded.bitmap.height, expected, name);
    let visible = false;
    for (let i = 3; i < decoded.bitmap.data.length; i += 4) {
      if (decoded.bitmap.data[i]) { visible = true; break; }
    }
    assert.ok(visible, `${name}: entirely transparent icon`);
  }
  assert.deepEqual(publicFile('favicon.png'), publicFile('favicon-96x96.png'));
});

test('ICO directory offsets point to three complete decodable image frames', async () => {
  const bytes = publicFile('favicon.ico');
  assert.equal(bytes.readUInt16LE(0), 0);
  assert.equal(bytes.readUInt16LE(2), 1);
  assert.equal(bytes.readUInt16LE(4), 3);
  for (const [index, expected] of [16, 32, 48].entries()) {
    const offset = 6 + index * 16;
    const start = bytes.readUInt32LE(offset + 12);
    const length = bytes.readUInt32LE(offset + 8);
    assert.equal(bytes[offset], expected);
    assert.equal(bytes[offset + 1], expected);
    assert.ok(start >= 54 && start + length <= bytes.length);
    const decoded = await Jimp.read(bytes.subarray(start, start + length));
    assert.equal(decoded.bitmap.width, expected);
    assert.equal(decoded.bitmap.height, expected);
  }
});

test('the crawlable high-resolution icon survives six-language server head generation', () => {
  const snippet = readFileSync(new URL('favicon-head.html', root), 'utf8').split('\n').filter(line => line.startsWith('<link'));
  assert.deepEqual(snippet, readFileSync(new URL('public/favicon-head.html', root), 'utf8').split('\n').filter(line => line.startsWith('<link')));
  for (const language of ['de', 'en', 'es', 'fr', 'it', 'pt']) {
    for (const pathname of ['/', '/leistungen', '/about', '/kontakt']) {
      const page = injectPageSeo(html, `${pathname}?lang=${language}`, language);
      const head = page.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] || '';
      for (const link of snippet) assert.ok(head.includes(link), `${pathname}/${language}: ${link}`);
      assert.match(head, /<link rel="icon" type="image\/png" sizes="96x96" href="\/favicon-96x96\.png">/);
      assert.doesNotMatch(head, /favicon[^>]*\?v=/);
    }
  }
  const manifest = JSON.parse(publicFile('site.webmanifest').toString());
  for (const icon of manifest.icons) {
    const bytes = publicFile(icon.src.slice(1));
    assert.deepEqual(bytes.subarray(0, 8), pngSignature);
  }
  const robots = publicFile('robots.txt').toString();
  assert.doesNotMatch(robots, /Disallow:\s*\/(?:favicon|android-chrome|apple-touch|$)/im);
});
