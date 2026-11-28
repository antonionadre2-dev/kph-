import test from 'node:test';
import assert from 'node:assert/strict';
import {priceSummaryPeriod} from '../src/booking/priceSummary';
import {bookingText} from '../src/booking/uiCopy';
test('monthly summary uses the confirmed full amount while preserving its per-visit breakdown',()=>{
 const quote={totalCents:12500};
 assert.deepEqual(priceSummaryPeriod(quote,{mode:'monthly'}),{scope:'visit',totalCents:12500,perVisitCents:12500,visits:null});
 assert.deepEqual(priceSummaryPeriod(quote,{mode:'monthly',totalCents:62500,visits:5}),{scope:'month',totalCents:62500,perVisitCents:12500,visits:5});
 assert.equal(quote.totalCents,12500);
 assert.deepEqual(priceSummaryPeriod(quote),{scope:'single',totalCents:12500,perVisitCents:12500,visits:null});
});
test('missing or malformed monthly approval cannot create a total or visit count',()=>{
 for(const billing of [{mode:'monthly',totalCents:null},{mode:'monthly',totalCents:0,visits:5},{mode:'monthly',totalCents:62500},{mode:'monthly',totalCents:62500,visits:0}] as const){
  const result=priceSummaryPeriod({totalCents:12500},billing);assert.equal(result.scope,'visit');assert.equal(result.totalCents,12500);assert.equal(result.visits,null);
 }
 for(const language of ['de','en','es','pt','it','fr'])for(const key of ['perVisitPrice','monthlyTotal','perVisitBreakdown','monthlyPriceBasis'])assert.notEqual(bookingText(language,key),key);
});
