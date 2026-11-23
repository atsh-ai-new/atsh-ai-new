import test from 'node:test';
import assert from 'node:assert/strict';
import {canActivateProject,requestBucket,acceptanceUpdate} from '../src/project-acceptance-rules.js';
test('payment never substitutes for customer and admin approvals',()=>{
 for(const status of ['paid','building','preview_ready','approved']){
  assert.equal(canActivateProject({status,customerApprovedAt:null,adminApprovedAt:'2026-11-23'}),false);
  assert.equal(requestBucket({status,customerApprovedAt:'2026-11-23',adminApprovedAt:null}),'requests');
  assert.equal(requestBucket({status,customerApprovedAt:'2026-11-23',adminApprovedAt:'2026-11-23'}),'projects');
 }
});
test('archived projects never activate',()=>assert.equal(canActivateProject({status:'archived',customerApprovedAt:'x',adminApprovedAt:'x'}),false));
test('approval and withdrawal affect only actor own consent',()=>{
 assert.ok(acceptanceUpdate({actor:'customer',decision:'approve'}).customerApprovedAt);
 assert.deepEqual(acceptanceUpdate({actor:'admin',decision:'withdraw'}),{adminApprovedAt:null});
 assert.throws(()=>acceptanceUpdate({actor:'team',decision:'approve'}));
});
