import test from 'node:test';
import assert from 'node:assert/strict';
import {submissionDecision} from '../src/customer-v2/submission-decision.js';

test('submitted draft returns its existing project regardless of later draft edits',()=>{
 assert.deepEqual(submissionDecision({linked_journey_id:'project-123',draft:{}}),{kind:'existing',projectId:'project-123'});
});
test('missing, invalid, and valid drafts have distinct decisions',()=>{
 assert.deepEqual(submissionDecision(null),{kind:'missing'});
 assert.deepEqual(submissionDecision({linked_journey_id:null,draft:{}}),{kind:'invalid',code:'PROJECT_REQUIREMENTS_INCOMPLETE'});
 assert.deepEqual(submissionDecision({linked_journey_id:null,draft:{projectMode:'custom',requirements:'Build an appointment portal'}}),{kind:'create'});
});
