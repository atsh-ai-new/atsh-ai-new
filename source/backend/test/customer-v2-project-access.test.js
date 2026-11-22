import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const auth=readFileSync(new URL('../src/customer-auth.js',import.meta.url),'utf8');
const server=readFileSync(new URL('../src/server.js',import.meta.url),'utf8');

test('customer project detail enforces account ownership',()=>{
 const section=auth.split("router.get('/projects/:id'")[1]?.split("router.post('/logout'")[0]||'';
 assert.match(section,/customer_account_id=\$2/);
 assert.match(section,/customer_journey_messages/);
 assert.match(section,/Cache-Control/);
});
test('admin reply and notification outbox commit together',()=>{
 const section=server.split('app.post("/api/admin/journey/projects/:id/messages"')[1]?.split('// Internal project tasks:')[0]||'';
 assert.match(section,/BEGIN/);
 assert.match(section,/queueJourneyEvent/);
 assert.match(section,/COMMIT/);
 assert.match(section,/ROLLBACK/);
});
test('customer messages are restricted to their own linked draft',()=>{
 const section=auth.split("router.get('/project-drafts/:id/messages'")[1]?.split("router.get('/project-drafts/:id'")[0]||'';
 assert.match(section,/d.customer_id=\$2/);
 assert.match(section,/req.customer.id/);
});
