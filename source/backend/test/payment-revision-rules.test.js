import test from 'node:test';
import assert from 'node:assert/strict';
import {revisedBalance,revisionProposal,validateMethods,contractPdf,canCollect} from '../src/payment-revision-rules.js';
test('addition preserves previously collected funds',()=>assert.deepEqual(revisedBalance(1300000,500000),{totalPiasters:1300000,paidPiasters:500000,remainingPiasters:800000,creditPiasters:0}));
test('reduction produces customer credit',()=>assert.equal(revisedBalance(400000,500000).creditPiasters,100000));
test('schedule must reconcile',()=>{const input={items:[{label:'Development',quantity:1,unitPricePiasters:10000}],paidPiasters:4000,reason:'Add service',schedule:[{amountPiasters:6000,milestone:'Delivery'}]};assert.equal(revisionProposal(input).remainingPiasters,6000);assert.throws(()=>revisionProposal({...input,schedule:[]}));});
test('invalid money and duplicate methods rejected',()=>{assert.throws(()=>revisedBalance(-1,0));assert.throws(()=>validateMethods(['cash','cash']));});
test('PDF fingerprint checks format',()=>{assert.throws(()=>contractPdf(Buffer.from('not a PDF')));assert.match(contractPdf(Buffer.from('%PDF-1.7\n%%EOF')).sha256,/^[a-f0-9]{64}$/);});
test('collection requires approved contract, released invoice and allowed method',()=>{const valid={quoteStatus:'accepted',contractStatus:'signed',revisionPending:false,method:'wallet_direct',methods:['wallet_direct'],released:true,remainingPiasters:100};assert.equal(canCollect(valid),true);for(const change of [{contractStatus:'issued'},{revisionPending:true},{released:false},{remainingPiasters:0},{method:'cash'}])assert.equal(canCollect({...valid,...change}),false);});
