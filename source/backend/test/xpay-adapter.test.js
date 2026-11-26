import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {xpayConfig,verifyXpaySignature,createXpaySession,retrieveXpaySession,verifiedTestPayment} from '../src/xpay-adapter.js';
const secret='whsec_example_test_only';
const key='sk_test_example_test_only';
const now=1730000000000;
const timestamp=String(now/1000);
const raw=Buffer.from(JSON.stringify({type:'checkout.session.completed',data:{object:{id:'cs_test_Ab123'}}}));
const signature='t='+timestamp+',v1='+createHmac('sha256',secret).update(timestamp+'.').update(raw).digest('hex');
test('sandbox disabled by default and live credentials rejected',()=>{
 assert.equal(xpayConfig({}),null);
 assert.throws(()=>xpayConfig({XPAY_ENABLED:'true',XPAY_SECRET_KEY:'sk_live_example',XPAY_WEBHOOK_SECRET:secret}));
 assert.deepEqual(xpayConfig({XPAY_ENABLED:'true',XPAY_SECRET_KEY:key,XPAY_WEBHOOK_SECRET:secret}),{key,secret});
});
test('valid signature only; altered payload, replay and duplicate fields denied',()=>{
 assert.equal(verifyXpaySignature(raw,signature,secret,now),true);
 assert.equal(verifyXpaySignature(Buffer.from('changed'),signature,secret,now),false);
 assert.equal(verifyXpaySignature(raw,signature,secret,now+301000),false);
 assert.equal(verifyXpaySignature(raw,signature+',t='+timestamp,secret,now),false);
});
const args={key,invoiceId:1,amountPiasters:12345,attemptId:'attempt123',returnUrl:'https://atsh-ai.com/account/checkout/1'};
const open={id:'cs_test_Ab123',currency:'EGP',amountTotal:12345,status:'open',url:'https://checkout.xpay.app/c/cs_test_Ab123'};
test('checkout uses server amount, idempotency key, hosted origin and test credentials',async()=>{
 let calls=0;
 const result=await createXpaySession({...args,fetcher:async(url,opts)=>{
  calls++;assert.equal(url,'https://api.xpay.app/checkout/sessions');
  assert.equal(opts.headers.Authorization,'Bearer '+key);
  assert.equal(opts.headers['Idempotency-Key'],args.attemptId);
  const body=JSON.parse(opts.body);assert.equal(body.lineItems[0].priceData.unitAmount,12345);
  return {ok:true,json:async()=>open};
 }});
 assert.equal(calls,1);assert.equal(result.id,open.id);assert.equal(result.url,open.url);
});
test('checkout rejects unexpected currency, amount, origin and session mode',async()=>{
 for(const override of [{currency:'USD'},{amountTotal:1},{url:'https://example.org'},{id:'cs_live_Ab123'}]){
  await assert.rejects(createXpaySession({...args,fetcher:async()=>({ok:true,json:async()=>({...open,...override})})}));
 }
 await assert.rejects(createXpaySession({...args,returnUrl:'https://example.org',fetcher:async()=>assert.fail('must not call provider')}));
});
test('settlement requires exact test session and amount, completion and paid status',()=>{
 const attempt={sessionId:open.id,amountPiasters:12345};
 const session={...open,status:'complete',paymentStatus:'paid'};
 assert.deepEqual(verifiedTestPayment(session,attempt),{provider:'xpay_test',reference:open.id,amountPiasters:12345});
 for(const override of [{currency:'USD'},{amountTotal:100},{status:'open'},{paymentStatus:'unpaid'},{id:'cs_live_Ab123'}])assert.equal(verifiedTestPayment({...session,...override},attempt),null);
});
test('retrieval rejects live mode before contacting network',async()=>{
 await assert.rejects(retrieveXpaySession({key,sessionId:'cs_live_Ab123',fetcher:async()=>assert.fail('must not call provider')}));
});
