import test from 'node:test';
import assert from 'node:assert/strict';
import { getDashboardTranslation } from '../components/dashboardTranslations.ts';

test('all dashboard languages remove fictional company, bank and blanket tax claims from billing copy', () => {
  for (const language of ['de-CH', 'de', 'en', 'es', 'fr', 'it', 'pt']) {
    const text = getDashboardTranslation(language);
    assert.equal(text.pdfFooterIban, '', language);
    for (const key of ['pdfPropertyMaint', 'pdfServiceSubtext', 'pdfFooterTagline', 'emailSincerely', 'myFacilities', 'formSubStaff', 'recordB2BAppointments'] as const) {
      assert.doesNotMatch(text[key], /Facilities|Facility|B2B|IBAN|CH93|Management AG|Gebäudemanagement/i, `${language}/${key}`);
    }
    assert.equal(text.pdfTotalVat, 'Total CHF');
    assert.equal(text.pdfTotalVatInc, 'Total CHF');
    assert.doesNotMatch(text.totalEstimated, /MwSt|VAT|IVA|TVA/i);
    assert.doesNotMatch(text.pdfFooterDocNotice + text.pdfValidFiscalDoc, /Gültiges Steuerdokument|valid tax|valid fiscal|fiscal válido|fiscale valido|fiscal valide/i);
    if (language.startsWith('de')) assert.doesNotMatch(JSON.stringify(text), /ß/);
  }
});
