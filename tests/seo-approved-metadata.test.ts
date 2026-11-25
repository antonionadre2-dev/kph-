import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { publicHref } from '../src/routing/site-paths.ts';
import { getApprovedPageMetadata } from '../src/seo/local-metadata.ts';
import { getMetadataForPath } from '../seoConfig.ts';
import { getPageSeo, SEO_LANGUAGES } from '../src/seo/metadata.ts';
import { getLocalSeoDescriptor } from '../src/seo/local-content.ts';
import { injectPageSeo } from '../src/seo/html.ts';

const source = (file: string) => JSON.parse(readFileSync(new URL(`../reference/local-seo-footer/content/${file}`, import.meta.url), 'utf8')).pages;
const approvedPages = [...source('seo.de.json'), ...source('seo-local-routes.de.json')];

test('the nine approved German pages preserve supplied metadata and resolve production images', () => {
  assert.equal(approvedPages.length, 9);
  for (const approved of approvedPages) {
    const meta = getPageSeo(approved.path);
    const revised = ['/', '/kontakt'].includes(approved.path) ? getApprovedPageMetadata(approved.path,'de') : null;
    assert.equal(meta.title, revised?.title || approved.title, approved.path);
    assert.equal(meta.description, revised?.description || approved.description, approved.path);
    const imagePath = approved.productionImage || approved.image.replace('/assets/', '/home-approved/assets/');
    assert.equal(meta.ogImage, 'https://krakenpfm.ch' + imagePath);
    assert.equal(meta.ogImageType, 'image/webp');
    assert.ok(Number(meta.ogImageWidth) > 0 && Number(meta.ogImageHeight) > 0);
    assert.ok(existsSync(new URL('../public' + imagePath, import.meta.url)), imagePath);
    const direct = getMetadataForPath(approved.path, 'de-CH');
    assert.equal(direct.title, meta.title);
    assert.equal(direct.description, meta.description);
    assert.equal(direct.ogImage, meta.ogImage);
  }
});

test('all six versions publish translated copy and matching initial HTML without restricting search', () => {
  for (const approved of approvedPages) {
    const titles = new Set<string>();
    const descriptions = new Set<string>();
    for (const language of SEO_LANGUAGES) {
      const canonical = 'https://krakenpfm.ch' + publicHref(approved.path,language);
      const meta = getPageSeo(canonical);
      titles.add(meta.title);
      descriptions.add(meta.description);
      assert.equal(meta.canonical, canonical);
      assert.equal(meta.robots, 'index, follow');
      assert.equal(meta.hreflangs.length, 7);
      assert.equal(meta.bodyText, meta.description);
      const local = getLocalSeoDescriptor(approved.path, language);
      if (local) {
        assert.equal(meta.h1, local.h1);
        assert.equal(meta.description, local.description);
      }
      const html = injectPageSeo('<html lang="de-CH"><head><title>Fixture</title></head><body></body></html>', canonical);
      assert.match(html, /name="robots" content="index, follow"/);
      assert.equal((html.match(/hreflang=/g) || []).length, 7);
      const graph = JSON.parse(html.match(/<script id="kraken-page-schema"[^>]*>([\s\S]*?)<\/script>/)![1])['@graph'];
      const businesses = graph.filter((entity: { '@type': string }) => entity['@type'] === 'LocalBusiness');
      assert.equal(businesses.length, 1);
      assert.equal(businesses[0]['@id'], 'https://krakenpfm.ch/#business');
      assert.equal(businesses[0].address.streetAddress, 'Seewadelstrasse 3');
      assert.equal(businesses[0].address.addressLocality, 'Schaffhausen');
      assert.doesNotMatch(JSON.stringify(graph), /aggregateRating|ratingValue|reviewCount/);
    }
    assert.equal(titles.size, 6, approved.path);
    assert.equal(descriptions.size, 6, approved.path);
  }
});
