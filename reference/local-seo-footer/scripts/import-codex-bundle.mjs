#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { lstat, mkdir, readFile, realpath, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FORMAT = 'kraken-codex-bundle-v1';
const PROJECT = 'kraken-services-transit';
const BASE64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

function fail(message) {
  throw new Error(message);
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validatePath(value) {
  if (typeof value !== 'string' || !value || value.includes('\\')
    || /[\u0000-\u001f\u007f]/.test(value)
    || Buffer.from(value, 'utf8').toString('utf8') !== value
    || path.posix.isAbsolute(value) || path.win32.isAbsolute(value)) {
    fail(`Ruta de archivo no válida: ${JSON.stringify(value)}`);
  }
  const segments = value.split('/');
  if (segments.some(segment => !segment || segment === '.' || segment === '..'
    || /[<>:"|?*]/.test(segment) || /[. ]$/.test(segment)
    || /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(segment))) {
    fail(`La ruta debe ser relativa, portable y sin segmentos especiales: ${JSON.stringify(value)}`);
  }
  return segments;
}

// Validate every path and payload before the importer creates any directory.
// Returning bytes also prevents a later decoding step from changing the data.
export function validateBundle(bundle) {
  if (!isRecord(bundle) || bundle.format !== FORMAT || bundle.project !== PROJECT
    || !Array.isArray(bundle.files) || bundle.files.length === 0) {
    fail(`Paquete no válido: se requiere format=${FORMAT}, project=${PROJECT} y files no vacío.`);
  }

  const paths = new Map();
  const files = bundle.files.map((entry, index) => {
    if (!isRecord(entry)) fail(`Entrada de archivo ${index + 1} no válida.`);
    const segments = validatePath(entry.path);
    // Also reject case/Unicode collisions that would overwrite on other systems.
    const portablePath = entry.path.normalize('NFC').toLowerCase();
    if (paths.has(portablePath)) fail(`Ruta duplicada o incompatible: ${entry.path}`);
    paths.set(portablePath, entry.path);

    if (!['utf8', 'base64'].includes(entry.encoding) || typeof entry.content !== 'string') {
      fail(`Codificación o contenido no válido: ${entry.path}`);
    }
    if (!Number.isSafeInteger(entry.bytes) || entry.bytes < 0
      || typeof entry.sha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(entry.sha256)) {
      fail(`Tamaño o SHA-256 no válido: ${entry.path}`);
    }

    if (entry.encoding === 'base64' && !BASE64.test(entry.content)) {
      fail(`Base64 no válido: ${entry.path}`);
    }
    const data = Buffer.from(entry.content, entry.encoding);
    if (data.toString(entry.encoding) !== entry.content) {
      fail(`Contenido ${entry.encoding} no canónico: ${entry.path}`);
    }
    if (data.length !== entry.bytes) fail(`El tamaño no coincide: ${entry.path}`);
    const digest = createHash('sha256').update(data).digest('hex');
    if (digest !== entry.sha256.toLowerCase()) fail(`El SHA-256 no coincide: ${entry.path}`);
    return { path: entry.path, segments, portablePath, data };
  });

  const directorySpellings = new Map();
  for (const file of files) {
    const segments = file.portablePath.split('/');
    for (let length = 1; length < segments.length; length++) {
      const parent = segments.slice(0, length).join('/');
      if (paths.has(parent)) {
        fail(`Un archivo también se usa como carpeta: ${paths.get(parent)} / ${file.path}`);
      }
      const spelling = file.segments.slice(0, length).join('/');
      if (directorySpellings.has(parent) && directorySpellings.get(parent) !== spelling) {
        fail(`Carpetas con nombres incompatibles entre sistemas: ${directorySpellings.get(parent)} / ${spelling}`);
      }
      directorySpellings.set(parent, spelling);
    }
  }
  return files;
}

async function ensureAbsent(destination) {
  try {
    await lstat(destination);
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }
  fail(`La carpeta destino ya existe; elige una carpeta nueva: ${destination}`);
}

export async function importBundle(bundleFile, outputDirectory) {
  let bundle;
  try {
    bundle = JSON.parse(await readFile(bundleFile, 'utf8'));
  } catch (error) {
    fail(`No se pudo leer el paquete JSON: ${error.message}`);
  }
  const files = validateBundle(bundle);
  const requestedDestination = path.resolve(outputDirectory);
  await ensureAbsent(requestedDestination);

  // The parent must already exist. Resolve it once; never create outside paths.
  const parent = await realpath(path.dirname(requestedDestination));
  if (!(await stat(parent)).isDirectory()) fail(`El directorio padre no es una carpeta: ${parent}`);
  const destination = path.join(parent, path.basename(requestedDestination));
  await ensureAbsent(destination);

  // Non-recursive mkdir is the atomic no-overwrite gate if the path appears now.
  await mkdir(destination, { mode: 0o755 });
  const directories = new Set();
  for (const file of files) {
    for (let length = 1; length < file.segments.length; length++) {
      directories.add(file.segments.slice(0, length).join('/'));
    }
  }

  try {
    for (const directory of [...directories].sort((a, b) => a.split('/').length - b.split('/').length)) {
      await mkdir(path.join(destination, ...directory.split('/')), { mode: 0o755 });
    }
    for (const file of files) {
      await writeFile(path.join(destination, ...file.segments), file.data, { flag: 'wx', mode: 0o644 });
    }
  } catch (error) {
    fail(`La escritura no pudo completarse en ${destination}. No se ha sobrescrito ningún archivo. La carpeta parcial se conserva para revisión. ${error.message}`);
  }
  return { destination, files: files.length, bytes: files.reduce((total, file) => total + file.data.length, 0) };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args.includes('--help')) {
    console.log('Uso: node scripts/import-codex-bundle.mjs /ruta/paquete.json /ruta/nueva-carpeta');
    console.log('La carpeta destino no debe existir; su carpeta padre sí debe existir. Acepta también paquete.txt.');
    if (!args.includes('--help')) process.exitCode = 1;
  } else {
    try {
      const result = await importBundle(args[0], args[1]);
      console.log(`Importados ${result.files} archivos (${result.bytes} bytes) en ${result.destination}`);
      console.log('Se comprobaron todas las rutas, tamaños y hashes antes de escribir. No se ha ejecutado contenido del paquete.');
    } catch (error) {
      console.error(`No se pudo importar: ${error.message}`);
      process.exitCode = 1;
    }
  }
}
