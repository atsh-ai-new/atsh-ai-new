import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const server=readFileSync(new URL('../src/server.js',import.meta.url),'utf8');
const schema=readFileSync(new URL('../db/schema.sql',import.meta.url),'utf8');
const ui=readFileSync(new URL('../../src/app/admin/builder/page.tsx',import.meta.url),'utf8');
test('builder endpoints registered and protected by admin authorization',()=>{
 for(const path of ['/api/admin/builder/plans','/api/admin/builder/edits']){
  assert.ok(server.includes(path),path);
  assert.match(server.slice(server.indexOf(path),server.indexOf(path)+130),/requireAdmin/);
 }
});
test('builder tables and foreign key present in database schema',()=>{
 for(const name of ['project_builder_plans','project_visual_edits'])assert.ok(schema.includes('CREATE TABLE IF NOT EXISTS '+name));
 assert.match(schema,/REFERENCES project_builder_plans\(id\)/);
});
test('builder UI calls protected backend routes',()=>{
 assert.ok(ui.includes('`/api/admin/${path}`'));
 assert.ok(ui.includes("submit('builder/plans'"));
 assert.ok(ui.includes("submit('builder/edits'"));
});
test('existing modules remain registered',()=>{
 for(const marker of ['content-studio','customer_journey_projects','/api/orders','template'])assert.ok(server.includes(marker),marker);
});
