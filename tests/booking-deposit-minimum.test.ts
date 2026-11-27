import test from 'node:test';
import assert from 'node:assert/strict';
import { createBookingService, validateBookingRequest, BOOKING_TERMS_VERSION } from '../server/booking.ts';
import { createPayrexxAdapter } from '../server/booking-payrexx.ts';
import { BookingError } from '../server/booking-store.ts';
import { calculatePrice, defaultSelection, PRICING_VERSION, type BookingSelection } from '../src/booking/pricing.ts';

const now = Date.parse('2026-11-27T12:00:00Z');
const clone = <T>(value:T):T => structuredClone(value);
const OLD_PRICING_VERSION = 'kraken-private-2026-11-26-v3';

function fixture() {
  const records = new Map<string,any>();
  const keys = new Map<string,{fingerprint:string;id:string}>();
  const mail = new Map<string,any>();
  const providerRequests:any[] = [];
  const store = {
    async get(id:string) { return clone(records.get(id) ?? null); },
    async create(key:string,fingerprint:string,record:any,job:any) {
      const prior=keys.get(key);
      if (prior) {
        if (prior.fingerprint!==fingerprint) throw new BookingError('IDEMPOTENCY_CONFLICT',409);
        return clone(records.get(prior.id));
      }
      records.set(record.bookingId,clone(record));
      keys.set(key,{fingerprint,id:record.bookingId});
      mail.set(job.id,clone(job));
      return clone(record);
    },
    async mutate(id:string,transform:(record:any)=>any) {
      const next=transform(clone(records.get(id)));
      records.set(id,clone(next));
      return clone(next);
    },
    async mutateWithMail(id:string,transform:(record:any)=>any,makeJobs:(record:any)=>any) {
      const next=transform(clone(records.get(id)));
      const jobs=makeJobs(next);
      records.set(id,clone(next));
      for (const job of (Array.isArray(jobs)?jobs:[jobs]).filter(Boolean)) if (!mail.has(job.id)) mail.set(job.id,clone(job));
      return clone(next);
    },
  };
  // The real adapter builds the real provider payload; all HTTP is replaced by this in-memory function.
  const payment=createPayrexxAdapter({instance:'kraken-isolated-test',secret:'synthetic-test-only-key',mode:'test',origin:'https://kraken.example'},async (_url,options)=>{
    assert.equal(options?.method,'POST');
    providerRequests.push(JSON.parse(String(options?.body)));
    return Response.json({status:'success',data:[{id:providerRequests.length,link:`https://kraken-isolated-test.payrexx.com/isolated-checkout/${providerRequests.length}`}]});
  });
  const service=createBookingService({store:store as any,payment,tokenSecret:'synthetic-private-test-secret-32-characters',origin:'https://kraken.example',mode:'test',clock:()=>now});
  return {service,records,providerRequests};
}

function request(selection:BookingSelection) {
  return {selection,customer:{name:'Synthetic Deposit Customer',email:'synthetic@example.test',phone:'+41770000000',address:'Testweg 1',postalCode:'8203',city:'Schaffhausen'},requestedDate:'2026-12-08',requestedTime:'10:00',notes:'Synthetic only',language:'es',termsAccepted:true,termsVersion:BOOKING_TERMS_VERSION,pricingVersion:PRICING_VERSION,acceptedTotalCents:calculatePrice(selection).totalCents,idempotencyKey:'synthetic_deposit_test_123456'};
}

async function confirmedCheckout(f:ReturnType<typeof fixture>,booking:any,termsVersion=BOOKING_TERMS_VERSION) {
  await f.service.confirmAppointment(booking.bookingId,{operatorId:'synthetic-test-operator',holdExpiresAt:new Date(now+3*86400000).toISOString()});
  return f.service.checkout(booking.bookingId,booking.publicToken,{termsAccepted:true,termsVersion,acceptedQuoteRevision:booking.quoteRevision,language:'es'});
}

