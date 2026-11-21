import test from 'node:test';
import assert from 'node:assert/strict';
import {createCustomerJourneyProject} from '../src/customer-project-service.js';

test('shared project creator persists customer identity and returns project id',async()=>{
 const calls=[];
 const client={query:async(sql,params)=>{calls.push({sql,params});return {rows:[{id:'project-1',status:'draft'}]};}};
 const project=await createCustomerJourneyProject(client,{customerName:'Customer project',customerEmail:'test@example.com',customerAccountId:'customer-1',createdBy:'customer-portal'});
 assert.deepEqual(project,{id:'project-1',status:'draft'});
 assert.match(calls[0].sql,/INSERT INTO customer_journey_projects/);
 assert.deepEqual(calls[0].params,['Customer project','test@example.com',null,'customer-portal','customer-1','draft']);
});
test('shared project creator rejects incomplete identity before database writes',async()=>{
 let called=false;
 const client={query:async()=>{called=true;}};
 await assert.rejects(()=>createCustomerJourneyProject(client,{customerName:'',customerAccountId:'customer-1',createdBy:'customer-portal'}),/requires identity/);
 assert.equal(called,false);
});
