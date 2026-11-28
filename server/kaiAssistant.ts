import type { RequestHandler } from 'express';
import { normalizeHomeLanguage } from '../components/home/homeTranslations.ts';
import {
  KAI_FIELDS, KAI_SERVICES, emptyKaiDraft,
  type KaiAssistantRequest, type KaiAssistantResponse, type KaiDraft, type KaiField, type KaiService,
} from '../src/kai/types.ts';
import { getKaiFact, kaiCopy, kaiQuestion, kaiServiceName, type KaiFactTopic } from './kaiKnowledge.ts';
import { extractDraft, validKaiDate } from './kaiExtraction.ts';
import { cancellationKai, commercialKai, complaintKai, discountKai, humanKai, kaiMessageLanguage, outsideKaiArea, questionKai } from './kaiIntents.ts';
import { calculateKaiQuote } from './kaiPricing.ts';
import { kaiReplies } from './kaiReplies.ts';
import { createGeminiProvider } from './kaiGemini.ts';
import { businessHoursSentence } from '../src/config/business-hours.mjs';

export const KAI_DEFAULT_MODEL = 'gemini-3.5-flash-lite';
const LANGUAGES = ['de', 'en', 'es', 'pt', 'it', 'fr'];
const MAX_MESSAGE = 2000;
const MAX_FIELD = 1200;
const fold = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const own = (object: object, key: string) => Object.prototype.hasOwnProperty.call(object, key);
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const onlyKeys = (value: Record<string, unknown>, keys: readonly string[]) =>
  Object.keys(value).every(key => keys.includes(key));
const service = (value: unknown): value is KaiService => typeof value === 'string' && KAI_SERVICES.includes(value as KaiService);
const field = (value: unknown): value is KaiField => typeof value === 'string' && KAI_FIELDS.includes(value as KaiField);
const unique = <T,>(values: T[]) => [...new Set(values)];
const moneyClaim = new RegExp(
  '\\b(?:prices?|rates?|fees?|quotes?|estimates?|estimated|estimacion|estimativa|estimation|stima|angebot|kostenvoranschlag|devis|offerte?|costs?|costes?|custos?|cost[ao]|cuesta|kostet|kosten|prix|couts?|tariffs?|tarife?|tarifas?|precio|preco|prezzo|budget|presupuesto|orcamento)\\b[^.!?\\n]{0,70}\\b'
  + '(?:\\d+(?:[.,]\\d+)?|zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|'
  + 'null|ein[es]?|zwei|drei|vier|funf[a-z]*|sechs[a-z]*|sieben[a-z]*|acht[a-z]*|neun[a-z]*|zehn|elf|zwolf|[a-z]+zig|hundert|tausend|'
  + 'cero|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|veinti[a-z]*|treinta|cuarenta|cincuenta|sesenta|setenta|ochenta|noventa|cien[a-z]*|mil|'
  + 'um|uma|dois|duas|quatro|sete|oito|nove|dez[a-z]*|vinte|trinta|quarenta|cinquenta|sessenta|oitenta|cem|cento|'
  + 'due|tre|quattro|cinque|sei|sette|otto|dieci|undici|dodici|venti|trenta|quaranta|cinquanta|sessanta|settanta|ottanta|novanta|mille|'
  + 'un|une|deux|trois|quatre|cinq|sept|huit|neuf|dix|onze|douze|vingt|trente|quarante|cinquante|soixante|cent)\\b',
);

/** Currency/discount claims are prohibited; household quantities and postcodes remain valid. */
export function hasMonetaryContent(value: string): boolean {
  const text = fold(value);
  return /[$€£]|\b(?:chf|eur|usd|gbp|francs?|francos?|franken|euros?)\b/.test(text)
    || /\b\d+(?:[.,]\d+)?\s*%/.test(text)
    || /\b(?:discount|rabatt|remise|reduction|descuento|desconto|sconto)\b/.test(text)
    || moneyClaim.test(text)
    || /\b\d+(?:[.,]\d+)?\s*(?:fr\.?(?=\s|$)|\.\-(?=\s|$))/.test(text);
}

