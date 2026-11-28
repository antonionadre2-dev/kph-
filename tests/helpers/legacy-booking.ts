import {calculateLegacyPrice} from '../../src/booking/pricing.ts';
import {termsMetadata} from '../../src/legal/terms-registry.ts';

/** Explicit persisted v2 fixture. Public creation still accepts only current terms; this models old saved data. */
export function seedStoredV2(record:any) {
  const version='kraken-agb-2026-11-26-v2',locale=record.language,shown=termsMetadata(version,locale)!,german=termsMetadata(version,'de')!;
  record.termsVersion=version;
  record.termsAcceptance={version,acceptedAt:record.termsAcceptedAt,language:locale,sourceLanguage:shown.sourceLanguage,documentSha256:shown.sha256,germanSha256:german.sha256,documentUrl:shown.documentUrl,pdfUrl:shown.pdfUrl};
  record.quote=calculateLegacyPrice(record.selection);
  record.payment={status:'not_started',depositPercent:15,amountDueNowCents:record.quote.depositBasisCents===null?0:Math.round(record.quote.depositBasisCents*.15),amountPaidCents:0,remainingBalanceCents:record.quote.totalCents??0};
  return record;
}
