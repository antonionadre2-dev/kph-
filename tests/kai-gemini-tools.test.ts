import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { FunctionCall, GenerateContentParameters } from '@google/genai';
import { emptyKaiDraft, type KaiAssistantRequest } from '../src/kai/types.ts';
import { getKaiFact } from '../src/kai/facts.ts';
import { calculateKaiQuote } from '../server/kaiPricing.ts';
import { dispatchKaiGeminiTool, runKaiGemini, KAI_GEMINI_MAX_TOOL_CALLS, type KaiGeminiGenerator } from '../server/kaiGemini.ts';

function request(): KaiAssistantRequest {
  const draft = { ...emptyKaiDraft('de'), service: 'end' as const, services: ['end' as const], fields: { rooms: '3.5', area: '85', bathrooms: '1', city: 'Zürich' } };
  return { message: 'Bitte helfen Sie mit der Planung.', messages: [], language: 'de', draft };
}
function planning(calls: FunctionCall[]) {
  return { text: undefined, functionCalls: calls, candidates: [{ content: { role: 'model', parts: calls.map(functionCall => ({ functionCall, thoughtSignature: 'provider-signature-fixture' })) } }] };
}
function final(input: KaiAssistantRequest) {
  return { text: JSON.stringify({ message: 'Welches Datum wünschen Sie?', draft: input.draft, missing: ['date'], suggestions: [], actions: ['continue'] }), functionCalls: undefined, candidates: [] };
}

test('Gemini price tool accepts no model draft, amount, rate, discount or service override', () => {
  const input = request();
  assert.deepEqual(dispatchKaiGeminiTool({ name: 'calculate_price', args: {} }, input), calculateKaiQuote(input.draft));
  for (const args of [{ amountCents: 1 }, { draft: { service: 'moving' } }, { discount: 90 }, { service: 'moving' }, { apiKey: 'fake' }, { url: 'https://example.invalid' }]) {
    assert.throws(() => dispatchKaiGeminiTool({ name: 'calculate_price', args }, input), /invalid_tool_arguments/);
  }
  assert.equal(calculateKaiQuote(input.draft)!.quote.amountCents, 69000);
});

test('Gemini fact tool is a strict enum in the server-owned service and language', () => {
  const input = request();
  assert.deepEqual(dispatchKaiGeminiTool({ name: 'get_service_fact', args: { topic: 'guarantee' } }, input), getKaiFact('guarantee', 'de', 'end'));
  for (const args of [{ topic: 'secret' }, { topic: 'insurance', language: 'en' }, { topic: 'duration', service: 'moving' }, {}]) {
    assert.throws(() => dispatchKaiGeminiTool({ name: 'get_service_fact', args }, input), /invalid_tool_arguments/);
  }
  for (const name of ['book', 'send_email', 'charge', 'fetch', 'apply_discount']) {
    assert.throws(() => dispatchKaiGeminiTool({ name, args: {} }, input), /unknown_tool/);
  }
});

test('Gemini protocol preserves provider content and uses one bounded read-only round followed by final schema JSON', async () => {
  const input = request(), controller = new AbortController();
  const schema = { type: 'object' };
  const turns: GenerateContentParameters[] = [];
  const toolResult = planning([{ id: 'price-1', name: 'calculate_price', args: {} }, { id: 'fact-1', name: 'get_service_fact', args: { topic: 'included' } }]);
  const generate: KaiGeminiGenerator = async params => { turns.push(structuredClone(params)); return turns.length === 1 ? toolResult : final(input); };
  let observedSignal: AbortSignal | undefined;
  const result = await runKaiGemini(input, controller.signal, {
    model: 'configured-model-fixture', responseSchema: schema,
    generate: params => { observedSignal = params.config?.abortSignal; return generate(params); },
  });
  assert.equal(observedSignal, controller.signal);
  assert.deepEqual(result, JSON.parse(final(input).text));
  assert.equal(turns.length, 2);
  assert.equal(turns[0].config?.toolConfig?.functionCallingConfig?.mode, 'ANY');
  assert.deepEqual(turns[0].config?.toolConfig?.functionCallingConfig?.allowedFunctionNames, ['calculate_price', 'get_service_fact']);
  assert.equal(turns[0].config?.responseMimeType, undefined);
  assert.equal(turns[1].config?.toolConfig?.functionCallingConfig?.mode, 'NONE');
  assert.equal(turns[1].config?.responseMimeType, 'application/json');
  assert.deepEqual(turns[1].config?.responseJsonSchema, schema);
  const contents = turns[1].contents as { role: string; parts: any[] }[];
  assert.deepEqual(contents.at(-2), toolResult.candidates[0].content);
  assert.deepEqual(contents.at(-1)!.parts[0].functionResponse, { name: 'calculate_price', id: 'price-1', response: calculateKaiQuote(input.draft) });
  assert.deepEqual(contents.at(-1)!.parts[1].functionResponse.response, getKaiFact('included', 'de', 'end'));
});

test('unknown, excessive or missing planning tools fail closed without another model request', async () => {
  for (const calls of [[{ name: 'book', args: {} }], Array.from({ length: KAI_GEMINI_MAX_TOOL_CALLS + 1 }, () => ({ name: 'calculate_price', args: {} })), []]) {
    let turns = 0;
    await assert.rejects(runKaiGemini(request(), new AbortController().signal, {
      model: 'fixture', responseSchema: {}, generate: async () => { turns++; return planning(calls); },
    }), /unknown_tool|invalid_response/);
    assert.equal(turns, 1);
  }
});

test('abort is checked before network and between planning and final, never reflecting abort secrets', async () => {
  const before = new AbortController(); before.abort('do-not-leak-fixture');
  let turns = 0;
  const options = { model: 'fixture', responseSchema: {}, generate: async () => { turns++; return planning([{ name: 'calculate_price', args: {} }]); } };
  await assert.rejects(runKaiGemini(request(), before.signal, options), /^Error: provider_unavailable$/);
  assert.equal(turns, 0);
  const between = new AbortController();
  await assert.rejects(runKaiGemini(request(), between.signal, { ...options, generate: async () => { turns++; between.abort(); return planning([{ name: 'calculate_price', args: {} }]); } }), /provider_unavailable/);
  assert.equal(turns, 1);
});

test('the structured final response cannot start another tool round', async () => {
  let turns = 0;
  await assert.rejects(runKaiGemini(request(), new AbortController().signal, {
    model: 'fixture', responseSchema: {}, generate: async () => { turns++; return planning([{ name: 'calculate_price', args: {} }]); },
  }), /invalid_response/);
  assert.equal(turns, 2);
});