export function stripKaiMonetaryText(value: string): string {
  return value.split(/(?<=[.!?])\s+|[,;]\s+|\n+/).filter(part => !hasMonetaryContent(part)).join(' ').trim().slice(0, MAX_FIELD);
}

function validateDraft(value: unknown): KaiDraft {
  if (!record(value) || !onlyKeys(value, ['version', 'language', 'service', 'services', 'fields', 'deferred'])
    || value.version !== 1 || !LANGUAGES.includes(String(value.language))
    || !(value.service === null || service(value.service))
    || !Array.isArray(value.services) || value.services.length > 5 || !value.services.every(service)
    || !record(value.fields) || !Object.keys(value.fields).every(field)
    || !Array.isArray(value.deferred) || value.deferred.length > KAI_FIELDS.length || !value.deferred.every(field)) {
    throw new Error('invalid_draft');
  }
  const fields: KaiDraft['fields'] = {};
  for (const [key, input] of Object.entries(value.fields)) {
    if (typeof input !== 'string' || input.length > MAX_FIELD) throw new Error('invalid_field');
    if (key === 'date' && !validKaiDate(input)) continue;
    const plain = input.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
    const cleaned = key === 'notes' && !hasMonetaryContent(plain) ? plain.trim() : stripKaiMonetaryText(plain);
    if (cleaned) fields[key as KaiField] = cleaned;
  }
  if (JSON.stringify(fields).length > 10000) throw new Error('draft_too_large');
  return {
    version: 1, language: normalizeHomeLanguage(value.language),
    service: value.service as KaiService | null,
    services: unique(value.services as KaiService[]),
    fields, deferred: unique(value.deferred as KaiField[]),
  };
}

export function parseKaiRequest(input: unknown): KaiAssistantRequest {
  if (!record(input) || !onlyKeys(input, ['message', 'messages', 'draft', 'language'])
    || typeof input.message !== 'string' || !input.message.trim() || input.message.length > MAX_MESSAGE
    || !LANGUAGES.includes(String(input.language))
    || !Array.isArray(input.messages) || input.messages.length > 20) throw new Error('invalid_request');
  let historyLength = 0;
  const messages = input.messages.map(value => {
    if (!record(value) || !onlyKeys(value, ['role', 'text']) || !['user', 'assistant'].includes(String(value.role))
      || typeof value.text !== 'string' || value.text.length > MAX_MESSAGE) throw new Error('invalid_history');
    historyLength += value.text.length;
    return { role: value.role as 'user' | 'assistant', text: value.text };
  });
  if (historyLength > 16000) throw new Error('history_too_large');
  const draft = validateDraft(input.draft);
  draft.language = kaiMessageLanguage(input.message, normalizeHomeLanguage(input.language));
  return { message: input.message.trim(), messages, draft, language: draft.language };
}

const priceQuestion = /\b(?:price|how much|cost|preis|kosten|kostet|prix|tarif|combien|precio|cuanto|cuesta|presupuesto|preco|quanto|custa|orcamento|prezzo|costo|costa|preventivo)\b/;
const deferredPattern = /dont know|don't know|do not know|not sure|not yet|later|no date yet|noch nicht|weiss.{0,8}nicht|spater|no lo se|no se|todavia no|no tengo fecha|despues|nao sei|ainda nao|mais tarde|non lo so|piu tardi|je ne sais|pas encore|plus tard/;
const required: Record<KaiService, KaiField[]> = {
  windows: ['city', 'windowsCount', 'windowType', 'windowAccess', 'date'],
  end: ['city', 'rooms', 'area', 'bathrooms', 'date'],
  regular: ['city', 'frequency', 'hours'],
  deep: ['city', 'hours', 'priorities', 'date'],
  moving: ['origin', 'destination', 'inventory', 'originAccess', 'destinationAccess', 'date'],
};

export function missingKaiFields(draft: KaiDraft): KaiField[] {
  if (!draft.service) return [];
  return required[draft.service].filter(key => !draft.fields[key] && !draft.deferred.includes(key)
    && !(key === 'city' && draft.fields.postcode));
}

