import test from "node:test";
import assert from "node:assert/strict";
import {priceSectorSelection} from "../src/sector-pricing.js";
import {buildVisitorInstructions} from "../src/visitor-assistant.js";
const catalog=[{
 slug:"clinic",name:"عيادة",published:true,archived:false,basePrice:5000,
 pricedAddons:[{code:"booking",name:"حجز",price:750,pricingType:"fixed"},{code:"support",name:"دعم سنوي",price:300,pricingType:"yearly"},{code:"agent",name:"مساعد شهري",price:90,pricingType:"monthly"}]
},{slug:"legal",name:"أفوكاتو",published:true,archived:false,basePrice:null},{slug:"hidden",name:"خاص",published:false,basePrice:20}];
test("server quotes only published sector and selected extras",()=>{
 const price=priceSectorSelection(catalog,"clinic",["booking","support","agent"]);
 assert.equal(price.subtotal,6140);assert.equal(price.monthly,90);assert.equal(price.yearly,300);
 assert.equal(price.items.length,4);
});
test("custom-quote sector never receives invented zero price",()=>{
 const quote=priceSectorSelection(catalog,"legal");
 assert.equal(quote.needsCustomQuote,true);assert.deepEqual(quote.items,[]);
});
test("hidden sectors and forged addon codes cannot be ordered",()=>{
 assert.throws(()=>priceSectorSelection(catalog,"hidden"),/not published/);
 assert.throws(()=>priceSectorSelection(catalog,"clinic",["unauthorized"]),/not published/);
 assert.throws(()=>priceSectorSelection(catalog,"clinic",["booking","booking"]),/Invalid sector extras/);
});
test("invalid or negative money fails closed",()=>{
 assert.equal(priceSectorSelection([{...catalog[0],basePrice:-10}],"clinic").needsCustomQuote,true);
});
test("visitor prompt grounds prices in server data and forbids autonomous execution",()=>{
 const prompt=buildVisitorInstructions({packages:[{name:"موقع",price:1500,currency:"EGP"}],sectors:[{slug:"clinic",name:"عيادتي"}]});
 assert.match(prompt,/1500/);assert.match(prompt,/عيادتي/);assert.match(prompt,/لا تنشئ حسابات/);
});

test("shared required and per-page add-ons use authoritative quantities",()=>{
 const items=[{...catalog[0],pricedAddons:[{code:"writing",name:"Writing",price:250,pricingType:"per_page"},{code:"extra_page",name:"Page",price:1000,pricingType:"per_page"},{code:"hosting",name:"Hosting",price:600,pricingType:"yearly",isRequired:true}]}];
 const result=priceSectorSelection(items,"clinic",["writing","extra_page"],{writing:4,extra_page:2});
 assert.equal(result.subtotal,8600);assert.equal(result.yearly,600);
 assert.throws(()=>priceSectorSelection(items,"clinic",["extra_page"],{extra_page:6}),/quantity/);
});
