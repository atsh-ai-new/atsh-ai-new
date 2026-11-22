import test from 'node:test';
import assert from 'node:assert/strict';
import {journeyTaskCreate,journeyTaskUpdate,canManageJourneyTasks,canReadJourneyTasks,taskInboxScope} from '../src/journey-task-rules.js';

const id='11111111-1111-4111-8111-111111111111';
test('task creation trims title and defaults optional values',()=>{
 const r=journeyTaskCreate.parse({title:'  مراجعة التصميم  '});
 assert.equal(r.title,'مراجعة التصميم');
 assert.equal(r.description,'');
 assert.equal(r.assignedTo,null);
});
test('task creation rejects unknown keys and invalid assignees',()=>{
 assert.equal(journeyTaskCreate.safeParse({title:'Task',assignedTo:'not-uuid'}).success,false);
 assert.equal(journeyTaskCreate.safeParse({title:'Task',assignedTo:id,customerId:id}).success,false);
 assert.equal(journeyTaskCreate.safeParse({title:'x'}).success,false);
});
test('task update supports unassignment and each valid status',()=>{
 assert.deepEqual(journeyTaskUpdate.parse({assignedTo:null}),{assignedTo:null});
 for(const status of ['todo','in_progress','blocked','done'])assert.equal(journeyTaskUpdate.safeParse({status}).success,true);
 assert.equal(journeyTaskUpdate.safeParse({status:'delivered'}).success,false);
 assert.equal(journeyTaskUpdate.safeParse({}).success,false);
});
test('only owner and admin can manage tasks',()=>{
 for(const role of ['owner','admin'])assert.equal(canManageJourneyTasks(role),true);
 for(const role of ['sales','viewer','editor',undefined])assert.equal(canManageJourneyTasks(role),false);
});
test('task read roles do not include editor or unauthenticated users',()=>{
 for(const role of ['owner','admin','sales','viewer'])assert.equal(canReadJourneyTasks(role),true);
 for(const role of ['editor',undefined])assert.equal(canReadJourneyTasks(role),false);
});

test('personal task inbox scopes employees to their authenticated identity',()=>{
 const a='11111111-1111-4111-8111-111111111111';
 assert.deepEqual(taskInboxScope({role:'sales',userId:a}),{owner:false,userId:a});
 assert.deepEqual(taskInboxScope({role:'admin',userId:a}),{owner:false,userId:a});
 assert.deepEqual(taskInboxScope({role:'owner'}),{owner:true,userId:null});
 for(const identity of [{role:'sales'},{role:'viewer'},null,{}])assert.equal(taskInboxScope(identity),null);
});
