import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {effectivePermissions,hasPermission} from "../src/team-permissions.js";
const server=readFileSync(new URL("../src/server.js",import.meta.url),"utf8");
const schema=readFileSync(new URL("../db/schema.sql",import.meta.url),"utf8");
test("permission guard is installed on sensitive team, catalog and customer endpoints",()=>{
 for(const [path,key] of [["/api/admin/team","team"],["/api/admin/orders","customers"],["/api/admin/packages","products"],["/api/admin/pages","content"],["/api/admin/settings","settings"],["/api/admin/audit","audit"]]){
  const routes=server.split("\n").filter(line=>line.startsWith("app.")&&line.includes('"'+path+'"'));
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
