import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { getPublicPriceOffers } from '../src/booking/publicPricing.ts';
import { publicPriceText } from '../src/booking/publicPricingCopy.ts';
import { homeText } from '../components/home/homeTranslations.ts';
import { publicHref } from '../src/routing/site-paths.ts';
import { getKaiFact } from '../src/kai/facts.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bundle = await build({
  stdin: { contents: `
    import React from 'react';import{renderToStaticMarkup}from'react-dom/server';
    import{I18nProvider}from'./i18n.ts';
    import ApprovedHome from'./components/home/ApprovedHome.tsx';
    import ApprovedHeader from'./components/home/ApprovedHeader.tsx';
    import{FooterContent}from'./components/Footer.tsx';
    import CustomerReviews from'./components/home/CustomerReviews.tsx';
    export const render=language=>renderToStaticMarkup(<I18nProvider initialLanguage={language}><ApprovedHome onNavigate={()=>{}}/></I18nProvider>);
    export const renderHeader=language=>renderToStaticMarkup(<I18nProvider initialLanguage={language}><ApprovedHeader onNavigate={()=>{}}/></I18nProvider>);
    export const renderFooter=language=>renderToStaticMarkup(<FooterContent language={language}/>);
    export const renderReviews=(language,reviews)=>renderToStaticMarkup(<CustomerReviews language={language} reviews={reviews}/>);
  `, resolveDir: root, loader: 'tsx' },
  bundle: true, platform: 'node', format: 'cjs', packages: 'external', write: false,
  loader: { '.css': 'empty' }, logLevel: 'warning',
});
const module = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);
const { render, renderHeader, renderFooter, renderReviews } = module.exports;
const languages = ['de', 'en', 'es', 'pt', 'it', 'fr'];
const decode = value => value.replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'");
const escapeMarkup = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#x27;');

test('the first homepage action sells the calculated move-out package with the real service and canonical locale', () => {
  const offer = getPublicPriceOffers().find(item=>item.service==='end');
  assert.ok(offer.minimumCents > 0 && offer.quote.appliedTier);
  for (const language of languages) {
    const html=render(language),main=html.slice(html.indexOf('<main'));
    assert.match(main, /<h1 id="hero-title">/);
    assert.ok(main.includes('<h1 id="hero-title">'+homeText(language,'Umzugsreinigung Zürich')+'</h1>'));
    assert.ok(main.includes(homeText(language,'Ihr Zuhause in guten Armen.')));
    const amount=new Intl.NumberFormat(language==='de'?'de-CH':language,{style:'currency',currency:offer.quote.currency,currencyDisplay:'code',minimumFractionDigits:0,maximumFractionDigits:0}).format(offer.minimumCents/100);
    assert.ok(main.includes(publicPriceText(language,'from',{price:amount})));
    const action=main.match(/<a[^>]*class="[^"]*hero-primary-action[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
    assert.ok(action);
    assert.equal(decode(action[1]),publicHref('/quote?service=end',language));
    assert.ok(action[2].includes(homeText(language,'Umzugsreinigung berechnen')));
    assert.ok(main.indexOf(action[0])<main.indexOf('id="sceneOpen"'));
    assert.ok(main.indexOf(action[0])<main.indexOf('class="scene-hotspot'));
    assert.ok(main.includes(homeText(language,'Abnahmegarantie beim Pauschalpaket')));
    assert.ok(main.includes(homeText(language,'Für den vereinbarten Reinigungsumfang gemäss Auftragsbestätigung und AGB. Stundenreinigung ohne Abnahmegarantie.')));
    assert.ok(main.includes('href="'+publicHref('/terms',language)+'"'));
    // The guarantee/insurance marketing blocks cannot make blanket 100% claims.
    // The shared FAQ separately reproduces the legitimate existing cancellation charge of 100%.
    const marketing=main.slice(0,main.indexOf('<section class="faq-section'));
    assert.ok(marketing.length>0);
    assert.doesNotMatch(marketing.replace(/<style\b[^>]*>[\s\S]*?<\/style>/g,'').replace(/<[^>]+>/g,''), /100\s*%/);
    assert.ok(main.includes(escapeMarkup(getKaiFact('cancellation',language).answer)));
    assert.ok(main.includes(escapeMarkup(getKaiFact('guarantee',language).answer)));
    assert.doesNotMatch(main, /AggregateRating|itemtype="[^"]*Review/);
  }
});

test('header, home and footer advertise the current business and link to the Zurich landing in every language', () => {
  for (const language of languages) {
    const header=renderHeader(language),home=render(language),footer=renderFooter(language);
    assert.ok(header.includes(homeText(language,'Reinigung & kleine Umzüge').replace(/&/g,'&amp;')));
    assert.doesNotMatch(header, /Properties|Facilities|commercial|sustainability/);
    const strip=header.match(/<nav class="header-contact-bar"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
    assert.ok(strip?.includes('href="tel:+41774505705"'));
    assert.ok(strip?.includes('href="https://wa.me/41774505705"'));
    assert.ok(strip?.includes('href="'+publicHref('/quote?service=end',language).replace(/&/g,'&amp;')+'"'));
    assert.ok(strip?.includes(homeText(language,'Offerte berechnen')));
    for (const html of [home,footer]) assert.ok(html.includes('href="'+publicHref('/umzugsreinigung/zuerich',language)+'"'));
    // Composite layers repeat one labelled illustration; they are intentionally decorative.
    for (const [tag] of home.matchAll(/<img\b[^>]*>/g)) {
      assert.match(tag,/alt="[^"]*"/);
      if (tag.includes('alt=""')) assert.match(tag,/aria-hidden="true"/);
    }
    assert.doesNotMatch(home,/ß/);
  }
});

test('reviews remain absent until original sources and a verification date have been supplied', () => {
  assert.equal(renderReviews('de'), '');
  const invalid={author:'Test fixture',text:'<test-only>',sourceLabel:'Fixture source',sourceUrl:'javascript:alert(1)',verifiedAt:'2026-01-01'};
  assert.equal(renderReviews('de',[invalid]),'');
  assert.equal(renderReviews('de',[{...invalid,sourceUrl:'https://example.com/review',verifiedAt:''}]),'');
  const html=renderReviews('es',[{...invalid,sourceUrl:'https://example.com/review'}]);
  assert.ok(html.includes('&lt;test-only&gt;'));
  assert.ok(html.includes('href="https://example.com/review"'));
  assert.ok(html.includes(homeText('es','Originalbewertung lesen')));
  assert.doesNotMatch(html,/AggregateRating|ratingValue|<script/);
});
