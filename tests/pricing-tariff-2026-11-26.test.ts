import test from 'node:test';
import assert from 'node:assert/strict';
import {calculatePrice,defaultSelection,getRegularMinimumHours,type MovingSelection,type EndOfTenancySelection} from '../src/booking/pricing.ts';
import {pricingConfig} from '../src/booking/pricingConfig.ts';

const eot=(rooms:number,areaM2:number,extra:Partial<EndOfTenancySelection>={})=>calculatePrice({...defaultSelection('endOfTenancy'),rooms,areaM2,...extra});
const moving=(extra:Partial<MovingSelection>={})=>calculatePrice({...defaultSelection('moving'),...extra});

test('all approved end-of-tenancy room/area examples match exactly, including the uncapped last tier',()=>{
 const cases:[number,number,number|null][]=[[1.5,50,450],[1.5,55,480],[1.5,70,560],[2.5,75,560],[2.5,80,590],[2.5,95,680],[2.5,96,null],[3.5,100,690],[3.5,110,750],[3.5,120,810],[4.5,125,830],[4.5,140,920],[5.5,150,990],[5.5,160,1050],[5.5,170,1110],[5.5,171,null],[6.5,1,null],[6.5,1000,null]];
 for(const [rooms,area,amount]of cases){const quote=eot(rooms,area);assert.equal(quote.totalCents,amount===null?null:amount*100,`${rooms}/${area}`);assert.equal(quote.priceType,amount===null?'personal':'fixed');assert.equal(quote.minimumChargeCents,quote.totalCents);}
});
test('area is rounded up before excess threshold; cap limits only room package plus extra area, before extras',()=>{
 assert.equal(eot(1.5,50.01).totalCents,45600);assert.equal(eot(2.5,95.01).totalCents,null);
 assert.ok(eot(2.5,95.01).manualReviewReasons.some(reason=>reason.code==='eot_excess_area_over_limit'));
 assert.equal(eot(2.5,95.01).manualReviewReasons.some(reason=>reason.code==='eot_area_over_limit'),false);
 const capped=eot(1.5,70,{guestWcs:1});assert.equal(capped.totalCents,59500);assert.equal(capped.appliedTier?.rooms,1.5);
 const line=capped.lines.find(line=>line.id==='eot-extra-area')!;assert.equal(line.quantity,20);assert.equal(line.unitPriceCents,600);assert.equal(line.totalCents,11000);assert.equal(line.params?.capped,true);assert.equal(line.params?.requestedSurchargeCents,12000);assert.equal(line.params?.capCents,56000);assert.match(line.label,/begrenzt/);
 assert.equal(eot(1.5,70,{heavySoiling:true}).totalCents,64400);
});
test('all regular frequencies allow 2.5 hours while deep and historical unmarked one-off keep 3 hours',()=>{
 for(const frequency of ['weekly','fortnightly','monthly','once']as const){const selection={...defaultSelection('regular'),frequency,hours:2.5};assert.equal(getRegularMinimumHours(selection),2.5);assert.equal(calculatePrice(selection).totalCents,pricingConfig.regular.rates[frequency]*2.5);}
 const deep={...defaultSelection('regular'),frequency:'once' as const,cleaningKind:'deep' as const,hours:3};assert.equal(calculatePrice(deep).totalCents,13200);assert.throws(()=>calculatePrice({...deep,hours:2.5}));
 const{cleaningKind,...legacy}=deep;assert.equal(getRegularMinimumHours(legacy),3);assert.throws(()=>calculatePrice({...legacy,hours:2.5}));assert.throws(()=>calculatePrice({...deep,frequency:'weekly'}));
});
test('moving hourly examples use selected team/helper rates, minimum duration, 15-minute rounding and CHF60 travel once',()=>{
 const cases:[Partial<MovingSelection>,number,number][]=[[{team:1,estimatedHours:3},345,250],[{team:1,estimatedHours:1},250,250],[{team:2,estimatedHours:4},640,495],[{team:2,estimatedHours:2},495,495],[{team:2,additionalHelpers:1,estimatedHours:4},840,645]];
 for(const[selection,amount,basis]of cases){const quote=moving(selection);assert.equal(quote.totalCents,amount*100);assert.equal(quote.minimumChargeCents,basis*100);assert.equal(quote.priceType,'estimate');assert.equal(quote.lines.filter(line=>line.id==='moving-travel').length,1);}
 assert.equal(moving({team:1,estimatedHours:2.01}).totalCents,27375);assert.equal(moving({team:1,estimatedHours:2.25}).totalCents,27375);
 for(const estimatedHours of [0,-1,NaN,Infinity])assert.throws(()=>moving({estimatedHours}));
 assert.throws(()=>moving({team:3 as any}));assert.throws(()=>moving({additionalHelpers:.5}));assert.throws(()=>moving({safe:'false' as any}));
});
test('moving fixed examples include only approved floor, wardrobe, disposal and box extras',()=>{
 assert.equal(moving({mode:'fixed',rooms:2.5,distanceKm:10,originFloor:3,originLift:false}).totalCents,87000);
 const full=moving({mode:'fixed',rooms:1.5,distanceKm:10,largeWardrobes:2,disposalM3:1,boxes:10});assert.equal(full.totalCents,76000);assert.equal(full.priceType,'fixed');assert.equal(full.minimumChargeCents,76000);assert.equal(full.lines.find(line=>line.id==='moving-disposal')?.unit,'m3');
 const stairs=moving({mode:'fixed',rooms:1.5,distanceKm:20,originFloor:2,originLift:false,destinationFloor:3,destinationLift:false});assert.equal(stairs.totalCents,66000);
 assert.equal(moving({mode:'fixed',rooms:1.5,distanceKm:20,originFloor:4,originLift:true}).totalCents,54000);
});
test('fixed route distance is explicit; large/special moves and 3–3.5 room from-price cannot be paid immediately',()=>{
 const from=moving({mode:'fixed',rooms:3.5,distanceKm:10});assert.equal(from.totalCents,null);assert.equal(from.minimumChargeCents,null);assert.equal(from.priceType,'from');assert.equal(from.fromPriceCents,115000);
 for(const invalid of [{piano:true},{safe:true},{furnitureLift:true},{distanceKm:25},{distanceKm:undefined},{rooms:4}]){const quote=moving({mode:'fixed',rooms:3.5,distanceKm:10,...invalid});assert.equal(quote.priceType,'personal');assert.equal(quote.fromPriceCents,undefined);assert.equal(quote.totalCents,null);assert.equal(quote.minimumChargeCents,null);}
 for(const fields of [{distanceKm:undefined},{distanceKm:25},{rooms:4,distanceKm:10},{rooms:6.5,distanceKm:10},{piano:true,distanceKm:10},{safe:true,distanceKm:10},{furnitureLift:true,distanceKm:10}]){const quote=moving({mode:'fixed',...fields});assert.equal(quote.totalCents,null);assert.equal(quote.minimumChargeCents,null);assert.equal(quote.priceType,'personal');assert.equal(quote.fromPriceCents,undefined);}
 for(const distanceKm of [NaN,-1,'10'])assert.throws(()=>moving({mode:'fixed',distanceKm:distanceKm as any}));
 const legacy=calculatePrice({service:'moving',details:'Old saved personal request'});assert.equal(legacy.totalCents,null);assert.equal(legacy.priceType,'personal');
});
test('combo includes explicitly booked matching same-address cleaning, discounts once and keeps honest hourly minimum basis',()=>{
 const cleaning={...defaultSelection('endOfTenancy'),rooms:2.5,areaM2:70};
 const fixed=moving({mode:'fixed',rooms:2.5,distanceKm:10,cleaning,sameAddress:true});assert.equal(fixed.totalCents,129000);assert.equal(fixed.minimumChargeCents,129000);assert.equal(fixed.lines.filter(line=>line.id==='moving-combo').length,1);assert.equal(fixed.lines.find(line=>line.id==='moving-combo')?.totalCents,-6000);
 const hourly=moving({rooms:2.5,estimatedHours:3,cleaning,sameAddress:true});assert.equal(hourly.totalCents,84500);assert.equal(hourly.minimumChargeCents,75000);
 const from=moving({mode:'fixed',rooms:3.5,distanceKm:10,cleaning:{...cleaning,rooms:3.5,areaM2:100},sameAddress:true});assert.equal(from.totalCents,null);assert.equal(from.fromPriceCents,174000);assert.equal(from.lines.find(line=>line.id==='moving-combo')?.totalCents,-10000);
 for(const fields of [{sameAddress:false},{rooms:1.5},{cleaning:{...cleaning,mode:'hourly'}},{cleaning:{...cleaning,propertyType:'house'}},{cleaning:{...cleaning,discountCents:999999}},{cleaning:{service:'moving'}}])assert.throws(()=>moving({mode:'fixed',rooms:2.5,distanceKm:10,cleaning,sameAddress:true,...fields}as any));
 assert.throws(()=>moving({sameAddress:true}));
 const review=moving({mode:'fixed',rooms:2.5,distanceKm:10,cleaning:{...cleaning,areaM2:96},sameAddress:true});assert.equal(review.totalCents,null);assert.equal(review.minimumChargeCents,null);assert.equal(review.lines.some(line=>line.id==='moving-combo'),false);
});
test('VAT is explicitly not registered and never summed, shown as a comparison, or deducted from any tariff',()=>{
 assert.deepEqual(pricingConfig.vat,{registered:false,rate:.081});assert.equal(Object.isFrozen(pricingConfig.moving.hourly.teams),true);
 for(const quote of [eot(1.5,70),moving({estimatedHours:3}),calculatePrice(defaultSelection('regular'))]){assert.equal(quote.vatCents,0);assert.equal(quote.vatComparisonCents,null);assert.equal(quote.totalCents,quote.subtotalCents);assert.equal(quote.taxStatus,'not_registered');}
});
