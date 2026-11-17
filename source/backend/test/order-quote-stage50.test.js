import test from "node:test";
import assert from "node:assert/strict";
import {deriveQuoteFromOrder} from "../src/order-quote.js";
import {quoteTotal} from "../src/commercial-rules.js";
const example={
 total:"1311.00",currency:"EGP",
 snapshot:{
  package:{name:"موقع",price:"1000.00"},
  options:[{name:"الهوية",price:100,quantity:1,lineTotal:100,pricing_type:"fixed"}],
  sector:{items:[{name:"الدعم سنوي",price:50,pricingType:"yearly"}]},
  vatAmount:161,vatRate:14,total:1311
 }
};
test("commercial quote reconciles exact original server-priced order",()=>{
 const result=deriveQuoteFromOrder(example);
 assert.equal(result.totalPiasters,131100);
 assert.equal(quoteTotal(result.items),131100);
 assert.equal(result.items.find(x=>x.label==="الدعم سنوي").period,"yearly");
});
test("quote rejects mutated totals or fabricated line items",()=>{
 assert.throws(()=>deriveQuoteFromOrder({...example,total:1300}),/do not reconcile/);
 assert.throws(()=>deriveQuoteFromOrder({...example,snapshot:{...example.snapshot,options:[{name:"غش",lineTotal:-12}]}}),/Invalid order amount/);
 assert.throws(()=>deriveQuoteFromOrder({...example,snapshot:{...example.snapshot,vatAmount:0}}),/do not reconcile/);
});
