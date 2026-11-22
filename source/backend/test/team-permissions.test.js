import test from "node:test";
import assert from "node:assert/strict";
import { effectivePermissions, hasPermission, permissionKeys } from "../src/team-permissions.js";

test("role defaults are least privilege", () => {
  const sales = effectivePermissions("sales", null);
  assert.equal(sales.customers, true);
  for (const key of permissionKeys.filter(k => k !== "customers")) assert.equal(sales[key], false);
  assert.equal(effectivePermissions("viewer", null).team, false);
});

test("individual grants and revocations override role defaults", () => {
  const changed = effectivePermissions("editor", { content: false, customers: true });
  assert.equal(changed.content, false);
  assert.equal(changed.customers, true);
  assert.equal(changed.assistant, true);
  assert.equal(hasPermission("editor", changed, "content"), false);
  assert.equal(hasPermission("editor", changed, "customers"), true);
});

test("owner access cannot be revoked by override", () => {
  const owner = effectivePermissions("owner", { team: false, settings: false });
  for (const key of permissionKeys) assert.equal(hasPermission("owner", owner, key), true);
});

test("unknown or malformed overrides cannot grant access", () => {
  assert.equal(effectivePermissions("viewer", { team: "true", __proto__: { team: true } }).team, false);
  assert.equal(effectivePermissions("viewer", ["team"]).team, false);
  assert.equal(hasPermission("viewer", null, "team"), false);
});
