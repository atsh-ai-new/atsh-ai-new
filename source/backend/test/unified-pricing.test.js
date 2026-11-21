import test from "node:test";
import assert from "node:assert/strict";
import { calculateUnifiedPricing } from "../src/pricing-engine.js";

test("one calculator combines package, catalog and recurring options",()=>{
 const result=calculateUnifiedPricing({
  packagePrice:1000,
  packageOptions:[{code:"hosting",name:"Hosting",lineTotal:100,pricing_type:"monthly"}],
  sectorQuote:{items:[{code:"sector-base",name:"Sector",price:500,pricingType:"fixed"},{code:"branding",name:"Branding",price:800,pricingType:"fixed"}]},
  vatRate:14
 });
 assert.equal(result.subtotal,2400);
 assert.equal(result.vatAmount,336);
 assert.equal(result.total,2736);
 assert.deepEqual(result.billing,{fixed:2300,monthly:100,yearly:0});
});
test("rejects invalid prices",()=>assert.throws(()=>calculateUnifiedPricing({packagePrice:-1})));
test("does not charge VAT when no rate configured",()=>{
 const result=calculateUnifiedPricing({packagePrice:800});
 assert.equal(result.vatAmount,null);
 assert.equal(result.total,800);
});
