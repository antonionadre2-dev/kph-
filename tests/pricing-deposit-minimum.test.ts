import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateLegacyPrice as calculatePrice, defaultSelection, type BookingSelection, type RegularFrequency } from '../src/booking/pricing.ts';

const deposit = (selection:BookingSelection) => {
  const quote = calculatePrice(selection);
  return { quote, cents:quote.depositBasisCents === null ? null : Math.round(quote.depositBasisCents * .15) };
};

test('hourly deposits use the applicable minimum rather than the longer selected estimate', () => {
  const cases:[BookingSelection,number,number,number][] = [
    [{...defaultSelection('regular'),hours:4},16_000,10_000,1_500],
    [{...defaultSelection('endOfTenancy'),mode:'hourly',hours:4},18_000,13_500,2_025],
    [{...defaultSelection('construction'),mode:'hourly',hours:5},24_000,19_200,2_880],
  ];
  for (const [selection,total,basis,expectedDeposit] of cases) {
    const before = structuredClone(selection);
    const {quote,cents} = deposit(selection);
    assert.equal(quote.totalCents,total);
    assert.equal(quote.lines.reduce((sum,line)=>sum+line.totalCents,0),total);
    assert.equal(quote.depositBasisCents,basis);
    assert.equal(cents,expectedDeposit);
    assert.equal(quote.priceType,'estimate');
    assert.deepEqual(selection,before,'pricing must not mutate an existing selection');
  }
});

test('frequency and deep-clean minimums include only their own approved labour rates', () => {
  const minimums:Record<RegularFrequency,number> = {weekly:10_000,fortnightly:10_250,monthly:10_500,once:11_000};
  for (const frequency of Object.keys(minimums) as RegularFrequency[]) {
    const minimum = {...defaultSelection('regular'),frequency,hours:2.5};
    const longer = {...minimum,hours:5.25};
    assert.equal(calculatePrice(minimum).totalCents,minimums[frequency]);
    assert.equal(calculatePrice(longer).depositBasisCents,minimums[frequency]);
  }
  const deep = {...defaultSelection('regular'),cleaningKind:'deep' as const,frequency:'once' as const,hours:5,oven:true};
  assert.equal(calculatePrice(deep).totalCents,25_500);
  assert.equal(calculatePrice(deep).depositBasisCents,16_700);
  const {cleaningKind,...historicalOneOffSelection} = deep;
  assert.equal(calculatePrice(historicalOneOffSelection).depositBasisCents,16_700,'unmarked one-off selections retain the established three-hour deep-clean minimum');
});

test('minimum order keeps selected materials, fixed extras and explicitly ordered ironing without adding cleaning travel', () => {
  const selection = {...defaultSelection('regular'),hours:4,materials:true,oven:true,fridge:true,ironingHours:.75};
  const {quote,cents} = deposit(selection);
  assert.equal(quote.totalCents,26_500);
  assert.equal(quote.depositBasisCents,20_500); // 2.5 h × CHF40 + 10 + 35 + 30 + 0.75 h × CHF40
  assert.equal(cents,3_075);
  assert.equal(quote.lines.some(line=>line.id.includes('travel')),false);
  assert.equal(calculatePrice({...selection,hours:2.5}).depositBasisCents,20_500);
});

test('heavy-soiling percentage is applied to the minimum cleaning scope and its booked extras, with integer rounding', () => {
  const selection = {...defaultSelection('endOfTenancy'),mode:'hourly' as const,hours:4,guestWcs:1,heavySoiling:true};
  const {quote,cents} = deposit(selection);
  assert.equal(quote.totalCents,24_725); // (4 h × CHF45 + CHF35) × 1.15
  assert.equal(quote.lines.find(line=>line.id==='eot-heavy-soiling')?.totalCents,3_225);
  assert.equal(quote.depositBasisCents,19_550); // (3 h × CHF45 + CHF35) × 1.15
  assert.equal(cents,2_933);
  assert.equal(calculatePrice({...selection,hours:3}).totalCents,19_550);
  assert.equal(calculatePrice({...selection,hours:20}).depositBasisCents,19_550);
});

test('hourly construction minimum includes its exact selected surface and window extras', () => {
  const selection = {...defaultSelection('construction'),mode:'hourly' as const,hours:5,cementM2:2.25,filmWindows:1,slatBlinds:1};
  const {quote,cents} = deposit(selection);
  assert.equal(quote.totalCents,26_788);
  assert.equal(quote.depositBasisCents,21_988); // 4 h × CHF48 + CHF7.88 + CHF8 + CHF12
  assert.equal(cents,3_298);
  assert.equal(calculatePrice({...selection,hours:4}).totalCents,21_988);
});

test('fixed-price work retains a deposit on the whole confirmed price and its extras', () => {
  const selections:BookingSelection[] = [
    {...defaultSelection('endOfTenancy'),mode:'fixed',guestWcs:1,heavySoiling:true},
    {...defaultSelection('construction'),mode:'area',filmWindows:2},
    {...defaultSelection('windows'),double:6,difficultAccess:true},
    {...defaultSelection('moving'),mode:'fixed',distanceKm:10,rooms:2.5,largeWardrobes:1},
  ];
  for (const selection of selections) {
    const quote = calculatePrice(selection);
    assert.equal(quote.priceType,'fixed');
    assert.equal(quote.depositBasisCents,quote.totalCents);
  }
});

test('moving minimum includes helpers and travel once; a fixed cleaning combo and discount are included once', () => {
  const moving = {...defaultSelection('moving'),team:2 as const,additionalHelpers:1,estimatedHours:5,rooms:2.5};
  const quote = calculatePrice(moving);
  assert.equal(quote.totalCents,103_500);
  assert.equal(quote.depositBasisCents,64_500); // 3 h × (CHF145 + CHF50) + CHF60 travel
  assert.equal(quote.lines.filter(line=>line.id==='moving-travel').length,1);
  const cleaning = {...defaultSelection('endOfTenancy'),rooms:2.5,areaM2:70};
  const combo = calculatePrice({...moving,cleaning,sameAddress:true});
  assert.equal(combo.totalCents,153_500);
  assert.equal(combo.depositBasisCents,114_500); // minimum move + CHF560 cleaning − CHF60 combo discount
  assert.equal(combo.lines.filter(line=>line.id==='moving-travel').length,1);
  assert.equal(combo.lines.filter(line=>line.id==='moving-combo').length,1);
});

test('manual-review work never acquires a payable deposit through the hourly minimum rule', () => {
  const selections:BookingSelection[] = [
    {...defaultSelection('endOfTenancy'),mode:'hourly',hours:4,propertyType:'house'},
    {...defaultSelection('construction'),mode:'hourly',hours:5,extraArea:true},
    {...defaultSelection('windows'),winterGarden:true},
    {...defaultSelection('moving'),estimatedHours:4,piano:true},
  ];
  for (const selection of selections) {
    const quote = calculatePrice(selection);
    assert.equal(quote.totalCents,null);
    assert.equal(quote.depositBasisCents,null);
    assert.ok(quote.manualReviewReasons.length>0);
  }
});
