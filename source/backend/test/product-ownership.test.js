import test from 'node:test';
import assert from 'node:assert/strict';
import {initialOwnership,effectiveOwnership,resolveOwnership,ownershipConflicts,ensureOwnership} from '../src/product-ownership.js';
import {priceSectorSelection} from '../src/sector-pricing.js';
import {calculateUnifiedPricing} from '../src/pricing-engine.js';
import {deriveQuoteFromOrder} from '../src/order-quote.js';
test('independent tariffs preserve the approved rental and copy proposal; code is separate',()=>{
 assert.deepEqual(initialOwnership('sector','عيادتي',999999),{rent:1490,copy:2490,code:5980});
 assert.deepEqual(initialOwnership('package','Basic',1250),{rent:750,copy:1250,code:3000});
 assert.equal(initialOwnership('sector','Unknown',null),null);
});
const rows=[{mode:'rent',list_price:'1490',initial_price:'1490',discount_percent:'10'},{mode:'copy',list_price:'2490',initial_price:'2490',discount_percent:'0'},{mode:'code',list_price:'5980',initial_price:'5980',discount_percent:'5'}];
const prices=effectiveOwnership(rows);
test('each mode has its own discount and recurring period',()=>{
 assert.equal(resolveOwnership(prices,'rent').price,1341);
 assert.equal(resolveOwnership(prices,'copy').price,2490);
 assert.equal(resolveOwnership(prices,'code').price,5681);
 assert.equal(resolveOwnership(prices,'rent').period,'yearly');
 assert.equal(resolveOwnership(prices,'code').period,'fixed');
 assert.throws(()=>resolveOwnership(prices,'invalid'));
});
test('existing edited prices are not overwritten by initial defaults',async()=>{
 let calls=0;const db={query:async()=>{calls++;return {rows}}};
 assert.deepEqual(await ensureOwnership(db,'package','id','name',1),prices);
 assert.equal(calls,1);
});
test('system with rental does not charge included hosting and keeps addon period',()=>{
 const catalog=[{slug:'test',name:'عيادتي',published:true,basePrice:2490,ownershipPrices:prices,pricedAddons:[{code:'hosting',name:'Hosting',price:225,pricingType:'yearly',isRequired:true},{code:'extra_page',name:'Page',price:100,pricingType:'per_page'}]}];
 const rental=priceSectorSelection(catalog,'test',['extra_page'],{extra_page:2},'rent');
 assert.equal(rental.yearly,1341);assert.equal(rental.subtotal,1541);
 assert.throws(()=>priceSectorSelection(catalog,'test',['hosting'],{},'rent'));
 const copy=priceSectorSelection(catalog,'test',[],{},'copy');
 assert.equal(copy.subtotal,2715);assert.equal(copy.yearly,225);
 assert.equal(ownershipConflicts('code','hosting'),false);
});
test('package rental period reaches billing and contractual quote',()=>{
 const priced=calculateUnifiedPricing({packagePrice:1341,packagePeriod:'yearly',packageOptions:[{code:'payment',name:'Payment',lineTotal:100,pricing_type:'fixed'}],vatRate:14});
 assert.deepEqual(priced.billing,{fixed:100,yearly:1341,monthly:0});
 const quote=deriveQuoteFromOrder({total:priced.total,snapshot:{package:{name:'Package',price:1341,pricingPeriod:'yearly'},options:[{name:'Payment',lineTotal:100,pricing_type:'fixed'}],vatAmount:priced.vatAmount,vatRate:14,total:priced.total}});
 assert.equal(quote.items[0].period,'yearly');
 assert.equal(quote.totalPiasters,Math.round(priced.total*100));
});