/** Deterministic extraction is shared by offline and AI modes. */
export function extractKaiDraft(request: KaiAssistantRequest, now = new Date()): KaiDraft {
  return extractDraft(request, stripKaiMonetaryText, now);
}

function factTopic(text: string): KaiFactTopic | undefined {
  if (cancellationKai(text)) return 'cancellation';
  if (/\bvat\b|\biva\b|\btva\b|mwst|mehrwertsteuer/.test(text)) return 'vat';
  if (/garant|garanz|handover guarantee|abnahme/.test(text)) return 'guarantee';
  if (/versicher|insured|insurance|segurad|seguro|assicur|assur/.test(text)) return 'insurance';
  if (/anzahl|zahl|payment|deposit|\bpay\b|upfront|in advance|pagar|pagamento|pago|anticipo|acconto|sinal|acompte|paiement|payer|payez|payrexx/.test(text)) return 'payment';
  if (/wie lange|dauer|duration|how long|cuanto (?:tiempo|dura)|quanto (?:tempo|dura)|combien de temps/.test(text)) return 'duration';
  if (/verfugbar|termin.*frei|available|availability|disponib|disponiv|disponibil|frei.*termin/.test(text)) return 'availability';
  if (/wer kommt|wer reinigt|who (?:comes|cleans)|quien (?:viene|limpia)|quem (?:vem|limpa)|chi (?:viene|pulisce)|qui (?:vient|nettoie)|team|equipo|equipe/.test(text)) return 'team';
  if (/region|areas|where.*work|zona|regiao|wo.*tatig|kommt ihr auch|do you.*(?:serve|come)|vienen.*tambien/.test(text)) return 'regions';
  if (/prepar|vorbereit|material|reinigungsmittel|gerate|products|equipment|productos|produtos|attrezz|materiel/.test(text)) return 'preparation';
  if (/include|inclu|compris|enthalt/.test(text)) return 'included';
}
const businessHoursQuestions = [
  /offnungszeiten|geschaftszeiten|kontaktzeiten|sprechzeiten|wann.{0,30}(?:erreichbar|geoffnet|offnet|schliesst)/,
  /(?:opening|business|contact|customer (?:service|support)) hours|what are your hours|what time (?:are you open|do you (?:open|close))|when (?:are you|do you) (?:open|close)|when can i (?:call|contact|reach)/,
  /horario (?:de (?:atencion|apertura|contacto|atendimento|funcionamento)|comercial)|(?:cual|qual) (?:es |e )?(?:su|vuestro|el|o vosso|o seu|o) horario|que horario.{0,15}(?:tienen|teneis)|a que horas?.{0,20}(?:atienden|abren|cierran|atendem|abrem|fecham)/,
  /(?:orario|orari) (?:di (?:apertura|assistenza|contatto)|commerciali)|quali sono (?:i vostri|gli) orari|qual e (?:il vostro|il suo) orario|a che ora.{0,20}(?:aprite|chiudete|siete aperti|posso chiamare)/,
  /horaires? (?:d.?ouverture|de (?:contact|service|permanence))|quels sont vos horaires|a quelle heure.{0,20}(?:ouvrez|fermez)|quand.{0,15}(?:vous joindre|puis.je (?:appeler|vous joindre))/,
  /(?:habt ihr|haben sie|seid ihr|sind sie) (?:jetzt )?geoffnet|are you (?:currently )?open|(?:estais|estan|estao|esta) (?:ahora |agora )?abiert[oa]s?|(?:estao|esta) (?:agora )?abert[oa]s?|siete (?:ora )?aperti|etes.vous (?:actuellement )?ouverts?/,
  /^[¿\s]*(?:horario|horarios|horaires|orari)[?¿\s]*$/,
];
const businessHoursQuestion = (text: string) => businessHoursQuestions.some(pattern => pattern.test(text));