test('authoritative saved hourly deposits and actual Payrexx adapter payloads use minimums, not browser-supplied amounts',async () => {
  const cases:[BookingSelection,number,number,number][] = [
    [{...defaultSelection('regular'),hours:4},16_000,10_000,1_500],
    [{...defaultSelection('endOfTenancy'),mode:'hourly',hours:4},18_000,13_500,2_025],
    [{...defaultSelection('construction'),mode:'hourly',hours:5},24_000,19_200,2_880],
  ];
  for (const [selection,total,basis,due] of cases) {
    const f=fixture();
    const booking=await f.service.create({...request(selection),amountDueNowCents:1,depositBasisCents:1});
    assert.equal(booking.quote.totalCents,total);
    assert.equal(booking.quote.depositBasisCents,basis);
    assert.equal(booking.quote.pricingVersion,PRICING_VERSION);
    assert.equal(booking.payment.amountDueNowCents,due);
    assert.equal(booking.payment.amountPaidCents,0);
    assert.equal(booking.payment.remainingBalanceCents,total);
    assert.equal(booking.canCheckout,false);
    const acceptance=clone(f.records.get(booking.bookingId).termsAcceptance);
    const checkout=await confirmedCheckout(f,booking);
    assert.equal(f.providerRequests.length,1);
    assert.equal(f.providerRequests[0].amount,due);
    assert.equal(f.providerRequests[0].currency,'CHF');
    assert.equal(f.providerRequests[0].vatRate,0);
    assert.equal(f.providerRequests[0].referenceId,f.records.get(booking.bookingId).checkout.reference);
    assert.equal(f.records.get(booking.bookingId).payment.amountDueNowCents,due);
    assert.equal(f.records.get(booking.bookingId).payment.amountPaidCents,0,'opening a gateway does not record a payment');
    assert.deepEqual(f.records.get(booking.bookingId).termsAcceptance,acceptance);
    assert.deepEqual(await f.service.checkout(booking.bookingId,booking.publicToken,{termsAccepted:true,termsVersion:BOOKING_TERMS_VERSION,acceptedQuoteRevision:1,language:'es'}),checkout);
    assert.equal(f.providerRequests.length,1,'retrying the active checkout must not create another gateway');
  }
});

test('a fixed-price cleaning keeps 15 percent of the full confirmed amount in storage and provider payload',async () => {
  const f=fixture();
  const booking=await f.service.create(request(defaultSelection('endOfTenancy')));
  assert.equal(booking.quote.totalCents,56_000);
  assert.equal(booking.quote.depositBasisCents,56_000);
  assert.equal(booking.payment.amountDueNowCents,8_400);
  await confirmedCheckout(f,booking);
  assert.equal(f.providerRequests[0].amount,8_400);
  assert.equal(f.records.get(booking.bookingId).quote.totalCents,56_000);
});

test('the new monetary version rejects an old calculator snapshot even where the displayed total is unchanged', () => {
  assert.notEqual(PRICING_VERSION,OLD_PRICING_VERSION);
  const input=request({...defaultSelection('regular'),hours:4});
  assert.throws(()=>validateBookingRequest({...input,pricingVersion:OLD_PRICING_VERSION},now),{code:'PRICE_CHANGED'});
});

test('existing stored hourly totals, deposit and legal acceptance remain intact during read, confirmation and checkout',async () => {
  const f=fixture();
  const selection={...defaultSelection('regular'),hours:4};
  const booking=await f.service.create(request(selection));
  // Represents a persisted booking accepted before this change: its quote is authoritative, not recomputed.
  const historical=f.records.get(booking.bookingId);
  historical.quote={...historical.quote,pricingVersion:OLD_PRICING_VERSION,priceType:'fixed',depositBasisCents:16_000};
  historical.payment.amountDueNowCents=2_400;
  const originalQuote=clone(historical.quote);
  const originalAcceptance=clone(historical.termsAcceptance);
  const read=await f.service.read(booking.bookingId,booking.publicToken);
  assert.deepEqual(read.quote,originalQuote);
  assert.equal(read.payment.amountDueNowCents,2_400);
  await confirmedCheckout(f,booking);
  assert.equal(f.providerRequests[0].amount,2_400);
  const saved=f.records.get(booking.bookingId);
  assert.deepEqual(saved.quote,originalQuote);
  assert.deepEqual(saved.termsAcceptance,originalAcceptance);
  assert.equal(saved.termsVersion,historical.termsVersion);
  assert.equal(saved.payment.amountDueNowCents,2_400);
  assert.equal(saved.payment.amountPaidCents,0);
  assert.equal(saved.payment.remainingBalanceCents,16_000);
});
