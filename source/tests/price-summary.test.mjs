import assert from "node:assert/strict";
import {test} from "node:test";
import {summarizePrice} from "../src/lib/price-summary.ts";
import {calculateUnifiedPricing} from "../backend/src/pricing-engine.js";

test("package and system estimates match authoritative invoice math in all four modes",()=>{
 const tariffs=[["monthly",119.4],["yearly",1194],["fixed",1990],["fixed",4780]];
 const addons=[{code:"hosting",name:"Hosting",pricing_type:"yearly",lineTotal:225},
  {code:"maintenance",name:"Support",pricing_type:"monthly",lineTotal:1500},
  {code:"extra_page",name:"Pages",pricing_type:"per_page",lineTotal:2684},
  {code:"example",name:"Example",pricing_type:"fixed",lineTotal:.13}];
 const addLines=addons.map(({name,pricing_type,lineTotal})=>({name,period:pricing_type==="per_page"?"fixed":pricing_type,amount:lineTotal}));
 for(const [period,amount] of tariffs)for(const vat of [0,14,18.5]) {
   const items=[{name:"Base",period,amount},...addLines];
   const packageResult=calculateUnifiedPricing({packagePrice:amount,packagePeriod:period,packageOptions:addons,vatRate:vat});
   const sectorResult=calculateUnifiedPricing({sectorQuote:{items:items.map(({name,period,amount},i)=>({code:String(i),name,pricingType:period,price:amount}))},vatRate:vat});
   for(const r of [packageResult,sectorResult])assert.deepEqual(summarizePrice(items,vat),{subtotal:r.subtotal,vat:r.vatAmount,total:r.total,...r.billing});
 }
});
test("unknown VAT never becomes zero and malformed tariffs are blocked",()=>{
 const item={name:"Base",amount:10,period:"fixed"};
 assert.equal(summarizePrice([item],null),null);
 assert.equal(summarizePrice([item],Infinity),null);
 assert.equal(summarizePrice([{...item,amount:-1}],14),null);
 assert.equal(summarizePrice([item],0).total,10);
});
