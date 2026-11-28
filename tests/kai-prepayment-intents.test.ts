import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { respondKai } from '../server/kaiAssistant.ts';
import { emptyKaiDraft } from '../src/kai/types.ts';
import { getKaiFact } from '../src/kai/facts.ts';
import { kaiServiceName } from '../server/kaiKnowledge.ts';
import { kaiServiceLabel } from '../src/kai/copy.ts';
import { serviceName } from '../src/booking/serviceNames.ts';
import { publicPolicyContent } from '../src/kai/policyContent.ts';

const languages = ['de', 'en', 'es', 'pt', 'it', 'fr'] as const;
const questions = {
  payment: ['Muss ich im Voraus bezahlen?', 'Do I need to pay in advance?', '¿Tengo que pagar por adelantado?', 'Tenho de pagar antecipadamente?', 'Devo pagare in anticipo?', 'Dois-je payer à l’avance ?'],
  cancellation: ['Kann ich stornieren und bekomme ich mein Geld zurück?', 'Can I cancel and get a refund?', '¿Puedo cancelar y me devuelven el dinero?', 'Posso cancelar e receber o dinheiro de volta?', 'Posso annullare e ricevere un rimborso?', 'Puis-je annuler et obtenir un remboursement ?'],
  insurance: ['Seid ihr versichert?', 'Are you insured?', '¿Estáis asegurados?', 'Têm seguro?', 'Siete assicurati?', 'Êtes-vous assurés ?'],
  complaint: ['Ich bin mit der Reinigung nicht zufrieden.', 'I am not satisfied with the cleaning.', 'No estoy satisfecho con la limpieza.', 'Não estou satisfeito com a limpeza.', 'Non sono soddisfatto della pulizia.', 'Je ne suis pas satisfait du nettoyage.'],
};

test('prepayment, cancellation and insurance questions use authoritative answers in all six languages', async () => {
  let providerCalls = 0;
  for (const [index, language] of languages.entries()) for (const topic of ['payment', 'cancellation', 'insurance'] as const) {
    const result = await respondKai({ message: questions[topic][index], messages: [], draft: emptyKaiDraft(language), language }, { apiKey: '', provider: async () => { providerCalls++; throw new Error('Policy questions must bypass the model'); } });
    assert.equal(result.message, getKaiFact(topic, language).answer, language + ': ' + topic);
    assert.equal(result.contactCard === true, topic === 'insurance');
    assert.deepEqual(result.suggestions, []);
    assert.equal(result.mode, 'guided');
    assert.doesNotMatch(result.message, /15\s?%|Anzahlung|Restbetrag/);
    if (topic !== 'insurance') assert.match(result.message, /48/);
  }
  assert.equal(providerCalls, 0);
});

test('dissatisfaction about completed cleaning still receives personal complaint support', async () => {
  for (const [index, language] of languages.entries()) {
    const result = await respondKai({ message: questions.complaint[index], messages: [], draft: emptyKaiDraft(language), language }, { apiKey: '' });
    assert.equal(result.contactCard, true);
    assert.deepEqual(result.actions, ['contact']);
    assert.notEqual(result.message, getKaiFact('cancellation', language).answer);
    assert.equal(result.quote, undefined);
  }
});

test('a calculated end-cleaning price occupies its own line with exactly one guarantee statement', async () => {
  for (const [language, message] of [['de', 'Umzugsreinigung für 3.5 Zimmer und 85 m² mit 1 Bad'], ['es', 'Limpieza de fin de alquiler de 3.5 habitaciones y 85 m² con 1 baño']] as const) {
    const draft = emptyKaiDraft(language);
    draft.service = 'end'; draft.services = ['end']; draft.fields = { rooms: '3.5', area: '85', bathrooms: '1' };
    const result = await respondKai({ message, messages: [], draft, language }, { apiKey: '' });
    assert.equal(result.quote?.amountCents, 69000);
    assert.ok(result.message.split('\n').some(line => line.trim() === 'CHF690' || line.trim() === 'CHF 690'));
    const guarantee = publicPolicyContent(language).guaranteeScope.split(/(?<=\.)\s+/)[0];
    assert.equal(result.message.split(guarantee).length - 1, 1);
  }
  const ui = readFileSync(new URL('../components/KaiAssistant.tsx', import.meta.url), 'utf8');
  assert.match(ui, /publicHref\('\/terms#agb-9', chatLocale\)/);
});

test('Kai service labels match the canonical menu names in every language', () => {
  for (const language of languages) for (const service of ['windows', 'end', 'regular', 'deep', 'moving'] as const) {
    assert.equal(kaiServiceName(language, service), serviceName(language, service));
    assert.equal(kaiServiceLabel(language, service), serviceName(language, service));
  }
});
