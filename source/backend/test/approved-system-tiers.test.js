import test from 'node:test';
import assert from 'node:assert/strict';
import {readApprovedSystemOwnership} from '../src/product-ownership.js';
import {priceSectorSelection} from '../src/sector-pricing.js';
import {calculateUnifiedPricing} from '../src/pricing-engine.js';
import {deriveQuoteFromOrder} from '../src/order-quote.js';

const row=(mode,list_price,discount_percent='0')=>({mode,list_price,initial_price:'1',discount_percent});
const approved=[row('copy','64900'),row('rent','18500'),row('code','89900'),row('rent_monthly','199')];
function marketDb(rows) {
 return {query:async(sql,params)=>{
  assert.match(sql,/^SELECT /);
  assert.match(sql,/scope='sector'/);
  assert.equal(params[0],'market');
  assert.ok(!params[1].includes('rent_monthly'));
  return {rows};
 }};
}
function select(ownershipPrices,mode){
 return priceSectorSelection([{slug:'market',name:'Market',published:true,basePrice:64900,ownershipPrices}], 'market',[],{},mode);
}

test('Market approval enables the existing exact annual rent and source prices, not monthly',async()=>{
 const prices=await readApprovedSystemOwnership(marketDb(approved),'market',{configuration:true});
 assert.deepEqual(Object.keys(prices),['copy','rent','code']);
 assert.equal(select(prices,'copy').subtotal,64900);
 assert.equal(select(prices,'rent').yearly,18500);
 assert.equal(select(prices,'code').subtotal,89900);
 assert.equal(select(prices,'rent_monthly').needsCustomQuote,true);
 assert.deepEqual(Object.keys(await readApprovedSystemOwnership(marketDb(approved),'market')),['copy']);
});

test('Market quote rejects stale or missing mode rows without suppressing independently valid tiers',async()=>{
 const old=await readApprovedSystemOwnership(marketDb([row('copy','64900'),row('rent','1990'),row('code','89900')]),'market',{configuration:true});
 assert.equal(select(old,'rent').needsCustomQuote,true);
 assert.equal(select(old,'code').subtotal,89900);
 const absent=await readApprovedSystemOwnership(marketDb([row('rent','18500'),row('copy','64900')]),'market',{configuration:true});
 assert.equal(select(absent,'code').needsCustomQuote,true);
 const copyMissing=await readApprovedSystemOwnership(marketDb([row('rent','18500'),row('code','89900')]),'market',{configuration:true});
 assert.equal(copyMissing,null);
 const invalid=await readApprovedSystemOwnership(marketDb([row('rent','18500','101'),row('code','89900'),row('copy','64900')]),'market',{configuration:true});
 assert.equal(select(invalid,'rent').needsCustomQuote,true);
 assert.equal(await readApprovedSystemOwnership({query:()=>assert.fail('unapproved systems must not be queried')},'other',{configuration:true}),null);
});

test('existing discounts flow intact from Market ownership to the pricing and invoice amounts',async()=>{
 const prices=await readApprovedSystemOwnership(marketDb([row('rent','18500','10'),row('code','89900','5'),row('copy','64900','3')]),'market',{configuration:true});
 assert.equal(prices.rent.discount_percent,10);
 assert.equal(select(prices,'copy').subtotal,62953);
 assert.equal(select(prices,'rent').yearly,16650);
 assert.equal(select(prices,'code').subtotal,85405);
 const sector=select(prices,'rent');
 const total=calculateUnifiedPricing({sectorQuote:sector,vatRate:14});
 const quote=deriveQuoteFromOrder({total:total.total,snapshot:{sector,options:[],package:{name:'Package',price:0},vatAmount:total.vatAmount,vatRate:14,total:total.total}});
 assert.equal(quote.items.find(item=>item.period==='yearly').unitPricePiasters,1665000);
 assert.equal(quote.totalPiasters,1898100);
});
