import test from 'node:test';
import assert from 'node:assert/strict';
import {digestManifest,saveReviewDraft,approveReviewDraft,claimApprovedReviewDraft} from '../src/reviewed-draft-store.js';
const manifest={repo:'example-app',files:[{path:'README.md',content:'Hello world'},{path:'src/index.js',content:'console.log("hello")'}]};
test('digest is stable independent of file order',()=>assert.equal(digestManifest(manifest),digestManifest({...manifest,files:[...manifest.files].reverse()})));
test('digest changes if contents change',()=>assert.notEqual(digestManifest(manifest),digestManifest({...manifest,files:[{path:'README.md',content:'changed'},manifest.files[1]]})));
test('save writes immutable digest and awaiting review status',async()=>{const calls=[];const pool={query:async(...args)=>{calls.push(args);return {rowCount:1}}};const draft=await saveReviewDraft(pool,{jobId:'job1',manifest});assert.match(draft.digest,/^[a-f0-9]{64}$/);assert.equal(calls[0][1][5],'awaiting_review')});
test('approval rejects stale digest or already-approved draft',async()=>{const pool={query:async()=>({rowCount:0,rows:[]})};await assert.rejects(approveReviewDraft(pool,{jobId:'job1',draftId:'12345678-1234-1234-1234-123456789012',digest:'a'.repeat(64),reviewerId:'admin'}),/already reviewed/)});
test('claim is atomic and only returns approved rows',async()=>{const pool={query:async()=>({rows:[]})};assert.equal(await claimApprovedReviewDraft(pool,{jobId:'job1',draftId:'12345678-1234-1234-1234-123456789012',digest:'a'.repeat(64),approvedBy:'admin'}),null)});