function guidedResponse(request: KaiAssistantRequest, draft: KaiDraft): KaiAssistantResponse {
  const copy = kaiCopy(request.language), replies = kaiReplies[request.language], text = fold(request.message);
  const missing = missingKaiFields(draft);
  const topic = factTopic(text);
  if (!topic && businessHoursQuestion(text)) return { message: businessHoursSentence(request.language), draft, missing, suggestions: [], actions: ['contact'], mode: 'guided', contactCard: true };
  const immediate = /baureinigung|post.?construction|fin de obra|pos.?obra|fine cantiere|fin de chantier/.test(text) ? replies.human
    : complaintKai(request.message) ? replies.apology
    : humanKai(request.message) ? replies.human
    : commercialKai(request.message) ? replies.privateOnly
    : outsideKaiArea(request.message) ? replies.outside : '';
  if (immediate) return { message: immediate, draft, missing, suggestions: [], actions: ['contact'], mode:'guided', contactCard:true };
  const fact = topic ? getKaiFact(topic, request.language, draft.service) : undefined;
  if (fact && ['payment', 'cancellation', 'insurance'].includes(topic!)) return {
    message: fact.answer, draft, missing, suggestions: [],
    actions: fact.contact ? ['contact'] : ['continue', 'contact'], mode: 'guided',
    ...(fact.contact ? {contactCard: true} : {}),
  };
  // French «garantie de remise» describes handover, not a discount request.
  let answer = discountKai(request.message) && topic !== 'guarantee' ? replies.discount : fact?.answer || '';
  if (topic === 'availability' && fact && answer === fact.answer) answer = `${fact.answer} ${businessHoursSentence(request.language)}`;
  if (!answer && /ford|transit|van\b|furgon|fahrzeug|laderaum|capacity|dimensions|masse|medidas|dimensioni|cabe|fit\b/.test(text)) answer = copy.vehicle;
  if (!answer && /wetter|weather|clima|politic|bitcoin|competitor|konkurrent|competidor|concorrent|concurrent|capital of|hauptstadt/.test(text)) answer = replies.offtopic;
  if (!answer && deferredPattern.test(text)) answer = copy.deferred;
  const price = !answer && draft.service ? calculateKaiQuote(draft) : null;
  if (price) answer = price.message;
  else if (!answer && priceQuestion.test(text)) answer = copy.price;
  const ambiguous = !draft.service;
  const moveNeedsChoice = !draft.service && /ziehe|ausziehen|moving out|me mudo|dejo|je demenage/.test(text);
  const followup = ambiguous ? moveNeedsChoice ? replies.movingChoice : draft.services.length > 1 ? copy.multiple : answer ? replies.short : copy.choose
    : missing[0] ? kaiQuestion(request.language, missing[0]) : copy.ready;
  return {
    message: [answer || (Object.keys(draft.fields).length ? copy.acknowledged : ''), followup].filter(Boolean).join(price ? '\n\n' : ' '),
    draft, missing,
    suggestions: answer ? [] : ambiguous ? (draft.services.length ? draft.services : [...KAI_SERVICES]).map(key => kaiServiceName(request.language, key))
      : missing.length ? [copy.unknown, copy.later] : [],
    actions: ambiguous ? ['choose_service', 'continue', 'contact'] : ['continue', 'contact'], mode: 'guided',
    ...(price ? {quote: price.quote} : {}), ...(fact?.contact ? {contactCard:true} : {}),
  };
}

export type KaiProvider = (request: KaiAssistantRequest, signal: AbortSignal) => Promise<unknown>;
export interface KaiAssistantOptions {
  provider?: KaiProvider;
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
  now?: () => number;
}

const draftSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    version: { type: 'integer', enum: [1] }, language: { type: 'string', enum: LANGUAGES },
    service: { anyOf: [{ type: 'string', enum: KAI_SERVICES }, { type: 'null' }] },
    services: { type: 'array', items: { type: 'string', enum: KAI_SERVICES } },
    fields: { type: 'object', additionalProperties: false, properties: Object.fromEntries(KAI_FIELDS.map(key => [key, { type: 'string' }])) },
    deferred: { type: 'array', items: { type: 'string', enum: KAI_FIELDS } },
  }, required: ['version', 'language', 'service', 'services', 'fields', 'deferred'],
};
export const KAI_RESPONSE_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    message: { type: 'string' }, draft: draftSchema,
    missing: { type: 'array', items: { type: 'string', enum: KAI_FIELDS } },
    suggestions: { type: 'array', items: { type: 'string' } },
    actions: { type: 'array', items: { type: 'string', enum: ['continue', 'choose_service', 'contact'] } },
  }, required: ['message', 'draft', 'missing', 'suggestions', 'actions'],
};

function validatedProviderResponse(value: unknown, request: KaiAssistantRequest, extracted: KaiDraft): KaiAssistantResponse {
  if (!record(value) || !onlyKeys(value, ['message', 'draft', 'missing', 'suggestions', 'actions'])
    || typeof value.message !== 'string' || !value.message.trim() || value.message.length > MAX_MESSAGE
    || !Array.isArray(value.missing) || !value.missing.every(field)
    || !Array.isArray(value.suggestions) || value.suggestions.length > 6 || !value.suggestions.every(item => typeof item === 'string' && item.length <= 180)
    || !Array.isArray(value.actions) || !value.actions.every(action => ['continue', 'choose_service', 'contact'].includes(String(action)))) throw new Error('invalid_response');
  const candidate = validateDraft(value.draft);
  if (kaiMessageLanguage(value.message, request.language) !== request.language) throw new Error('invalid_response');
  if ([value.message, ...value.suggestions].some(item => hasMonetaryContent(String(item)))) throw new Error('unsafe_response');
  if (/gardening|pest control|car detailing|gutter cleaning|office cleaning|gartenpflege|jardinage|jardineria|jardinagem|giardinaggio/.test(fold(value.message))) throw new Error('unsafe_response');
  // Contact and external destinations are server-owned, never supplied by a model.
  if (/https?:\/\/|www\.|[\w.+-]+@[\w.-]+\.[a-z]{2,}|\+\d[\d\s().-]{7,}/i.test(value.message)) throw new Error('unsafe_response');
  if (/\b(?:booking confirmed|reservation confirmed|request sent|booked|reservado|reserva confirmada|solicitud enviada|solicitacao enviada|anfrage gesendet|buchung bestatigt|reservation confirmee|demande envoyee|prenotazione confermata|richiesta inviata|pedido enviado|guarantee|garantie|garantiza|garantizamos|garantimos|garantiamo|garantissons|available|disponible|disponivel|disponibile)\b/.test(fold(value.message))
    || /\d\s*(?:kg|tonnes?|m3|m³|cm|metres?|meters?)\b/.test(fold(value.message))) throw new Error('unsafe_claim');
  const draft = structuredClone(extracted);
  const latestEvidence = fold(request.message);
  const allEvidence = fold([request.message, ...request.messages.filter(message => message.role === 'user').map(message => message.text)].join(' '));
  for (const [key, text] of Object.entries(candidate.fields)) {
    // Notes already contain the explicit/residual user wording. A model must
    // not reintroduce the complete turn alongside its structured facts.
    if (key === 'notes') continue;
    // A substring of a postcode/date/phone is not evidence of a room count.
    // These fields must already have field-specific deterministic evidence.
    if (['rooms', 'bedrooms', 'bathrooms', 'windowsCount', 'postcode', 'date', 'area', 'hours'].includes(key)) {
      const known = extracted.fields[key as KaiField];
      if (text && known && fold(text).replace(',', '.') === fold(known).replace(',', '.')) draft.fields[key as KaiField] = text;
      continue;
    }
    const evidence = request.draft.fields[key as KaiField] && request.draft.fields[key as KaiField] !== text ? latestEvidence : allEvidence;
    // Unverifiable reformulations stay in the user-worded deterministic draft.
    if (text && evidence.includes(fold(text))) draft.fields[key as KaiField] = text;
  }
  draft.language = request.language;
  // Server authority determines missing fields and never accepts an action to send anything.
  const price = calculateKaiQuote(draft);
  const missing = missingKaiFields(draft);
  const acknowledgement = value.message.split(/(?<=[.!?])\s+/).filter(sentence => !questionKai(sentence)).join(' ').trim();
  const followup = draft.service ? missing[0] ? kaiQuestion(request.language,missing[0]) : kaiCopy(request.language).ready : kaiReplies[request.language].short;
  return { message: [price?.message, acknowledgement, followup].filter(Boolean).join(price ? '\n\n' : ' '), ...(price ? {quote:price.quote} : {}), draft, missing, suggestions: [],
    actions: draft.service ? ['continue', 'contact'] : ['choose_service', 'continue', 'contact'], mode: 'ai' };
}

