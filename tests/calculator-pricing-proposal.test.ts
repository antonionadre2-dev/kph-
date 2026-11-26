import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { calculatePrice, defaultSelection, END_OF_TENANCY_TIERS, PRICING_VERSION, REGULAR_RATES, type RegularFrequency } from '../src/booking/pricing';
import { bookingText } from '../src/booking/uiCopy';

test('approved regular frequency rates preserve 2.5 minimum booked hours and CHF 40/hour floor', () => {
  const expected: Record<RegularFrequency, number> = { weekly: 10_000, fortnightly: 10_250, monthly: 10_500, once: 11_000 };
  for (const [frequency, total] of Object.entries(expected)) {
    const freq = frequency as RegularFrequency;
    const minimum = 2.5;
    const selection = { ...defaultSelection('regular'), frequency: freq, hours: minimum };
    const quote = calculatePrice(selection);
    assert.equal(quote.totalCents, total);
    assert.ok(REGULAR_RATES[freq] >= 4_000);
    assert.throws(() => calculatePrice({ ...selection, hours: minimum - .25 }));
  }
  assert.match(PRICING_VERSION, /2026-11-26/);
});

test('materials remain CHF 10 once per visit, without changing the labour or ironing rates', () => {
  const base = { ...defaultSelection('regular'), hours: 4 };
  const plain = calculatePrice(base);
  const withMaterials = calculatePrice({ ...base, materials: true });
  assert.equal(withMaterials.totalCents! - plain.totalCents!, 1_000);
  assert.equal(withMaterials.lines.find(line => line.id === 'regular-materials')?.quantity, 1);
  const extras = calculatePrice({ ...base, materials: true, oven: true, fridge: true, ironingHours: .75 });
  assert.equal(extras.totalCents, 26_500);
  assert.equal(extras.bookedPersonHours, 4.75);
});

test('all five end-of-tenancy tiers follow rooms, with separate rounded excess area', () => {
  assert.deepEqual(END_OF_TENANCY_TIERS.map(tier => [tier.rooms, tier.maxAreaM2, tier.priceCents]), [
    [1.5, 50, 45_000], [2.5, 75, 56_000], [3.5, 100, 69_000], [4.5, 125, 83_000], [5.5, 150, 99_000],
  ]);
  for (const tier of END_OF_TENANCY_TIERS) {
    const quote = calculatePrice({ ...defaultSelection('endOfTenancy'), rooms: tier.rooms, areaM2: tier.maxAreaM2 });
    assert.equal(quote.totalCents, tier.priceCents);
  }
  const aboveArea = calculatePrice({ ...defaultSelection('endOfTenancy'), rooms: 1.5, areaM2: 51.01 });
  assert.equal(aboveArea.totalCents, 46_200);
  assert.equal(aboveArea.appliedTier?.raisedForArea, false);
  assert.equal(aboveArea.lines.find(line=>line.id==='eot-extra-area')?.quantity,2);
  const largerRooms = calculatePrice({ ...defaultSelection('endOfTenancy'), rooms: 3.5, areaM2: 45 });
  assert.equal(largerRooms.totalCents, 69_000);
});

test('end-of-tenancy extras are preserved, including one included bathroom and the 15% surcharge', () => {
  const quote = calculatePrice({ ...defaultSelection('endOfTenancy'), rooms: 3.5, areaM2: 90, bathrooms: 2, guestWcs: 1, slatBlinds: 2, heavySoiling: true });
  assert.equal(quote.lines.find(line => line.id === 'eot-bathroom')?.quantity, 1);
  assert.equal(quote.totalCents, 93_610); // (690 + 65 + 35 + 24) × 1.15
  assert.equal(quote.vatCents, 0);
});

test('window minimum is CHF 120 after selected extras, not CHF 120 plus the same extras again', () => {
  const base = defaultSelection('windows'); // 4 × 16 + 2 × 24 = CHF 112
  const minimum = calculatePrice(base);
  assert.equal(minimum.totalCents, 12_000);
  assert.equal(minimum.lines.find(line => line.id === 'windows-minimum')?.totalCents, 800);
  const withShutter = calculatePrice({ ...base, rollerShutters: 1 });
  assert.equal(withShutter.totalCents, 12_000);
  assert.equal(withShutter.lines.some(line => line.id === 'windows-minimum'), false);
  const mixed = calculatePrice({ ...base, standard: 4, double: 3, balconyDoors: 1, roof: 1 });
  assert.equal(mixed.totalCents, 18_900);
  assert.throws(() => calculatePrice({ ...base, standard: 0, double: 0 }));
});

test('non-registered VAT is neither added nor offered as a hypothetical comparison', () => {
  const quote = calculatePrice({ ...defaultSelection('regular'), frequency: 'fortnightly', hours: 2.75 });
  assert.equal(quote.totalCents, 11_275);
  assert.equal(quote.subtotalCents, 11_275);
  assert.equal(quote.vatComparisonCents, null);
  assert.equal(quote.vatCents, 0);
  assert.equal(quote.taxStatus, 'not_registered');
  assert.equal(quote.lines.reduce((sum, line) => sum + line.totalCents, 0), quote.totalCents);
});

test('construction prices remain unchanged; quote-only cases never get a checkout total or VAT saving', () => {
  assert.equal(calculatePrice(defaultSelection('construction')).totalCents, 37_500);
  assert.equal(calculatePrice({ ...defaultSelection('construction'), areaM2: 10 }).totalCents, 32_000);
  assert.equal(calculatePrice({ ...defaultSelection('construction'), level: 'full', areaM2: 10 }).totalCents, 42_000);
  const selections = [
    {service:'moving' as const,details:'Legacy personal enquiry'},
    { ...defaultSelection('endOfTenancy'), areaM2: 140.01 },
    { ...defaultSelection('endOfTenancy'), propertyType: 'house' as const },
    { ...defaultSelection('windows'), winterGarden: true },
  ];
  for (const selection of selections) {
    const quote = calculatePrice(selection);
    assert.equal(quote.totalCents, null);
    assert.equal(quote.vatComparisonCents, null);
    assert.ok(quote.manualReviewReasons.length > 0);
  }
});

test('new conversion copy is available in all six calculator languages', () => {
  const keys = ['titleStart', 'titleAccent', 'vatCardTitle', 'vatCardBody', 'vatComparisonLabel', 'vatComparisonCondition', 'vatHowCalculated', 'vatKrakenPrice', 'vatHypotheticalTax', 'vatHypotheticalTotal', 'vatComparisonExplanation', 'extrasReassurance', 'contactPage', 'previewTools', 'nudgeShowHelp', 'nudgeShowDemo', 'nudgeHelpBody', 'emailUnavailableBeforeRequest', 'mailUnavailable', 'recoveryAvailabilityLoading', 'recoveryUnavailable', 'returnMissing', 'mailFailed'];
  for (const lang of ['de', 'en', 'es', 'fr', 'it', 'pt']) {
    for (const key of keys) {
      const value = bookingText(lang, key);
      assert.notEqual(value, key, `${lang}:${key} must resolve`);
      assert.ok(value.trim().length > 0);
      if (lang !== 'de') assert.notEqual(value, bookingText('de', key), `${lang}:${key} must be translated`);
    }
    assert.match(bookingText(lang, 'windowIncluded'), /CHF 120/);
  }
});
