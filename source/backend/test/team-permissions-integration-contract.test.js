import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {effectivePermissions,hasPermission} from "../src/team-permissions.js";
const server=readFileSync(new URL("../src/server.js",import.meta.url),"utf8");
const schema=readFileSync(new URL("../db/schema.sql",import.meta.url),"utf8");
test("permission guard is installed on sensitive team, catalog and customer endpoints",()=>{
 for(const [path,key] of [["/api/admin/team","team"],["/api/admin/orders","customers"],["/api/admin/packages","products"],["/api/admin/pages","content"],["/api/admin/settings","settings"],["/api/admin/audit","audit"]]){
  const routes=server.split("\n").filter(line=>/^app\.(get|post|patch|put|delete)\(/.test(line)&&line.includes('"'+path+'"'));
  assert.ok(routes.length>0,path);
  assert.ok(routes.every(line=>line.includes('requirePermission("'+key+'")')),path);
 }
});
test("database stores permission overrides",()=>assert.match(schema,/permission_overrides jsonb/));
test("member grants are enforced by the permission evaluator",()=>{
 const member=effectivePermissions("viewer",{customers:true});
 assert.equal(hasPermission("viewer",member,"customers"),true);
 assert.equal(hasPermission("viewer",member,"team"),false);
});
test("role guards must not block a separately granted permission",()=>{
 const route=server.split("\n").find(line=>line.startsWith('app.post("/api/admin/packages"'));
 assert.ok(route);
 assert.ok(!route.includes('requireRole('),"legacy role guard still blocks per-member grants");
});

test("explicit team read grants work independently of role, but mutations remain owner-only",()=>{
 const routes=server.split("\n");
 const read=routes.find(line=>line.startsWith('app.get("/api/admin/team",'));
 assert.ok(read.includes('requirePermission("team")'));
 assert.ok(!read.includes("requireRole("));
 for(const method of ["post","patch","delete"]){
  const mutations=routes.filter(line=>line.startsWith('app.'+method+'("/api/admin/team'));
  assert.ok(mutations.length);
  assert.ok(mutations.every(line=>line.includes('requireRole("owner")')&&line.includes('requirePermission("team")')));
 }
 assert.equal(hasPermission("viewer",effectivePermissions("viewer",{team:true}),"team"),true);
});

test("permission override validation accepts one explicit boolean without requiring every key",()=>{
 const routes=server.split("\n");
 const validators=routes.filter(line=>line.includes("permissions:z.partialRecord("));
 assert.equal(validators.length,2);
});
