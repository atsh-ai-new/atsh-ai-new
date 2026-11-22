import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const server=readFileSync(new URL("../src/server.js",import.meta.url),"utf8");
const auth=readFileSync(new URL("../src/customer-auth.js",import.meta.url),"utf8");

test("draft submission serializes by owned draft and returns the existing journey id",()=>{
  const section=auth.split("router.post('/project-drafts/:id/submit'")[1]?.split("router.get('/project-drafts/:id/messages'")[0]||"";
  assert.match(section,/FOR UPDATE/);
  assert.match(section,/if\(item\.linked_journey_id\)/);
  assert.match(section,/alreadySubmitted:true/);
  assert.match(section,/await client\.query\('COMMIT'\)/);
});

test("priced order serializes linked draft and rejects a second submission",()=>{
  const section=server.split('app.post("/api/orders"')[1]?.split('app.post("/api/admin/password-reset/request"')[0]||"";
  assert.match(section,/SELECT id,linked_journey_id FROM customer_project_drafts[^\n]*FOR UPDATE/);
  assert.match(section,/if\(ownedDraft\.rows\[0\]\.linked_journey_id\)/);
  assert.match(section,/customer_journey_order_links/);
});

test("admin detail retrieves the exact linked customer draft",()=>{
  const section=server.split('app.get("/api/admin/journey/projects/:id"')[1]?.split('app.post("/api/admin/journey/projects/:id/messages"')[0]||"";
  assert.match(section,/FROM customer_project_drafts WHERE linked_journey_id=\$1/);
  assert.match(section,/submittedDraft:drafts\.rows\[0\]\|\|null/);
});

test("unlinked order has an idempotency barrier before INSERT INTO orders",()=>{
  const section=server.split('app.post("/api/orders"')[1]?.split('app.post("/api/admin/password-reset/request"')[0]||"";
  const insertion=section.indexOf("INSERT INTO orders(");
  assert.ok(insertion>0);
  const before=section.slice(0,insertion);
  assert.match(before,/INSERT INTO order_submission_keys/);
  assert.match(before,/FOR UPDATE/);
  assert.match(before,/existing\.rows\[0\]\.response_payload/);
  assert.match(section,/UPDATE order_submission_keys SET order_id=/);
});

test("order submission migration persists unique keys and the committed order response",()=>{
  const sql=readFileSync(new URL("../db/order_submission_idempotency_stage54.sql",import.meta.url),"utf8");
  assert.match(sql,/submission_key uuid PRIMARY KEY/);
  assert.match(sql,/request_hash text NOT NULL/);
  assert.match(sql,/order_id uuid REFERENCES orders\(id\)/);
  assert.match(sql,/response_payload jsonb/);
});
