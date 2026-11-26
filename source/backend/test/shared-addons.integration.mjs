import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import pg from "pg";
import {fileURLToPath} from "node:url";
import {readFile} from "node:fs/promises";

// Runs against an isolated test database only; all fixture changes roll back.
export async function verifySharedAddons(db){
  await db.query("BEGIN");
  try{
    const code="shared-test-"+randomUUID().slice(0,12);
    const first=(await db.query("INSERT INTO packages(name,price,is_published) VALUES('Test package A',100,true) RETURNING id")).rows[0];
    const initial=(await db.query("SELECT count(*)::int AS n FROM shared_addons")).rows[0].n;
    assert.ok(initial>=13);
    assert.equal((await db.query("SELECT count(*)::int AS n FROM package_options WHERE package_id=$1",[first.id])).rows[0].n,initial);
    const shared=(await db.query("INSERT INTO shared_addons(code,name,description,price,pricing_type) VALUES($1,'Test shared add-on','Test',123,'yearly') RETURNING id",[code])).rows[0];
    const rows=()=>db.query("SELECT o.id,o.package_id,o.price,o.is_active,o.visibility,u.amount FROM package_options o JOIN packages p ON p.id=o.package_id JOIN unified_price_items u ON u.scope='package_option' AND u.owner_key=o.package_id::text AND u.code=o.code WHERE o.code=$1 AND p.deleted_at IS NULL",[code]);
    const before=(await rows()).rows;
    assert.equal(before.length,(await db.query("SELECT count(*)::int AS n FROM packages WHERE deleted_at IS NULL")).rows[0].n);
    assert.ok(before.every(r=>Number(r.price)===123 && Number(r.amount)===123 && r.is_active&&r.visibility==="both"));
    const originalIds=new Map(before.map(r=>[r.package_id,r.id]));
    await db.query("UPDATE shared_addons SET price=456,name='Updated test',is_active=false WHERE id=$1",[shared.id]);
    const updated=(await rows()).rows;
    assert.ok(updated.every(r=>Number(r.price)===456&&Number(r.amount)===456&&!r.is_active&&originalIds.get(r.package_id)===r.id));
    const later=(await db.query("INSERT INTO packages(name,price,is_published) VALUES('Test package B',200,false) RETURNING id")).rows[0];
    let inherited=(await rows()).rows.find(r=>r.package_id===later.id);
    assert.equal(Number(inherited.price),456);assert.equal(inherited.is_active,false);
    await db.query("UPDATE packages SET is_published=true WHERE id=$1",[later.id]);
    await db.query("UPDATE shared_addons SET is_active=true WHERE id=$1",[shared.id]);
    inherited=(await rows()).rows.find(r=>r.package_id===later.id);
    assert.equal(inherited.is_active,true);assert.equal(Number(inherited.amount),456);
    const migration=await readFile(new URL("../db/shared_addons_20261126.sql",import.meta.url),"utf8");
    if(typeof db.exec==="function")await db.exec(migration);else await db.query(migration);
    const categoryMigration=await readFile(new URL("../db/addon_categories_20261126.sql",import.meta.url),"utf8");
    const runCategoryMigration=()=>typeof db.exec==="function"?db.exec(categoryMigration):db.query(categoryMigration);
    await runCategoryMigration();
    await db.query("UPDATE shared_addons SET category_code='marketing',sort_order=73 WHERE id=$1",[shared.id]);
    await db.query("UPDATE addon_categories SET sort_order=3 WHERE code='marketing'");
    await runCategoryMigration();
    const categorized=(await db.query("SELECT a.category_code,a.sort_order,a.price,c.sort_order AS category_sort_order FROM shared_addons a JOIN addon_categories c ON c.code=a.category_code WHERE a.id=$1",[shared.id])).rows[0];
    assert.equal(categorized.category_code,"marketing");
    assert.equal(categorized.sort_order,73);
    assert.equal(categorized.category_sort_order,3);
    assert.equal(Number(categorized.price),456);
    const after=(await rows()).rows;
    assert.equal(after.length,updated.length+1);
    assert.ok(after.every(r=>Number(r.price)===456&&r.is_active));
    assert.equal(after.find(r=>r.package_id===first.id).id,originalIds.get(first.id));
    console.log("PASS: central insert, package inheritance, price synchronization, disable, re-enable, restart reconciliation, stable option IDs and ledger");
  }finally{await db.query("ROLLBACK");}
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const client=new pg.Client({connectionString:process.env.TEST_DATABASE_URL||process.env.DATABASE_URL});
 await client.connect();try{await verifySharedAddons(client);}finally{await client.end();}
}
