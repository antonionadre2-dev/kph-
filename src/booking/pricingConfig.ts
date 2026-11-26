/** Approved tariff configuration. Monetary values are integer CHF rappen. */
function immutable<T>(value:T):Readonly<T>{
  if(value&&typeof value==='object'){for(const nested of Object.values(value))immutable(nested);Object.freeze(value);}
  return value;
}
export const pricingConfig=immutable({
  version:'kraken-private-2026-11-26-v3',
  currency:'CHF',
  vat:{registered:false,rate:0.081},
  minimumLabourRateCents:4_000,
  limits:{count:1_000,areaM2:10_000,personHours:168,rooms:100,distanceKm:10_000,floor:100},
  regular:{
    rates:{weekly:4_000,fortnightly:4_100,monthly:4_200,once:4_400},
    minimumHours:{weekly:2.5,fortnightly:2.5,monthly:2.5,once:2.5},
    deep:{hourlyRateCents:4_400,minimumHours:3},
    extras:{materialsPerVisitCents:1_000,ovenCents:3_500,fridgeCents:3_000,ironingHourlyRateCents:4_000},
  },
  endOfTenancy:{
    tiers:[{rooms:1.5,maxAreaM2:50,priceCents:45_000},{rooms:2.5,maxAreaM2:75,priceCents:56_000},{rooms:3.5,maxAreaM2:100,priceCents:69_000},{rooms:4.5,maxAreaM2:125,priceCents:83_000},{rooms:5.5,maxAreaM2:150,priceCents:99_000}],
    excessAreaRateCents:600,maxExcessAreaM2:20,
    hourly:{rateCents:4_500,minimumHours:3},houseFromCents:125_000,
    extras:{bathroomCents:6_500,guestWcCents:3_500,slatBlindsCents:1_200,rollerShutterCents:800,smallBalconyCents:4_500,largeBalconyCents:8_000,storageCents:4_000,garageCents:4_500,carpetRoomCents:8_500,heavySoilingPercent:15},
  },
  construction:{
    hourly:{rateCents:4_800,minimumHours:4},
    area:{light:{rateCents:750,minimumCents:32_000},full:{rateCents:950,minimumCents:42_000}},
    extras:{cementPerM2Cents:350,filmWindowCents:800,slatBlindsCents:1_200,extraAreaFromCents:6_000,extraAreaToCents:10_000},
  },
  windows:{
    rates:{standardCents:1_600,doubleCents:2_400,balconyDoorCents:2_800,roofCents:2_500,slatBlindsCents:1_200,rollerShutterCents:800,difficultAccessPerVisitCents:3_500},
    minimumCents:12_000,winterGardenFromCents:18_000,winterGardenToCents:32_000,
  },
  moving:{
    hourly:{teams:{1:{hourlyRateCents:9_500,minimumHours:2},2:{hourlyRateCents:14_500,minimumHours:3}},additionalHelperRateCents:5_000,billingMinutes:15},
    travelCents:6_000,
    fixed:{maxDistanceKm:20,tiers:[{rooms:1.5,priceCents:54_000,priceType:'fixed'},{rooms:2.5,priceCents:79_000,priceType:'fixed'},{rooms:3.5,priceCents:115_000,priceType:'from'}]},
    extras:{includedFloor:1,floorPerAddressCents:4_000,largeWardrobeCents:5_000,disposalPerM3Cents:9_000,boxCents:300},
    combo:[{rooms:2.5,discountCents:6_000},{rooms:3.5,discountCents:10_000}],
  },
} as const);
