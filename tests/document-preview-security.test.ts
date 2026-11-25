import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { escapedDocumentRecord, escapeDocumentText, DOCUMENT_PREVIEW_CSP, documentDraftLabel } from '../src/security/documentPreview.ts';

test('stored customer text cannot become executable invoice markup or alter amounts', () => {
  const record = { id: 'record-123', client: '</title><script>fetch("/private")</script>', email: '" onload="alert(1)', address: '<img src=x onerror=alert(1)>', service: 'A & B', amount: 560 };
  const escaped = escapedDocumentRecord(record);
  assert.notEqual(escaped, record);
  assert.equal(escaped.amount, 560);
  assert.equal(escaped.id, record.id);
  assert.doesNotMatch(escaped.client + escaped.email + escaped.address, /<script|<img|"/);
  assert.equal(escaped.service, 'A &amp; B');
  assert.equal(record.address, '<img src=x onerror=alert(1)>');
  assert.equal(escapeDocumentText("<>&\"'"), '&lt;&gt;&amp;&quot;&#39;');
});

test('legacy print previews are drafts with a script-free policy and an escaped record boundary', () => {
  assert.match(DOCUMENT_PREVIEW_CSP, /default-src 'none'/);
  assert.doesNotMatch(DOCUMENT_PREVIEW_CSP, /script-src.*unsafe-inline/);
  assert.equal(new Set(['de', 'en', 'es', 'fr', 'it', 'pt'].map(documentDraftLabel)).size, 6);
  for (const file of ['Dashboard.tsx', 'DetailInspectorModal.tsx']) {
    const source = readFileSync(new URL('../components/' + file, import.meta.url), 'utf8');
    const invoice = source.slice(source.indexOf('const handleGenerateInvoice'), source.indexOf('printWindow.document.close();') + 30);
    assert.match(invoice, /escapedDocumentRecord\(rawRequest\)/);
    assert.match(invoice, /Content-Security-Policy/);
    assert.match(invoice, /documentDraftLabel/);
    assert.doesNotMatch(invoice, /onclick=|Bahnhofstrasse 42|CHE-109\.823\.411/);
  }
});
