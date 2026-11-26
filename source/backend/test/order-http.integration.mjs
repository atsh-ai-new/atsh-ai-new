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
    // 45 actual selectable shared entries in an isolated database; production drafts remain untouched.
    const codes=Array.from({length:45},(_,i)=>"http_test_"+i);
    await pool.query("INSERT INTO shared_addons(code,name,price,pricing_type,is_active) SELECT code,code,10,'fixed',true FROM unnest($1::text[]) code",[codes]);
    const options=(await pool.query("SELECT id,code FROM package_options WHERE package_id=$1 AND code=ANY($2::text[])",[body.packageId,codes])).rows;
    assert.equal(options.length,45);
    const large=await send({...body,optionIds:options.map(x=>x.id)},randomUUID());
    assert.equal(large.status,201,JSON.stringify(large));
    const snapshot=(await pool.query("SELECT snapshot FROM orders WHERE id=$1",[large.data.order.id])).rows[0].snapshot;
    assert.equal(snapshot.options.length,45);
    assert.equal(snapshot.subtotal,550);
    const sector={slug:"http-test-sector",name:"HTTP Test Sector",published:true,basePrice:300,pricedAddons:[]};
    await pool.query("UPDATE site_pages SET content=jsonb_set(content,'{items}',$1::jsonb) WHERE slug='catalog' AND locale='ar'",[JSON.stringify([sector])]);
    const quoteResponse=await fetch(base+"/api/sector-price?slug="+sector.slug+"&addons="+codes.join(","));
    const quote=await quoteResponse.json();
    assert.equal(quoteResponse.status,200,JSON.stringify(quote));
    assert.equal(quote.items.length,46);
    assert.equal(quote.subtotal,750);
    const sectorOrder=await send({...body,sectorSlug:sector.slug,sectorAddonCodes:codes},randomUUID());
    assert.equal(sectorOrder.status,201,JSON.stringify(sectorOrder));
    const sectorSnapshot=(await pool.query("SELECT snapshot FROM orders WHERE id=$1",[sectorOrder.data.order.id])).rows[0].snapshot;
    assert.equal(sectorSnapshot.sector.items.length,46);
    assert.equal(sectorSnapshot.subtotal,850);
    await pool.query("UPDATE shared_addons SET is_active=false WHERE code=$1",[codes[0]]);
    assert.equal((await send({...body,optionIds:options.map(x=>x.id)},randomUUID())).status,400);
    assert.equal((await send({...body,sectorSlug:sector.slug,sectorAddonCodes:codes},randomUUID())).status,400);
  }finally{
    child.kill("SIGTERM");
    await pool.end();
  }
});
