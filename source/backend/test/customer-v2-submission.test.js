import test from 'node:test';
import assert from 'node:assert/strict';
import {validateCustomerSubmission} from '../src/customer-v2/submission-contract.js';

test('customer submission contract accepts a package, sector, or complete custom brief',()=>{
 for(const draft of [{packageId:'pkg-1'},{sectorSlug:'clinic'},{projectMode:'custom',requirements:'Build a booking application'}]) assert.equal(validateCustomerSubmission(draft).ok,true);
});
test('customer submission contract rejects empty, incomplete, and malformed drafts',()=>{
 for(const draft of [null,{},[],{packageId:' '},{sectorSlug:' '},{projectMode:'custom',requirements:' '},{projectMode:'custom',requirements:42}]){
  assert.deepEqual(validateCustomerSubmission(draft),{ok:false,code:'PROJECT_REQUIREMENTS_INCOMPLETE'});
 }
});
