import test from 'node:test';
import assert from 'node:assert/strict';
import { businessHoursLabel, businessHoursSentence, businessHoursTimeZoneLabel } from '../src/config/business-hours.mjs';
import { respondKai } from '../server/kaiAssistant.ts';
import { emptyKaiDraft } from '../src/kai/types.ts';
import { getKaiFact } from '../src/kai/facts.ts';
import { catalogs, brandForLanguage, renderEmail } from '../integrations/email-collection/index.mjs';
import { renderRecoveryEmail } from '../integrations/recovery/emails.mjs';
import { demoData } from '../reference/kraken-emails/src/demo-data.mjs';

const questions = {
  de: ['Welche Öffnungszeiten habt ihr?', 'Wann seid ihr erreichbar?', 'Habt ihr geöffnet?'],
  en: ['What are your opening hours?', 'What time are you open?', 'Are you open now?'],
  es: ['¿Cuál es su horario de atención?', '¿Horario?', '¿Estáis abiertos?'],
  pt: ['Qual é o horário de atendimento?', 'Qual é o seu horário?', 'Estão abertos?'],
  it: ['Quali sono gli orari di apertura?', 'Qual è il vostro orario?', 'Siete aperti?'],
  fr: ['Quels sont vos horaires d’ouverture ?', 'À quelle heure ouvrez-vous ?', 'Êtes-vous ouverts?'],
};
const languages = ['de', 'en', 'es', 'pt', 'it', 'fr'] as const;

test('Kai answers opening-hour questions from the shared schedule in all six languages without consulting AI', async () => {
  let providerCalls = 0;
  for (const language of languages) {
    for (const message of questions[language]) {
      const draft = emptyKaiDraft(language);
      const response = await respondKai({ message, messages: [], draft, language }, {
        provider: async () => { providerCalls++; throw new Error('Opening hours must use the approved schedule'); },
      });
      assert.equal(response.message, businessHoursSentence(language));
      assert.equal(response.mode, 'guided');
      assert.equal(response.contactCard, true);
      assert.deepEqual(response.draft.fields, draft.fields);
      assert.equal(response.quote, undefined);
    }
  }
  assert.equal(providerCalls, 0);
});

test('appointment availability and insurance keep their personal-confirmation answers', async () => {
  for (const [message, topic] of [['¿Está disponible mi fecha preferida?', 'availability'], ['¿Qué seguro se aplica?', 'insurance']] as const) {
    const response = await respondKai({ message, messages: [], draft: emptyKaiDraft('es'), language: 'es' }, { apiKey: '' });
    assert.ok(response.message.startsWith(getKaiFact(topic, 'es').answer));
    assert.equal(response.contactCard, true);
    assert.notEqual(response.message, businessHoursSentence('es'));
  }
});

test('availability answers retain personal confirmation before the shared contact hours in every language', async () => {
  const availabilityQuestions = {
    de: 'Ist mein Wunschtermin verfügbar?', en: 'Is my preferred date available?',
    es: '¿Está disponible mi fecha preferida?', pt: 'A data pretendida está disponível?',
    it: 'La data desiderata è disponibile?', fr: 'La date souhaitée est-elle disponible ?',
  };
  for (const language of languages) {
    const draft = emptyKaiDraft(language);
    const response = await respondKai({ message: availabilityQuestions[language], messages: [], draft, language }, { apiKey: '' });
    assert.ok(response.message.startsWith(`${getKaiFact('availability', language).answer} ${businessHoursSentence(language)}`));
    assert.equal(response.contactCard, true);
    assert.equal(response.quote, undefined);
    assert.equal(response.draft.fields.date, undefined);
  }
});

test('active support messages render the shared full sentence and localized footer without unresolved tokens', () => {
  for (const language of languages) {
    const email = renderEmail('support_received', demoData('support_received', language, 'regular'), {
      catalogs, mode: 'preview', brand: brandForLanguage(language), assetBaseUrl: 'https://krakenpfm.ch/kraken-emails/assets',
    });
    assert.ok(email.text.includes(businessHoursSentence(language)));
    assert.ok(email.text.includes(businessHoursLabel(language)));
    assert.ok(email.text.includes(businessHoursTimeZoneLabel(language)));
    assert.doesNotMatch(email.text + email.html, /\{\{businessHoursSentence\}\}/);
  }
});

test('the existing recovery-email renderer uses the same localized hours and timezone', () => {
  for (const language of languages) {
    const email = renderRecoveryEmail({
      draft: { language, stage: 'quote', selection: { service: 'regular' }, quote: { totalCents: 10_000, priceType: 'estimate' } },
      kind: 'saved', publicBaseUrl: 'https://krakenpfm.ch',
      resumeUrl: 'https://krakenpfm.ch/quote?draft=synthetic#resume=synthetic',
      unsubscribeUrl: 'https://krakenpfm.ch/recovery/unsubscribe?draft=synthetic#token=synthetic',
    });
    assert.ok(email.text.includes(businessHoursLabel(language)));
    assert.ok(email.text.includes(businessHoursTimeZoneLabel(language)));
    assert.ok(email.html.includes(businessHoursLabel(language)));
  }
});
