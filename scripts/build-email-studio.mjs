/**
 * Development-only visual review. No database, credential, payment or email
 * transport is loaded. Usage: npm run build:emails -- /absolute/output/folder
 * Default output: .cache/kraken-email-studio (never the public website).
 */
import { readFileSync, writeFileSync, renameSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import {
  catalogs, emailLanguages, emailArtwork, renderEmail,
  brandForLanguage, TEMPLATE_REVISION,
} from '../integrations/email-collection/index.mjs';
// Deliberately synthetic fixtures, confined to this development script.
import { demoData as referenceDemoData } from '../reference/kraken-emails/src/demo-data.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log('Usage: npm run build:emails -- [output-folder]\nDefault: .cache/kraken-email-studio\nAll data are synthetic. This script never sends emails.');
  process.exit(0);
}
if (args.length > 1 || args[0]?.startsWith('--')) throw new Error('Pass at most one positional output folder.');
const output = args[0] ? resolve(args[0]) : join(root, '.cache/kraken-email-studio');
const ids = Object.keys(catalogs.de);
if (ids.length !== 30 || ids.some(id => !/^[a-z][a-z0-9_]+$/.test(id))) throw new Error('Unexpected template inventory.');
for (const language of emailLanguages) if (Object.keys(catalogs[language]).join('\n') !== ids.join('\n')) throw new Error('Catalog inventories differ.');

/** Keep authored sample staff text consistent with the approved Spanish voice. */
function prepareDemoData(data, language) {
  if (language === 'es') {
    data.staffReply = 'Por supuesto, Laura. Hemos anotado sus indicaciones sobre el acceso. Acordaremos con usted los detalles antes de la cita.';
    data.resolution = 'Hemos completado el repaso de limpieza que acordamos con usted. Cuéntenos si queda algo pendiente.';
    data.openQuestions = ['¿Cómo accederemos al apartamento?'];
  }
  return data;
}
const demoData = (id, language, service) => prepareDemoData(referenceDemoData(id, language, service), language);
const json = value => JSON.stringify(value).replaceAll('<', '\\u003c').replaceAll('\u2028', '\\u2028').replaceAll('\u2029', '\\u2029');
const brands = Object.fromEntries(emailLanguages.map(language => [language, brandForLanguage(language)]));
const usedAssets = ['kraken-logo.png', ...Object.values(emailArtwork).map(art => art.file)];
if (new Set(usedAssets).size !== 31 || usedAssets.some(name => !/^[a-z0-9_-]+\.png$/.test(name))) throw new Error('Unexpected artwork inventory.');
const assetBytes = Object.fromEntries(usedAssets.map(name => [name, readFileSync(join(root, 'public/kraken-emails/assets', name))]));
const embeddedAssets = Object.fromEntries(usedAssets.map(name => [name, `data:image/png;base64,${assetBytes[name].toString('base64')}`]));

const samples = [];
let maxEmailHtmlBytes = 0;
for (const language of emailLanguages) {
  for (const id of ids) {
    const email = renderEmail(id, demoData(id, language), {
      catalogs, mode: 'preview', brand: brands[language], assetBaseUrl: '../../assets',
    });
    maxEmailHtmlBytes = Math.max(maxEmailHtmlBytes, Buffer.byteLength(email.html));
    samples.push([join('samples', language, `${id}.html`), email.html]);
    samples.push([join('samples', language, `${id}.txt`), `Subject: ${email.subject}\nPreheader: ${email.preheader}\n\n${email.text}`]);
  }
}

// Bundle browser-safe copied modules; server transport and demo data never enter
// the production dependency graph. The original shell remains untouched.
const modules = [readFileSync(join(root, 'src/config/business-hours.mjs'), 'utf8'),
  ...['language', 'labels', 'preparation', 'artwork', 'render'].map(name =>
    readFileSync(join(root, 'integrations/email-collection', `${name}.mjs`), 'utf8'))];