export async function respondKai(input: unknown, options: KaiAssistantOptions = {}): Promise<KaiAssistantResponse> {
  const request = parseKaiRequest(input);
  const extracted = extractKaiDraft(request, new Date((options.now || Date.now)()));
  const fallback = guidedResponse(request, extracted);
  // Prices, facts, scope and escalations are authoritative server answers, never model guesses.
  const newPricingFacts = ['rooms','area','hours','bathrooms','priorities'].some(key => extracted.fields[key as KaiField] !== request.draft.fields[key as KaiField]);
  if (fallback.quote && newPricingFacts || !extracted.service && /ziehe|ausziehen|moving out|me mudo/.test(fold(request.message))) return fallback;
  if (fallback.contactCard || factTopic(fold(request.message)) || priceQuestion.test(fold(request.message)) || hasMonetaryContent(request.message) || discountKai(request.message)
    || /wetter|weather|clima|politic|bitcoin|competitor|konkurrent|competidor|concorrent|concurrent|better than|besser als|mejor que|melhor que|meglio di|meilleur que/.test(fold(request.message))) return fallback;
  const apiKey = options.apiKey ?? process.env.GEMINI_API_KEY;
  const provider = options.provider || (apiKey ? createGeminiProvider(apiKey, options.model || process.env.GEMINI_MODEL || KAI_DEFAULT_MODEL, KAI_RESPONSE_SCHEMA) : null);
  if (!provider) return fallback;
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => { controller.abort(); reject(new Error('provider_unavailable')); }, Math.min(8000, Math.max(1, options.timeoutMs ?? 8000)));
    });
    const result = await Promise.race([provider({ ...request, draft: extracted }, controller.signal), timeout]);
    return validatedProviderResponse(result, request, extracted);
  } catch (error) {
    return { ...fallback, error: error instanceof Error && ['invalid_response', 'invalid_draft', 'invalid_field', 'unsafe_response', 'unsafe_claim'].includes(error.message) ? 'invalid_response' : 'provider_unavailable' };
  } finally {
    if (timer) clearTimeout(timer);
    controller.abort();
  }
}

export function createKaiAssistantHandler(options: KaiAssistantOptions & { now?: () => number; rateLimit?: number } = {}): RequestHandler {
  const requests = new Map<string, { until: number; count: number }>();
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    let input: KaiAssistantRequest;
    try { input = parseKaiRequest(req.body); } catch { res.status(400).json({ error: 'invalid_request' }); return; }
    const now = (options.now || Date.now)();
    if (requests.size > 2000) for (const [key, entry] of requests) if (entry.until <= now) requests.delete(key);
    const key = req.ip || 'unknown';
    if (!requests.has(key) && requests.size >= 2000) requests.delete(requests.keys().next().value!);
    const entry = requests.get(key);
    const current = entry && entry.until > now ? entry : { until: now + 60000, count: 0 };
    current.count++;
    requests.set(key, current);
    if (current.count > (options.rateLimit ?? 25)) {
      res.setHeader('Retry-After', String(Math.ceil((current.until - now) / 1000)));
      const fallback = guidedResponse(input, extractKaiDraft(input));
      res.status(429).json({ ...fallback, error: 'rate_limited' });
      return;
    }
    try { res.json(await respondKai(input, options)); }
    catch { res.status(400).json({ error: 'invalid_request' }); }
  };
}
