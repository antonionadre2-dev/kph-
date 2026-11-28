import test from 'node:test';
import assert from 'node:assert/strict';
import { operatorAmountCents, proposedOperatorRefund, safeOperatorPaymentLink, operatorScopeLanguage } from '../src/booking/operatorUi';
import { operatorCopy } from '../src/booking/operatorCopy';
test('operator CHF entry preserves cents without accepting ambiguous or rounded numbers',()=>{
 for(const [input,expected] of [['560',56000],[' 560,25 ',56025],['0.05',5],['19.9',1990]] as const)assert.equal(operatorAmountCents(input),expected);
 for(const input of ['0','-1','1.001','1e3','1 000','1,000.50','Infinity','NaN','99999999'])assert.equal(operatorAmountCents(input),null,input);
});
test('refund proposals use server cancellation quote and cap settlement refunds by net receipts',()=>{
 assert.equal(proposedOperatorRefund({status:'cancelled',cancellationQuote:{refundCents:25000},payment:{refundedCents:20000}}),25000,'Cancellation quote is already net of prior refunds');
 const record={status:'completed',workSettlement:{refundDueCents:10000,finalTotalCents:40000},payment:{amountPaidCents:50000,refundedCents:0}};
 assert.equal(proposedOperatorRefund(record),10000);record.payment.refundedCents=10000;assert.equal(proposedOperatorRefund(record),0,'Refreshed settlement must not propose the same refund twice');
 assert.equal(proposedOperatorRefund({status:'requested'}),0);
});
test('operator payment links only open provider HTTPS addresses without embedded credentials',()=>{
 assert.equal(safeOperatorPaymentLink('https://krakenpfm.payrexx.com/?tid=abc'),'https://krakenpfm.payrexx.com/?tid=abc');
 for(const value of ['javascript:alert(1)','http://krakenpfm.payrexx.com','https://payrexx.com.evil.test','https://user:pass@payrexx.com','https://example.test',null])assert.equal(safeOperatorPaymentLink(value),null);
});
test('all operator mail outcomes, including scheduling failures, are readable in six languages',()=>{
 for(const lang of ['de','en','es','pt','it','fr'])for(const key of ['mailScheduled','mailCancelFailed','mailScheduleFailed','legacyDeadlineDescription','refundReview','monthlyHint'])assert.ok(operatorCopy(lang)[key],`${lang}:${key}`);
});

test('manual scope uses the customer language rather than a Spanish staff interface',()=>{
 assert.equal(operatorScopeLanguage('de'),'de');assert.equal(operatorScopeLanguage('pt-PT'),'pt');assert.equal(operatorScopeLanguage(undefined),'de');
 for(const lang of ['de','en','es','pt','it','fr'])assert.match(operatorCopy(lang).scopeLanguageReview,/\{language\}/);
});