modules.push(readFileSync(join(root, 'reference/kraken-emails/src/demo-data.mjs'), 'utf8')
  .replace('export function demoData(', 'function referenceDemoData('));
const engine = modules.map(source => source
  .replace(/^import .*?;\s*$/gm, '')
  .replace(/^export\s+(const|function|class)\s/gm, '$1 ')).join('\n')
  + `\n${prepareDemoData.toString()}\nfunction demoData(id,language,service){return prepareDemoData(referenceDemoData(id,language,service),language);}\nconst EMAIL_BRANDS=${json(brands)};`;
const shell = readFileSync(join(root, 'reference/kraken-emails/src/studio.html'), 'utf8');
const originalRender = "renderEmail(selected,data,{catalogs:EMAIL_CATALOGS,assets:EMAIL_ASSETS,mode:'preview'})";
if (!shell.includes(originalRender)) throw new Error('Review the studio render hook after updating the reference shell.');
const gallery = shell
  .replace('__ENGINE__', () => engine)
  .replace('__CATALOGS__', () => json(catalogs))
  .replace('__ASSETS__', () => json(embeddedAssets))
  .replace(originalRender, "renderEmail(selected,data,{catalogs:EMAIL_CATALOGS,assets:EMAIL_ASSETS,mode:'preview',brand:EMAIL_BRANDS[data.language]})")
  .replaceAll('Limpieza de fin de contrato', 'Limpieza de fin de alquiler')
  .replaceAll('Descargar este email ↓', 'Descargar este email');
if (/__(?:ENGINE|CATALOGS|ASSETS)__/.test(gallery)) throw new Error('An unexpanded studio placeholder remains.');

function atomicWrite(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, value);
  renameSync(temporary, path);
}
for (const name of usedAssets) atomicWrite(join(output, 'assets', name), assetBytes[name]);
for (const [path, value] of samples) atomicWrite(join(output, path), value);
const galleryName = 'KRAKEN_EMAILS_INTEGRADOS_PREVIEW.html';
atomicWrite(join(output, galleryName), gallery);
const inventory = {
  edition: '2026-11-25', templateRevision: TEMPLATE_REVISION,
  demonstrationOnly: true, emailsSent: 0, paymentsMade: 0,
  templates: ids.length, languages: emailLanguages,
  htmlSamples: ids.length * emailLanguages.length, textSamples: ids.length * emailLanguages.length,
  uniqueIllustrations: Object.keys(emailArtwork).length, maxEmailHtmlBytes,
  standaloneStudio: galleryName,
  assets: Object.fromEntries(usedAssets.map(name => [name, { sha256: createHash('sha256').update(assetBytes[name]).digest('hex'), bytes: assetBytes[name].length }])),
  templatesById: ids.map(id => ({ id, title: catalogs.es[id].title, event: catalogs.de[id].event, kind: catalogs.de[id].kind, artwork: emailArtwork[id].file })),
};
atomicWrite(join(output, 'EMAIL_CATALOG_INTEGRADO.json'), JSON.stringify(inventory, null, 2) + '\n');
atomicWrite(join(output, 'COMO_REGENERAR.txt'),
  'Galería y180ejemplos HTML/texto de la colección integrada. Datos sintéticos; ningún envío ni pago.\n'
  + 'Desde el repositorio: npm run build:emails -- /ruta/absoluta/de/salida\n'
  + 'Sin argumento: .cache/kraken-email-studio\n'
  + 'Abrir KRAKEN_EMAILS_INTEGRADOS_PREVIEW.html para revisar los seis idiomas, imágenes y formato móvil.\n');
console.log(JSON.stringify({ output, templates: ids.length, languages: emailLanguages.length,
  htmlSamples: 180, textSamples: 180, uniqueIllustrations: 30,
  maxEmailHtmlBytes, standaloneStudio: join(output, galleryName), emailsSent: 0, paymentsMade: 0 }, null, 2));
