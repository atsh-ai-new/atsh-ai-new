import test from 'node:test';
import assert from 'node:assert/strict';
import {generateForReview,deliverApprovedDraft} from '../src/reviewed-delivery-orchestrator.js';
const digest='a'.repeat(64),commit='b'.repeat(40);
const request={jobId:'job_1',repo:'demo-app',specification:'Build a complete original demo application.'};
const manifest={repo:'demo-app',files:[{path:'index.js',content:'hello'}]};
test('generation stops at approval gate',async()=>{
 const result=await generateForReview(request,{generate:async()=>manifest,saveDraft:async()=>({draftId:'draft_1',digest})});
 assert.equal(result.status,'awaiting_review');
});
test('cannot deliver without a matching approval',async()=>{
 let published=false;
 await assert.rejects(deliverApprovedDraft({jobId:'job_1',draftId:'draft_1',digest,approvedBy:'admin'}, {
 loadApprovedDraft:async()=>({approved:false}),publish:async()=>{published=true;},runTests:async()=>{},deployPreview:async()=>{},recordStage:async()=>{}
 }),/Approval mismatch/);
 assert.equal(published,false);
});
test('successful approved pipeline requests preview only after passing tests',async()=>{
 const stages=[],calls=[];
 const result=await deliverApprovedDraft({jobId:'job_1',draftId:'draft_1',digest,approvedBy:'admin'}, {
 loadApprovedDraft:async()=>({approved:true,digest,approvedBy:'admin',repo:'demo-app',manifest}),
 publish:async()=>{calls.push('publish');return {completed:true};},
 runTests:async()=>{calls.push('test');return {passed:true,commit};},
 deployPreview:async()=>{calls.push('preview');},recordStage:async(s)=>stages.push(s.status)
 });
 assert.equal(result.status,'preview_requested');assert.deepEqual(calls,['publish','test','preview']);
 assert.deepEqual(stages,['publishing','testing','preview_requested']);
});
test('failed tests block preview',async()=>{
 let preview=false;const stages=[];
 const result=await deliverApprovedDraft({jobId:'job_1',draftId:'draft_1',digest,approvedBy:'admin'}, {
 loadApprovedDraft:async()=>({approved:true,digest,approvedBy:'admin',repo:'demo-app',manifest}),
 publish:async()=>({completed:true}),runTests:async()=>({passed:false}),
 deployPreview:async()=>{preview=true;},recordStage:async(s)=>stages.push(s.status)
 });
 assert.equal(result.status,'tests_failed');assert.equal(preview,false);assert.ok(stages.includes('tests_failed'));
});
test('incomplete Forgejo publish blocks tests and preview',async()=>{
 let tested=false;
 await assert.rejects(deliverApprovedDraft({jobId:'job_1',draftId:'draft_1',digest,approvedBy:'admin'}, {
 loadApprovedDraft:async()=>({approved:true,digest,approvedBy:'admin',repo:'demo-app',manifest}),
 publish:async()=>({completed:false}),runTests:async()=>{tested=true;},deployPreview:async()=>{},recordStage:async()=>{}
 }),/incomplete/);assert.equal(tested,false);
});
