import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('../src/customer-auth.js',import.meta.url),'utf8');
const migration=readFileSync(new URL('../db/customer_auth_stage16.sql',import.meta.url),'utf8');
test('project listing uses verified account identity, never email',()=>{
 assert.match(src,/WHERE customer_account_id=\$1 ORDER BY/);
 assert.doesNotMatch(src,/WHERE lower\(customer_email\)=\$1/);
});
test('retired access-code routes cannot claim or expose projects',()=>{
 const server=readFileSync(new URL('../src/server.js',import.meta.url),'utf8');
 assert.doesNotMatch(src,/router\.post\('\/projects\/claim'/);
 assert.doesNotMatch(server,/app\.(get|post|delete)\("\/api\/(customer\/journey|admin\/journey\/projects\/:id\/customer-access)/);
 assert.match(server,/DELETE FROM customer_journey_access/);
});
test('migration never auto-assigns projects by email',()=>{
 assert.match(migration,/ADD COLUMN IF NOT EXISTS customer_account_id/);
 assert.doesNotMatch(migration,/UPDATE customer_journey_projects/);
});
