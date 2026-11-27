import test from 'node:test';
import assert from 'node:assert/strict';
import {extensionPricing,canActivate,submitExtension,activateExtension} from '../src/project-addon-requests.js';
import {commerceConfig,provisionCommerce,runtimeRequest} from '../src/commerce-admin.js';
const catalog=[{code:'extra_page',name:'صفحة',description:'',price:'690.00',pricing_type:'per_page'},{code:'workflow_automation',name:'Automation',description:'',price:'99.50',pricing_type:'monthly'}];
test('additional pages use canonical live price, existing VAT engine, five-page cap',()=>{
 const x=extensionPricing(catalog,[{code:'extra_page',quantity:3},{code:'workflow_automation',quantity:1}],14);
 assert.equal(x.totalPiasters,247323);
 assert.equal(x.vatPiasters,30373);
 assert.equal(x.billing.fixed,2070);
 assert.equal(x.billing.monthly,99.5);
 assert.equal(x.quoteItems[0].unitPricePiasters,69000);
 assert.throws(()=>extensionPricing(catalog,[{code:'extra_page',quantity:6}],14),/quantity/);
 assert.throws(()=>extensionPricing(catalog,[{code:'extra_page',quantity:1},{code:'extra_page',quantity:1}],14),/Duplicate/);
 assert.throws(()=>extensionPricing(catalog,[{code:'workflow_automation',quantity:2}],14),/quantity/);
 assert.throws(()=>extensionPricing(catalog,[{code:'fake',quantity:1}],14),/unavailable/);
});
test('activation requires signed accepted quote and complete verified payment equal to quote',()=>{
 const good={activated_at:null,quote_status:'accepted',signed:true,all_paid:true,total_piasters:'138000',invoiced:'138000',verified_paid:'138000'};
 assert.equal(canActivate(good),true);
 for(const patch of [{activated_at:'now'},{quote_status:'issued'},{signed:false},{all_paid:false},{verified_paid:100},{invoiced:100},{total_piasters:0}])assert.equal(canActivate({...good,...patch}),false);
});
const draftId='a',customer={id:'c',email:'client@test.example'};
function fake(handler){const calls=[];const client={query:async(sql,params)=>{calls.push({sql,params});return {rows:handler(sql,params)??[]}},release(){}};return {pool:{connect:async()=>client},calls}}
test('customer request persists canonical quote, does not activate or change original project',async()=>{
 const x=fake(sql=>sql.includes('JOIN customer_journey_projects')?[{id:draftId,status:'paid'}]:sql.includes('FROM shared_addons')?catalog:sql.includes('FROM site_settings')?[{vat_rate:14}]:sql.includes('INSERT INTO commercial_quotes')?[{id:101}]:sql.includes('INSERT INTO project_addon_requests')?[{id:'request',quote_id:101}]:[]);
 const selection=[{code:'extra_page',quantity:2}];
 const r=await submitExtension(x.pool,{draftId,customer,requestKey:'k',selection,expectedTotalPiasters:157320});
 assert.equal(r.quote_id,101);
 const quote=x.calls.find(c=>c.sql.includes('INSERT INTO commercial_quotes'));
 assert.equal(quote.params[1],'c');assert.equal(quote.params[3],157320);
 assert.equal(x.calls.some(c=>c.sql.includes('INSERT INTO customer_service_entitlements')),false);
 assert.equal(x.calls.at(-1).sql,'COMMIT');
});
test('reject tampered price and foreign/unpaid project, roll back',async()=>{
 const x=fake(sql=>sql.includes('JOIN customer_journey_projects')?[{id:draftId,status:'paid'}]:sql.includes('FROM shared_addons')?catalog:sql.includes('FROM site_settings')?[{vat_rate:14}]:[]);
 await assert.rejects(()=>submitExtension(x.pool,{draftId,customer,requestKey:'k',selection:[{code:'extra_page',quantity:1}],expectedTotalPiasters:1}),/price changed/);
 assert.equal(x.calls.at(-1).sql,'ROLLBACK');
 const y=fake(()=>[]);
 await assert.rejects(()=>submitExtension(y.pool,{draftId,customer,requestKey:'k',selection:[{code:'extra_page',quantity:1}],expectedTotalPiasters:69000}),/Project not found/);
 assert.deepEqual(y.calls.find(c=>c.sql.includes('JOIN customer_journey_projects')).params,[draftId,customer.id]);
});
test('activation creates one unique entitlement per page only after complete payment, with recurring expiry',async()=>{
 const row={id:'r',draft_id:draftId,quote_id:2,activated_at:null,quote_status:'accepted',signed:true,all_paid:true,total_piasters:1000,invoiced:1000,verified_paid:1000,items:extensionPricing(catalog,[{code:'extra_page',quantity:2},{code:'workflow_automation',quantity:1}],0).items};
 const x=fake(sql=>sql.includes('SELECT id,quote_id,activated_at')?[row]:sql.includes('SELECT r.id,r.draft_id')?[row]:sql.includes('SELECT customer_id FROM')?[{customer_id:'c'}]:sql.includes('JOIN customer_journey_projects')?[{id:'a',status:'paid'}]:[]);
 assert.equal((await activateExtension(x.pool,'r','admin@test.example')).activated,true);
 const writes=x.calls.filter(c=>c.sql.includes('INSERT INTO customer_service_entitlements'));
 assert.equal(writes.length,3);assert.equal(writes[0].params[5],'extension:r:1');assert.equal(writes[1].params[5],'extension:r:2');assert.equal(writes[2].params[6],'1 month');
 const unpaid=fake(sql=>sql.includes('SELECT id,quote_id,activated_at')?[row]:sql.includes('SELECT r.id,r.draft_id')?[{...row,verified_paid:1}]:[]);
 await assert.rejects(()=>activateExtension(unpaid.pool,'r','admin'),/full verified payment/);
 assert.equal(unpaid.calls.some(c=>c.sql.includes('INSERT INTO customer_service_entitlements')),false);
});
test('runtime provisioning uses paid project ownership, private config and no browser secret',async()=>{
 const config=commerceConfig({COMMERCE_RUNTIME_INTERNAL_URL:'http://commerce:3200',COMMERCE_PROVISION_SECRET:'x'.repeat(32),COMMERCE_RUNTIME_PUBLIC_URL:'https://shops.example.com'});
 assert.equal(config.publicOrigin,'https://shops.example.com');assert.equal(commerceConfig({COMMERCE_RUNTIME_INTERNAL_URL:'https://user:pass@host',COMMERCE_PROVISION_SECRET:'x'.repeat(32)}),null);
 let payload;
 const fetcher=async(url,options)=>{assert.equal(url.href,'http://commerce:3200/api/stores');assert.equal(options.headers.authorization,'Bearer '+'x'.repeat(32));payload=JSON.parse(options.body);return {ok:true,json:async()=>({store:{slug:'test'},token:'single-use-display'})}};
 const pool={query:async()=>({rows:[{id:'project',mode:'rent_monthly',status:'paid'}]})};
 await provisionCommerce(pool,config,{projectId:'project',name:'Test',slug:'test',theme:'fashion-canvas',shipping:500},fetcher);
 assert.equal(payload.mode,'rent_monthly');assert.equal(payload.projectId,'project');
 await assert.rejects(()=>provisionCommerce({query:async()=>({rows:[{id:'p',mode:'copy',status:'quoted'}]})},config,{projectId:'p'},fetcher),/paid project/);
 await assert.rejects(()=>runtimeRequest(null,'/api/stores'),/not configured/);
});
