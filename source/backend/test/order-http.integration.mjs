import test from "node:test";
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {randomUUID} from "node:crypto";
import pg from "pg";

const db=process.env.TEST_DATABASE_URL;
test("real HTTP POST /api/orders is idempotent under concurrent retries", {timeout:120000},async()=>{
  assert.ok(db,"TEST_DATABASE_URL required");
  const pool=new pg.Pool({connectionString:db});
  const port=34000+Math.floor(Math.random()*1000);
  const base=`http://127.0.0.1:${port}`;
  const child=spawn(process.execPath,["src/server.js"],{cwd:process.cwd(),env:{...process.env,DATABASE_URL:db,PORT:String(port),ADMIN_EMAIL:"admin@example.test",ADMIN_PASSWORD_HASH:"test-only-hash",JWT_SECRET:"test-secret-at-least-32-characters-long",ALLOWED_ORIGINS:"https://example.test",PUBLIC_SITE_URL:"https://example.test"},stdio:["ignore","pipe","pipe"]});
  let output="";
  child.stdout.on("data",d=>{output+=String(d).slice(0,3000);});
  child.stderr.on("data",d=>{output+=String(d).slice(0,3000);});
  try{
    let ready=false;
    for(let i=0;i<90;i++){
      if(child.exitCode!==null)break;
      try{const r=await fetch(base+"/api/catalog",{signal:AbortSignal.timeout(1000)});if(r.status<500){ready=true;break;}}catch{}
      await new Promise(resolve=>setTimeout(resolve,500));
    }
    assert.ok(ready,`API failed to start: ${output.slice(-3000)}`);
    const pkg=await pool.query("INSERT INTO packages(name,description,price,is_published) VALUES('HTTP test package','isolated CI',100,true) RETURNING id");
    const key=randomUUID();
    const body={packageId:pkg.rows[0].id,optionIds:[],customerName:"Test Customer",phone:"01012345678",email:"test@example.test",notes:"concurrency test"};
    const send=(payload,keyValue=key)=>fetch(base+"/api/orders",{method:"POST",headers:{"Content-Type":"application/json","Idempotency-Key":keyValue},body:JSON.stringify(payload)}).then(async r=>({status:r.status,data:await r.json()}));
    const responses=await Promise.all(Array.from({length:12},()=>send(body)));
    assert.equal(responses.filter(r=>r.status===201).length,1,JSON.stringify(responses));
    assert.equal(responses.filter(r=>r.status===200).length,11,JSON.stringify(responses));
    const ids=new Set(responses.map(r=>r.data.order?.id));
    assert.equal(ids.size,1);
    const saved=await pool.query("SELECT count(*)::int AS n FROM orders WHERE package_id=$1",[body.packageId]);
    assert.equal(saved.rows[0].n,1);
    const mismatched=await send({...body,notes:"changed request"});
    assert.equal(mismatched.status,409);
    const missing=await fetch(base+"/api/orders",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    assert.equal(missing.status,400);
    const fresh=await send(body,randomUUID());
    assert.equal(fresh.status,201);
    const after=await pool.query("SELECT count(*)::int AS n FROM orders WHERE package_id=$1",[body.packageId]);
    assert.equal(after.rows[0].n,2,"different key must allow a legitimate repeat order");
  }finally{
    child.kill("SIGTERM");
    await pool.end();
  }
});
