import type {TermsTranslation} from './types';
import {routeLanguage} from '../../src/routing/site-paths.ts';
import de from '../../src/legal/versions/kraken-2026-11-26-pricing-moving/de.json' with {type:'json'};
import en from '../../src/legal/versions/kraken-2026-11-26-pricing-moving/en.json' with {type:'json'};
import es from '../../src/legal/versions/kraken-2026-11-26-pricing-moving/es.json' with {type:'json'};
import pt from '../../src/legal/versions/kraken-2026-11-26-pricing-moving/pt.json' with {type:'json'};
import it from '../../src/legal/versions/kraken-2026-11-26-pricing-moving/it.json' with {type:'json'};
import fr from '../../src/legal/versions/kraken-2026-11-26-pricing-moving/fr.json' with {type:'json'};
const frozen={de,en,es,pt,it,fr};
/** Read-only pre-update snapshot: historical accepted contracts are not rewritten. */
export function getLegacyTermsTranslation(language:unknown):TermsTranslation{return frozen[routeLanguage(language)||'de'].legacyOriginal;}
