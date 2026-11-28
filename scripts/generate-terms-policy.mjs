import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { CURRENT_TERMS_VERSION } from '../src/legal/terms-version.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const version = CURRENT_TERMS_VERSION;
const languages = ['de', 'en', 'es', 'pt', 'it', 'fr'];
// Facts expressly supplied by the owner in this update, rather than insurance claims.
const owner = {
  de: { insurance: 'Das klären wir gern persönlich.', team: 'Antonio, bei Bedarf mit Helfern.' },
  en: { insurance: 'We are happy to clarify that personally.', team: 'Antonio, with helpers when needed.' },
  es: { insurance: 'Lo aclaramos con usted personalmente.', team: 'Antonio, con ayudantes cuando sea necesario.' },
  pt: { insurance: 'Teremos todo o gosto em esclarecer pessoalmente.', team: 'Antonio, com ajudantes quando necessário.' },
  it: { insurance: 'Lo chiariamo volentieri di persona.', team: 'Antonio, con aiutanti se necessario.' },
  fr: { insurance: 'Nous le clarifions volontiers personnellement.', team: 'Antonio, avec des aides si nécessaire.' },
};
const plain = blocks => blocks.map(block => block.type === 'list' ? block.items.join('\n') : block.text.replace(/^\d+\.\d+\s+/, '')).join('\n\n');
function clause(section, subclause) {
  if (subclause === undefined) return plain(section.blocks);
  const start = section.blocks.findIndex(block => block.type === 'paragraph' && block.text.startsWith(`${section.number}.${subclause} `));
  if (start < 0) throw new Error('Missing source clause ' + section.number + '.' + subclause);
  let end = start + 1;
  while (end < section.blocks.length && !(section.blocks[end].type === 'paragraph' && /^\d+\.\d+\s/.test(section.blocks[end].text))) end++;
  return plain(section.blocks.slice(start, end));
}
const policies = {}, sources = {};
for (const language of languages) {
  const source = await readFile(path.join(root, 'src/legal/versions', version, language + '.json'), 'utf8');
  const document = JSON.parse(source);
  if (document.version !== version || document.language !== language || document.sections.length !== 17) throw new Error('Incomplete legal source ' + language);
  const section = number => {
    const value = document.sections.find(item => item.number === number);
    if (!value) throw new Error('Missing source section ' + number);
    return value;
  };
  policies[language] = {
    prepayment: clause(section(4), 1),
    deposit: clause(section(4), 1),
    payment: [clause(section(4), 1), clause(section(4), 2), clause(section(4), 3), clause(section(4), 4), clause(section(4), 6)].join('\n\n'),
    cancellation: [clause(section(7), 1), clause(section(7), 2), clause(section(7), 4)].join('\n\n'),
    rescheduling: clause(section(7), 3),
    guaranteeScope: clause(section(9), 1),
    guarantee: clause(section(9)),
    preparation: clause(section(6)),
    materials: clause(section(6), 3),
    ...owner[language],
  };
  sources[language] = createHash('sha256').update(source).digest('hex');
}
const generated = JSON.stringify({ version, sources, policies }, null, 2) + '\n';
const destination = path.join(root, 'src/legal/terms-policy.generated.json');
if (process.argv.includes('--check')) {
  if (await readFile(destination, 'utf8') !== generated) throw new Error('Legal policy data is stale; run scripts/generate-terms-policy.mjs');
  console.log('Legal policy data matches all six immutable source documents.');
} else {
  await writeFile(destination, generated);
  console.log('Generated legal policy data from all six immutable source documents.');
}
