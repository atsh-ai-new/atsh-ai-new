import test from 'node:test';
import assert from 'node:assert/strict';
import {initialOwnership,effectiveOwnership,resolveOwnership,ownershipConflicts,ensureOwnership,sectorTariff,resetOwnership,ownershipModes} from '../src/product-ownership.js';
import {priceSectorSelection} from '../src/sector-pricing.js';
import {calculateUnifiedPricing} from '../src/pricing-engine.js';
import {deriveQuoteFromOrder} from '../src/order-quote.js';
test('independent tariffs preserve the approved rental and copy proposal; code is separate',()=>{
 assert.deepEqual(initialOwnership('sector','eyadaty',999999),{rent:1490,copy:2490,code:7490,rent_monthly:149});
 assert.deepEqual(initialOwnership('package','Basic',1250),{rent:750,copy:1250,code:3000,rent_monthly:75});
 assert.equal(initialOwnership('sector','Unknown',null),null);
});
const rows=[{mode:'rent',list_price:'1490',initial_price:'1490',discount_percent:'10'},{mode:'copy',list_price:'2490',initial_price:'2490',discount_percent:'0'},{mode:'code',list_price:'5980',initial_price:'5980',discount_percent:'5'},{mode:'rent_monthly',list_price:'149',initial_price:'149',discount_percent:'0'}];
const prices=effectiveOwnership(rows);
test('each mode has its own discount and recurring period',()=>{
 assert.equal(resolveOwnership(prices,'rent').price,1341);
 assert.equal(resolveOwnership(prices,'copy').price,2490);
 assert.equal(resolveOwnership(prices,'code').price,5681);
 assert.equal(resolveOwnership(prices,'rent').period,'yearly');
 assert.equal(resolveOwnership(prices,'rent_monthly').period,'monthly');
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

test('all 28 registry keys use independent defaults and ten-month annual pricing',()=>{
 const keys='eyadaty agzakhana ebtsama hehaa nabd supermarket sofra market gzaar khodra mkawel avocato accounting mosek emtsal center academia taalm hadana madrasati news otstodyo cinema bas wnsh mosla toktok torsekl'.split(' ');
 assert.equal(new Set(keys).size,28);
 for(const key of keys){const tariff=sectorTariff(key);assert.ok(tariff);assert.equal(tariff.rent,tariff.rent_monthly*10);assert.ok(tariff.code>tariff.copy);assert.ok(tariff.copy>tariff.rent);assert.deepEqual(initialOwnership('sector',key,null),tariff);}
 assert.equal(sectorTariff('__proto__'),null);
 assert.equal(sectorTariff('toString'),null);
 assert.equal(initialOwnership('sector','unknown',null),null);
});
test('monthly rent excludes hosting and is billed monthly, not yearly or fixed',()=>{
 const catalog=[{slug:'test',name:'System',published:true,basePrice:2490,ownershipPrices:prices,pricedAddons:[{code:'hosting',name:'Hosting',price:225,pricingType:'yearly',isRequired:true}]}];
 const rental=priceSectorSelection(catalog,'test',[],{},'rent_monthly');
 assert.equal(rental.subtotal,149);assert.equal(rental.monthly,149);assert.equal(rental.yearly,0);
 assert.throws(()=>priceSectorSelection(catalog,'test',['hosting'],{},'rent_monthly'));
 const priced=calculateUnifiedPricing({packagePrice:149,packagePeriod:'monthly',vatRate:14});
 assert.deepEqual(priced.billing,{fixed:0,yearly:0,monthly:149});
 const quote=deriveQuoteFromOrder({total:priced.total,snapshot:{package:{name:'Package',price:149,pricingPeriod:'monthly'},options:[],vatAmount:priced.vatAmount,vatRate:14,total:priced.total}});
 assert.equal(quote.items[0].period,'monthly');
});
test('registry upgrade preserves edited amounts and discounts, then explicit reset restores defaults',async()=>{
 let stored=[{mode:'rent',list_price:'1490',initial_price:'1490',discount_percent:'10'},{mode:'copy',list_price:'3000',initial_price:'2490',discount_percent:'5'},{mode:'code',list_price:'5980',initial_price:'5980',discount_percent:'0'}];
 const db={query:async(sql,params)=>{
  if(sql.startsWith('SELECT'))return {rows:stored};
  if(sql.startsWith('INSERT')){
   assert.match(sql,/list_price=CASE WHEN product_ownership_prices.list_price=product_ownership_prices.initial_price/);
   assert.match(sql,/initial_price<>EXCLUDED.initial_price/);
   const [,,modes,amounts,approve]=params;
   for(const [i,mode] of modes.entries()){const row=stored.find(x=>x.mode===mode);if(!row){stored.push({mode,list_price:amounts[i],initial_price:amounts[i],discount_percent:0});continue;}if(approve&&Number(row.initial_price)!==amounts[i]){if(Number(row.initial_price)===Number(row.list_price))row.list_price=amounts[i];row.initial_price=amounts[i];}}
   return {rows:[]};
  }
  assert.match(sql,/SET list_price=initial_price,discount_percent=0/);
  stored=stored.map(r=>({...r,list_price:r.initial_price,discount_percent:0}));return {rows:stored};
 }};
 const result=await ensureOwnership(db,'sector','eyadaty','Renamed',5000);
 assert.equal(result.code.price,7490);assert.equal(result.copy.price,2850);assert.equal(result.rent.discount_percent,10);assert.equal(result.rent_monthly.price,149);
 const reset=await resetOwnership(db,'sector','eyadaty','Renamed',5000);
 assert.equal(reset.before.copy.price,2850);assert.equal(reset.prices.copy.price,2490);assert.equal(reset.prices.rent.discount_percent,0);
 assert.deepEqual(Object.keys(reset.prices).sort(),[...ownershipModes].sort());
});
