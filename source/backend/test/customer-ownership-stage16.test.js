import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('../src/customer-auth.js',import.meta.url),'utf8');
const migration=readFileSync(new URL('../db/customer_auth_stage16.sql',import.meta.url),'utf8');
test('project listing uses verified account identity, never email',()=>{
 assert.match(src,/WHERE customer_account_id=\$1 ORDER BY/);
 assert.doesNotMatch(src,/WHERE lower\(customer_email\)=\$1/);
});
test('claim requires valid access token and email match, and revokes token',()=>{
 assert.match(src,/router.post\('\/projects\/claim'/);
 assert.match(src,/row\.token_hash!==hash\(p\.data\.accessToken\)/);
 assert.match(src,/row\.customer_email\.toLowerCase\(\)!==req\.customer\.email\.toLowerCase\(\)/);
 assert.match(src,/UPDATE customer_journey_access SET revoked_at=now\(\)/);
});
test('migration never auto-assigns projects by email',()=>{
 assert.match(migration,/ADD COLUMN IF NOT EXISTS customer_account_id/);
 assert.doesNotMatch(migration,/UPDATE customer_journey_projects/);
});
