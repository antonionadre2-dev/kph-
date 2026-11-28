import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { getCityServiceContent, VERIFIED_CITY_CONTENT } from '../src/seo/city-content.ts';
import { getContactCopy } from '../src/contact/contact-copy.ts';
import { getPageSeo } from '../src/seo/metadata.ts';
import { getRouteDisposition } from '../src/routing/route-policy.ts';
import { publicHref } from '../src/routing/site-paths.ts';
import { parsePath } from '../src/routing/router.ts';
import { businessHoursLabel } from '../src/config/business-hours.mjs';

const languages = ['de', 'en', 'es', 'pt', 'it', 'fr'];
const services = ['window-cleaning', 'daily-cleaning', 'deep-cleaning', 'end-of-tenancy', 'moving-furniture'];
const bundle = await build({
  stdin: { contents: `import React from 'react';import{renderToStaticMarkup}from'react-dom/server';
    import{I18nProvider}from'./i18n.ts';import ApprovedHome from'./components/home/ApprovedHome.tsx';
    import MovingServicesPage from'./components/home/MovingServicesPage.tsx';
    import{LocalSeoContent}from'./components/LocalSeoContent.tsx';
    import{resolveLocalSeoRoute}from'./src/seo/local-content.ts';
    export const renderHome=language=>renderToStaticMarkup(<I18nProvider initialLanguage={language}><ApprovedHome onNavigate={()=>{}}/></I18nProvider>);
    export const renderMoving=language=>renderToStaticMarkup(<I18nProvider initialLanguage={language}><MovingServicesPage onNavigate={()=>{}}/></I18nProvider>);
    export const renderLocal=(city,service,language)=>renderToStaticMarkup(<LocalSeoContent route={resolveLocalSeoRoute('/services/'+city+'/'+service)} language={language}/>);`, resolveDir: process.cwd(), loader: 'tsx' },
  bundle: true, platform: 'node', format: 'cjs', packages: 'external', write: false, loader: { '.css': 'empty' }, logLevel: 'warning',
});
const module = { exports: {} };
new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);
const { renderHome, renderMoving, renderLocal } = module.exports;
const text = html => html.replace(/<[^>]+>/g, ' ').replaceAll('&amp;', '&').replaceAll('&#x27;', "'");

test('Home keeps the scene and three steps but moves the complete Transit experience to a native localized route', () => {
  for (const language of languages) {
    const home = renderHome(language), moving = renderMoving(language);
    assert.ok(/class="[^"]*\bscene-room\b/.test(home), language + ': home scene remains');
    assert.doesNotMatch(home, /id="umzug"|id="cargoFrame"|id="cargoMeasurements"|id="vanInside"/);
    assert.match(home, /class="why-process-steps"/);
    const faqs = home.slice(home.indexOf('<section class="faq-section'));
    assert.equal((faqs.match(/<details\b/g) || []).length, 5);
    assert.ok(home.indexOf('id="hero-title"') < home.indexOf('id="home-prices-title"'));
    assert.ok(home.indexOf('id="home-prices-title"') < home.indexOf('id="warum-kraken"'));
    assert.ok(home.indexOf('id="warum-kraken"') < home.indexOf('class="faq-section'));
    assert.ok(home.includes('href="' + publicHref('/kleine-umzuege', language) + '"'));
    assert.doesNotMatch(home, /href="[^\"]*\/#umzug"/);
    for (const id of ['umzug', 'vanOverview', 'vanInside', 'cargoFrame', 'cargoMeasurements', 'cargoPlay']) assert.ok(moving.includes('id="' + id + '"'), `${language}: ${id}`);
    assert.ok(moving.includes('href="' + publicHref('/quote?service=moving', language) + '"'));
    assert.equal((moving.match(/<h1\b/g) || []).length, 1);
    const route = publicHref('/kleine-umzuege', language);
    assert.equal(getRouteDisposition(route).status, 200);
    assert.equal(parsePath(route).page, 'moving-services');
    assert.equal(getPageSeo(route).indexable, true);
    assert.doesNotMatch(home + moving, /AggregateRating|ratingValue/);
  }
  assert.match(renderHome('de'), /Schaffhausen, Winterthur und Zürich/);
  assert.doesNotMatch(renderHome('de'), /Eine Szene\. Vier Jahreszeiten\./);
  const movingSource = readFileSync(new URL('../components/home/MovingServicesPage.tsx', import.meta.url), 'utf8');
  assert.match(movingSource, /useEffect\(\(\) => root\.current \? initTransit/);
});

