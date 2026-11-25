import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { getTermsTranslation } from '../components/legal/terms';
import { getGDPRTranslation } from '../components/legal/privacy';
import { getTermsTranslation as compatibleTerms, getGDPRTranslation as compatiblePrivacy } from '../components/docTranslations';
import { BOOKING_TERMS_VERSION } from '../src/booking/terms';

// Original payment, cancellation and guarantee clauses were explicitly required to remain unchanged.
const originalHashes = {
  de: ['366991c89bc71ad9127337903f6d4cb8377c68538fa43334121def3855d96c6b','f6d6a658174ad50efb67527a4cf80c8dc6d3ef1c8bc43277542ec14e8483cb0f','3ec8596f2ca7da6e72048de181c146f1d9cf0d740d45b99e717e882c5e9d8c5c'],
  en: ['80bdff96d14b28ffbab7c34bc3d03d3c74e3af7b0095976f83278917df1e762b','1a5956128087b4210d95fc574ca571ed6c5b032fc4e6066237de345d271c9644','7e1f9e8314001cebe6846d098ab8920300888bbf78a07267f491015fa884ba9f'],
  es: ['391894f99ebfdac20d48aec569ba220fa314bbebf9f3ed4567392dda31b46f88','9f83ef60f800cd2f0642654091522fdd5fa433d1ad3f56aa4d3c325e4d0a2474','f8c93a2fc9d296e7773a96927b0d45a3fa4f313d07550ec6ece5c91942bdb33d'],
  pt: ['216d2a9ef4bac3457ab620247ce779911725f6ce5341cc4d40e0e724c7d99fc3','957c9877546375a53df024b0dde4a17e98ac275b02a5f258200b572be07e5a55','b3d1c727e8a51b6022793d0011f1a6e22e8a011eba26313ec31bda346af21f85'],
  it: ['663b5eacb0228b808b043b313e0c0c29e587ed2ac5c107e0ff03c88dd14eed05','85e84211399cf3e31f41da77f5ae7679b01930726eaf45407561094355dd3db1','a00cc014ff517475bdfa22fc4dc5792e8ea329e63ccbfd0cbee065931197f2ea'],
  fr: ['8af67105c5298857c03b016589eea412126a8b2d4017e1309fcac11b35e49275','74f9162f52ac85ef9dbd7b6a4f852fd4e3d68eeeab5bd2084a4da68bdc5f011f','259dda78476843166030984068d909b07a5967831902b35f0f162194a8f2e04d'],
};

test('consumer terms remove retired services and unsupported fees while preserving approved payment, cancellation and handover clauses', () => {
  for (const language of Object.keys(originalHashes) as (keyof typeof originalHashes)[]) {
    const terms=getTermsTranslation(language),text=JSON.stringify(terms);
    assert.equal(terms.sections.length,17);
    terms.sections.forEach((section,index)=>{
      assert.ok(section.title.startsWith((index+1)+'.'),language+section.title);
      assert.ok(section.content.trim());
    });
    [4,5,7].forEach((index,hashIndex)=>assert.equal(createHash('sha256').update(terms.sections[index].content).digest('hex'),originalHashes[language][hashIndex],language+': unchanged section '+(index+1)));
    assert.doesNotMatch(text,/Facility|Properties and|B2B|\bSLAs?\b|Precision Media|Car Detailing|Gardening|Gartenpflege|jardinería|giardinaggio|Pest Control|Schädlings|nuisibles|disinfestazione|gestão de propriedades|gestión de propiedades|90[.,]00|5[,.']000/i);
    assert.match(terms.sections[1].content,/15%/);
    assert.match(terms.sections[7].content,/24h/);
    assert.match(terms.sections[7].content,/72h/);
    assert.equal(compatibleTerms(language),terms);
  }
  // The owner's latest instruction confirms a fixed price for the declared scope.
  for (const [language, phrase] of Object.entries({de:'Festpreis',en:'fixed price',es:'precio cerrado',pt:'preço fixo',it:'prezzo fisso',fr:'prix fixe'})) {
    const terms=getTermsTranslation(language);
    assert.ok(terms.sections[1].content.includes(phrase));
    assert.ok(terms.lastUpdated.includes(BOOKING_TERMS_VERSION));
    assert.doesNotMatch(terms.sections[1].content,/unverbindlich|preliminary|orientativ/i);
  }
  assert.match(getTermsTranslation('de').sections[3].content,/im Preis des Rechners enthalten/);
  assert.doesNotMatch(JSON.stringify(getTermsTranslation('de')),/ß/);
});

test('privacy describes current infrastructure, separated browser storage and the controller link in six languages', () => {
  for (const language of Object.keys(originalHashes)) {
    const privacy=getGDPRTranslation(language),text=JSON.stringify(privacy);
    assert.match(privacy.introP1,/Kraken PFM/);
    assert.match(privacy.introP1,/09:00–19:00/);
    assert.ok(privacy.controllerLink.trim());
    for(const provider of ['Vercel','Firebase/Firestore','Payrexx','Resend','Outlook'])assert.ok(text.includes(provider),language+provider);
    assert.match(privacy.browserStorageText,/24/);
    assert.ok(privacy.browserStorageTitle.trim());
    assert.doesNotMatch(text,/Properties and|Facility|Immobilien|B2B|Precision Media|10[.,]000[.,]000/);
    assert.equal(compatiblePrivacy(language),privacy);
  }
  assert.equal(getGDPRTranslation('de-CH'),getGDPRTranslation('de'));
  assert.equal(getTermsTranslation('__proto__'),getTermsTranslation('de'));
});
