import test from 'node:test';
import assert from 'node:assert/strict';
import {getHomeFaqs,getKaiFact,getKaiFaqs} from '../src/kai/facts.ts';
import {publicPolicyContent} from '../src/kai/policyContent.ts';
import {getRegionalPages,getRegionalHubCopy} from '../src/seo/regional-content.ts';
import {getEndOfTenancyMetadata} from '../src/seo/end-of-tenancy-metadata.ts';
import {servicesText} from '../components/services/servicesTranslations.ts';
import {respondKai,parseKaiRequest} from '../server/kaiAssistant.ts';
import {emptyKaiDraft} from '../src/kai/types.ts';
import {kaiPolicySummary} from '../src/kai/policy-summaries.ts';
const languages=['de','en','es','pt','it','fr'] as const;
const oldClaims=/1\s*[–-]\s*4\s*(?:Zimmer|rooms|habitaciones|divisões|locali|pièces)|1 (?:a|à) 4 (?:habitaciones|divisões|locali|pièces)|erfahrenes Team|experienced team|equipo (?:con experiencia|experimentado)|equipa experiente|team esperto|équipe expérimentée|fünf Leistungen|five services|cinco servicios|cinco serviços|cinque servizi|cinq prestations/i;

test('current regional articles offer all six services with truthful owner copy',()=>{
  for(const language of languages){
    const pages=getRegionalPages(language);
    assert.equal(pages.length,3);
    for(const page of pages){
      assert.equal(page.services.length,6,`${language}/${page.id}`);
      assert.deepEqual(new Set(page.services.map(s=>s.id)),new Set(['windows','moveout','regular','deep','construction','moving']));
      assert.equal(page.services.find(s=>s.id==='construction')?.title,servicesText(language,'Baureinigung'));
      assert.doesNotMatch(JSON.stringify(page),oldClaims,`${language}/${page.id}`);
    }
    assert.doesNotMatch(JSON.stringify(getRegionalHubCopy(language)),oldClaims,language);
  }
});

test('five Home FAQs use approved brief policy answers and legal anchors while complete service guarantees remain available',()=>{
  for(const language of languages){
    const policy=publicPolicyContent(language),faqs=getHomeFaqs(language);
    assert.equal(faqs.length,5);
    const insurance=getKaiFaqs(language,['insurance'])[0];
    assert.ok(!faqs.some(faq=>faq.question===insurance.question),language);
    for(const [topic,clause,answer] of [['guarantee',9,policy.guaranteeScope],['payment',4,kaiPolicySummary('payment',language)],['cancellation',7,kaiPolicySummary('cancellation',language)]] as const){
      const expected=getKaiFaqs(language,[topic])[0];
      assert.equal(expected.answer,topic==='guarantee'?policy.guarantee:answer);
      assert.equal(expected.termsSection,clause);
      assert.ok(faqs.some(faq=>faq.question===expected.question&&faq.answer===answer&&faq.termsSection===clause),`${language}/${topic}`);
    }
    assert.equal(getKaiFact('preparation',language).answer,policy.preparation);
    assert.equal(getKaiFaqs(language,['preparation'])[0].termsSection,6);
    for(const city of ['zuerich','schaffhausen','winterthur']){
      const metadata=getEndOfTenancyMetadata(city,language)!;
      assert.ok(metadata.faqs.some(faq=>faq.answer===policy.guarantee&&faq.termsSection===9));
    }
  }
});

test('insurance answers offer contact without a policy claim in all languages',async()=>{
  const questions=['Welche Versicherung gilt?','What insurance applies?','¿Qué seguro tienen?','Que seguro têm?','Quale assicurazione avete?','Quelle assurance avez-vous ?'];
  for(const [index,language] of languages.entries()){
    const result=await respondKai({message:questions[index],messages:[],draft:emptyKaiDraft(language),language},{apiKey:''});
    assert.equal(result.message,getKaiFact('insurance',language).answer,language);
    assert.equal(result.contactCard,true,language);
    assert.ok(result.actions.includes('contact'));
    assert.doesNotMatch(result.message,/polic[ye]|póliza|apólice|Police|Versicherungsnachweis|10.?000.?000|10 million|CHF 10M/i);
  }
});

test('complete guarantee replies remain valid conversation history for the next message',async()=>{
  for(const language of languages){
    const message=getKaiFaqs(language,['guarantee'])[0].question;
    const response=await respondKai({message,messages:[],draft:emptyKaiDraft(language),language},{apiKey:''});
    assert.ok(response.message.includes(publicPolicyContent(language).guarantee),language);
    assert.doesNotThrow(()=>parseKaiRequest({message:'8203',messages:[{role:'assistant',text:response.message}],draft:response.draft,language}));
  }
});