test('all 15 city service pages render their cited local facts in all six languages before JavaScript', () => {
  for (const [cityId, city] of Object.entries(VERIFIED_CITY_CONTENT)) {
    assert.ok(city.pendingOwner.length >= 3);
    for (const source of city.sources) {
      const url = new URL(source.url);
      assert.equal(url.protocol, 'https:');
      assert.ok(['data.stadt-zuerich.ch', 'www.stadt-zuerich.ch', 'stadt.winterthur.ch', 'www.stadt-schaffhausen.ch'].includes(url.hostname));
      assert.equal(source.verifiedAt, '2026-11-28');
    }
    for (const service of services) for (const language of languages) {
      const content = getCityServiceContent(cityId, service, language);
      assert.ok(content?.facts.length);
      const html = renderLocal(cityId === 'zuerich' ? 'zurich' : cityId, service, language);
      assert.ok(html.includes(`data-verified-city="${cityId}"`), `${cityId}/${service}/${language}`);
      assert.ok(text(html).includes(content.preparation));
      for (const fact of content.facts) {
        assert.ok(text(html).includes(fact.text));
        assert.ok(html.includes(`href="${fact.source.url}"`));
        assert.ok(fact.source.label);
        if (language !== 'de') assert.notEqual(fact.text, getCityServiceContent(cityId, service, 'de').facts.find(item => item.id === fact.id).text);
      }
    }
  }
  for (const service of services) for (const language of languages) {
    const copies = Object.keys(VERIFIED_CITY_CONTENT).map(city => getCityServiceContent(city, service, language).facts.map(item => item.text).join(' '));
    assert.equal(new Set(copies).size, 3);
  }
  assert.equal(getCityServiceContent('__proto__', 'moving-furniture', 'de'), null);
  assert.equal(getCityServiceContent('zuerich', '__proto__', 'de'), null);
  assert.equal(getCityServiceContent('unverified-town', 'moving-furniture', 'de'), null);
});

test('price landings have distinct intent and contact descriptions retain shared hours within 155 characters', () => {
  assert.equal(getPageSeo('/umzugsreinigung/zuerich').title, 'Umzugsreinigung Zürich Preise: Festpreise nach Zimmern | Kraken');
  assert.equal(getPageSeo('/umzugsreinigung/zuerich').h1, 'Was kostet eine Umzugsreinigung in Zürich?');
  for (const language of languages) {
    for (const city of ['zuerich', 'winterthur', 'schaffhausen']) {
      const seo = getPageSeo(publicHref('/umzugsreinigung/' + city, language));
      assert.notEqual(seo.title, getPageSeo(publicHref('/', language)).title);
      assert.notEqual(seo.h1, getPageSeo(publicHref('/', language)).h1);
    }
    const description = getContactCopy(language).meta.description;
    assert.ok(description.length <= 155 && description.length > 90, language);
    assert.ok(description.includes(businessHoursLabel(language)), language);
  }
});

test('legal aliases redirect once in all locales, and retired commercial quotes return an actual 404', () => {
  for (const prefix of ['', '/de', '/en', '/es', '/pt', '/it', '/fr']) {
    const language = prefix.slice(1) || 'de';
    for (const [alias, current] of [['/agb', '/terms'], ['/datenschutz', '/gdpr']]) {
      const target = publicHref(current, language);
      assert.deepEqual(getRouteDisposition(prefix + alias), { status: 301, location: target });
      assert.equal(getRouteDisposition(target).status, 200);
    }
    assert.equal(getRouteDisposition(prefix + '/commercial-quote').status, 404);
    assert.equal(parsePath(prefix + '/commercial-quote').page, '404');
  }
});
