import { build } from 'esbuild';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { publicHref } from '../src/routing/site-paths.ts';
import { fileURLToPath } from 'node:url';

/** Keep contact details and the calculator accessible before map JavaScript loads. */
export async function renderContactHtml(root) {
  const manifest = JSON.parse(readFileSync(path.join(root, 'dist/.vite/manifest.json'), 'utf8'));
  const entry = manifest['components/KontaktPage.tsx'];
  if (!entry?.css?.length) throw new Error('Contact stylesheet is missing from the Vite manifest.');
  const cache = path.join(root, 'node_modules/.cache');
  mkdirSync(cache, { recursive: true });
  const temporary = mkdtempSync(path.join(cache, 'kraken-contact-'));
  const outfile = path.join(temporary, 'render.cjs');
  try {
    await build({
      stdin: {
        contents: `import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {ContactContent} from './components/KontaktPage.tsx';export const render=language=>renderToStaticMarkup(React.createElement(ContactContent,{language,onNavigate:()=>{}}));`,
        resolveDir: root, loader: 'tsx',
      },
      outfile, bundle: true, platform: 'node', format: 'cjs', packages: 'external',
      loader: { '.css': 'empty' }, logLevel: 'warning',
    });
    const { render } = createRequire(import.meta.url)(outfile);
    const styles = entry.css.map(file => `<link rel="stylesheet" href="/${file}">`).join('');
    for (const language of ['de', 'en', 'es', 'pt', 'it', 'fr']) {
      const body = render(language);
      if ((body.match(/<h1\b/g) || []).length !== 1
        || !body.includes('id="kraken-contact-real"')
        || !body.includes('href="tel:+41774505705"')
        || !body.includes('href="mailto:kai@krakenpfm.ch"')
        || !body.includes(publicHref('/quote', language))) {
        throw new Error(`Incomplete Contact HTML (${language}).`);
      }
      writeFileSync(path.join(root, `dist/contact-content-${language}.html`), `${styles}<div class="kraken-home kraken-contact-page" lang="${language === 'de' ? 'de-CH' : language}">${body}</div>`);
    }
  } finally { rmSync(temporary, { recursive: true, force: true }); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await renderContactHtml(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
}
