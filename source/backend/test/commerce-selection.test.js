import test from 'node:test';
import assert from 'node:assert/strict';
import {themes} from '../../commerce-engine/src/themes.js';
import ids from '../src/commerce-theme-ids.json' with {type:'json'};
import {validateCommerceSelection,canProvisionCommerce} from '../src/commerce-selection.js';
import {ensureOwnership} from '../src/product-ownership.js';
import {priceSectorSelection} from '../src/sector-pricing.js';
const draft={sectorSlug:'commerce-engine',source:'catalog',solutionType:'store',commerceTheme:'fashion-canvas',ownershipMode:'copy'};
test('store designs match runtime, require valid catalog design and ownership',()=>{
 assert.deepEqual(ids,themes.map(t=>t.id));assert.equal(ids.length,168);
 assert.equal(validateCommerceSelection(draft),draft);assert.ok(canProvisionCommerce(draft));
 for(const patch of [{commerceTheme:'unknown'},{source:'account'},{solutionType:'website'},{ownershipMode:undefined},{sectorSlug:'other'}])assert.throws(()=>validateCommerceSelection({...draft,...patch}));
 assert.equal(canProvisionCommerce({solutionType:'website'}),false);assert.equal(canProvisionCommerce({solutionType:'store'}),true);
});
test('no synthetic store tariff, and no sale before all four prices are approved',async()=>{
 let calls=0;const db={query:async()=>{calls++;return {rows:[]}}};
 assert.equal(await ensureOwnership(db,'sector','commerce-engine','Store',9999),null);assert.equal(calls,1);
 const item={slug:'commerce-engine',name:'Store',published:true,basePrice:0,pricedAddons:[]};
 assert.ok(priceSectorSelection([item],item.slug,[],{},'copy').needsCustomQuote);
 const ownershipPrices=Object.fromEntries(['rent','rent_monthly','copy','code'].map(m=>[m,{price:1000,period:m==='rent'?'yearly':m==='rent_monthly'?'monthly':'fixed'}]));
 assert.equal(priceSectorSelection([{...item,ownershipPrices}],item.slug,[],{},'copy').subtotal,1000);
 assert.ok(priceSectorSelection([{...item,ownershipPrices:{...ownershipPrices,rent:{price:0}}}],item.slug,[],{},'copy').needsCustomQuote);
});
