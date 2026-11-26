import type { HomeLanguage } from '../components/home/homeTranslations.ts';
export const foldKai = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** Detect the writer, never change the site's locale. Short quantities retain context. */
export function kaiMessageLanguage(message: string, fallback: HomeLanguage): HomeLanguage {
  const text = foldKai(message);
  const markers: Record<HomeLanguage, RegExp[]> = {
    de: [/\b(?:ich|wir|ihr|eine|einen|meine|konnt|konnen|bitte|brauche|kostet|verrechnet|gibt|zimmer|badezimmer|ubergabe|reinigung|nicht|ohne|wochent|jede)\b/g],
    en: [/\b(?:i|we|you|need|would|please|hello|hi|how|what|my|your|want|cleaning|tenancy|bathroom|weekly|speak|refund)\b/g],
    es: [/\b(?:hola|necesito|quiero|pueden|cuanto|limpieza|alquiler|habitaciones|banos|piso|hablar|humano|gracias|hacen|tienen|dinero|devolver|con)\b/g],
    pt: [/\b(?:ola|preciso|quero|limpeza|arrendamento|divisoes|casa|banho|falar|pessoa|obrigado|voces|pode|mudanca|nao|dinheiro|tenho)\b/g],
    it: [/\b(?:ciao|buongiorno|vorrei|bisogno|pulizia|pulizie|locazione|trasloco|bagni|parlare|persona|grazie|potete|quanto|rimborso|non|con)\b/g],
    fr: [/\b(?:bonjour|besoin|voudrais|nettoyage|bail|pieces|bains|parler|personne|merci|pouvez|combien|remboursement|avec|vous|pas|suis)\b/g],
  };
  const scores = (Object.entries(markers) as [HomeLanguage,RegExp[]][]).map(([language, patterns]) =>
    [language, patterns.reduce((total, pattern) => total + (text.match(pattern)?.length || 0), 0)] as const);
  scores.sort((a,b) => b[1]-a[1]);
  return scores[0][1] > 0 && scores[0][1] > scores[1][1] ? scores[0][0] : fallback;
}

export const complaintKai = (text: string) => /reklamation|beschwer|nicht zufrieden|geld zuruck|money back|refund|not (?:happy|satisfied)|complaint|queja|reclamaci|no (?:estoy )?(?:satisfech|content)|devol(?:ver|ucion)|reembolso|(?:devuelv|devolver).{0,20}dinero|dinero.{0,20}(?:vuelta|devuelv)|dinheiro.{0,20}(?:volta|devol)|insatisf|reclamac|nao (?:estou )?satisfeit|rimborso|non (?:sono )?soddisfatt|reclamation|pas satisfait|rembours/.test(foldKai(text));
export const humanKai = (text: string) => !/llamar antes|call before|anrufen vor|ligar antes|chiamare prima|appeler avant/.test(foldKai(text)) && /(?:menschen?|mitarbeiter|person|human|humano|pessoa|operador|operatore|quelqu.un).{0,25}(?:sprech|speak|hablar|falar|parlar|parler)|(?:sprech|speak|hablar|falar|parlar|parler).{0,35}(?:menschen?|mitarbeiter|person|human|humano|pessoa|operador|operatore|quelqu.un)|anrufen|ruckruf|call (?:me|you|someone)|phone|telefon|llamar|llamen|ligar|chiamare|appeler|contact|kontakt|correo|email/.test(foldKai(text));
export const commercialKai = (text: string) => /\b(?:buroreinigung|buros?|offices?|commercial|gewerbe|unternehmen|oficinas?|empresas?|escritorios?|uffici|aziend[ae]|bureaux|entreprises?)\b/.test(foldKai(text));
export const discountKai = (text: string) => /rabatt|discount|descuento|desconto|sconto|remise|reduction|ignoriere|ignore (?:all|previous)|ignora (?:todas|las|tutte)|ignorez/.test(foldKai(text));
export const questionKai = (text: string) => /[?¿]/.test(text) || /^(?:was |wie |gibt |konnt |konnen |habt |verrechnet |wer |wann |wo |how |what |can |do |is |who |when |where |cuanto|que |como |pueden|tienen|qual |quanto|pode|che |cosa |potete|quel|comment|combien|est.ce)/.test(foldKai(text).trim());

/** We only assert exclusion for a named outside city or a postcode outside the supported regions.
 * An unfamiliar place is clarified personally rather than labelled as covered.
 */
export function outsideKaiArea(message: string): boolean {
  const text = foldKai(message);
  if (/\b(?:bern|berne|basel|bale|geneve|geneva|ginebra|lausanne|luzern|lucerne|lugano|st[. ]+gallen|aarau|zug|london|londres|paris|madrid|lisboa|lisbon|berlin)\b/.test(text)) return true;
  const postcodes = [...text.matchAll(/\b([1-9]\d{3})\b/g)].map(match=>match[1]).filter(code=>!/^20[2-9]\d$/.test(code));
  return postcodes.some(code => !/^(?:80|81|82|83|84|85|86|87|89)\d{2}$/.test(code));
}
