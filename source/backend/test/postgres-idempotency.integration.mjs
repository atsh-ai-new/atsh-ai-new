import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {randomUUID} from "node:crypto";
import pg from "pg";

const pool=new pg.Pool({connectionString:process.env.TEST_DATABASE_URL});
const migration=readFileSync(new URL("../db/order_submission_idempotency_stage54.sql",import.meta.url),"utf8");

test("PostgreSQL serializes simultaneous retries into one order and one project",async()=>{
  await pool.query("CREATE EXTENSION IF NOT EXISTS pgcrypto");
  await pool.query("CREATE TABLE orders (id uuid PRIMARY KEY DEFAULT gen_random_uuid())");
  await pool.query("CREATE TABLE projects_test (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid UNIQUE NOT NULL REFERENCES orders(id))");
  await pool.query(migration);
  const key=randomUUID(),hash="same-request";
  async function submit(){
    const client=await pool.connect();
    try{
      await client.query("BEGIN");
      await client.query("INSERT INTO order_submission_keys(submission_key,request_hash) VALUES($1,$2) ON CONFLICT(submission_key) DO NOTHING",[key,hash]);
      const current=await client.query("SELECT request_hash,response_payload FROM order_submission_keys WHERE submission_key=$1 FOR UPDATE",[key]);
      assert.equal(current.rows[0].request_hash,hash);
      if(current.rows[0].response_payload){await client.query("COMMIT");return current.rows[0].response_payload;}
      const order=await client.query("INSERT INTO orders DEFAULT VALUES RETURNING id");
      const project=await client.query("INSERT INTO projects_test(order_id) VALUES($1) RETURNING id",[order.rows[0].id]);
      const response={order:{id:order.rows[0].id,projectId:project.rows[0].id}};
      await client.query("UPDATE order_submission_keys SET order_id=$2,response_payload=$3 WHERE submission_key=$1",[key,order.rows[0].id,JSON.stringify(response)]);
      await client.query("COMMIT");
      return response;
    }catch(e){await client.query("ROLLBACK");throw e;}finally{client.release();}
  }
  try{
    const results=await Promise.all(Array.from({length:12},submit));
    assert.ok(results.every(x=>JSON.stringify(x)===JSON.stringify(results[0])));
    assert.equal((await pool.query("SELECT count(*)::int AS n FROM orders")).rows[0].n,1);
    assert.equal((await pool.query("SELECT count(*)::int AS n FROM projects_test")).rows[0].n,1);
    assert.equal((await pool.query("SELECT count(*)::int AS n FROM order_submission_keys WHERE order_id IS NOT NULL")).rows[0].n,1);
    const c=await pool.connect();
    try{await c.query("BEGIN");await c.query("SELECT request_hash FROM order_submission_keys WHERE submission_key=$1 FOR UPDATE",[key]);const r=await c.query("SELECT request_hash FROM order_submission_keys WHERE submission_key=$1",[key]);assert.notEqual(r.rows[0].request_hash,"different-request");await c.query("COMMIT");}finally{c.release();}
  }finally{await pool.end();}
});
