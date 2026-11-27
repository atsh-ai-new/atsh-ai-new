import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import {portraitInput,workerAuthorized,registerPortraitRoutes,portraitCancelSQL} from "../src/portrait-worker.js";

const secret="a".repeat(64), id="00000000-0000-4000-8000-000000000001";
// Minimal dimension-valid WebP header; no decode occurs in the backend.
const b=Buffer.alloc(30); b.write("RIFF",0);b.writeUInt32LE(22,4);b.write("WEBPVP8X",8);const image=b.toString("base64");
const valid=()=>({scenes:[{seconds:8,caption:"",motion:"static"}],animation:{cast:[{id:"c",artwork:{images:[{pose:"stand",image}]},voice:{engine:"tiny-ar-msa",pitch:0,speed:1,intonation:1}}],shots:[{sceneIndex:0,placements:[{characterId:"c",pose:"stand"}],dialogue:[{speakerId:"c",text:"مرحبًا",pronunciation:"",start:.3}]}],music:false,subtitles:false,speechVolume:1}});
test("only a scoped authenticated workstation can access the queue",()=>{
  assert.equal(workerAuthorized("Bearer "+secret,secret),true);
  for(const x of ["",secret,"Bearer "+"b".repeat(64),"Bearer x",null])assert.equal(workerAuthorized(x,secret),false);
  assert.equal(workerAuthorized("Bearer "+secret,""),false);
});
test("portrait payload preserves the photo, timing and local voice settings",()=>{
  assert.deepEqual(portraitInput(valid()),{image,seconds:8,start:.3,speechVolume:1,voice:{text:"مرحبًا",pronunciation:"",pitch:0,speed:1,intonation:1}});
});
test("unsupported layers, motion, multiple faces in the plan, and invalid timing fail explicitly",()=>{
  for(const mutate of [p=>p.animation.cast.push(p.animation.cast[0]),p=>p.scenes[0].caption="عنوان",p=>p.animation.music=true,p=>p.animation.subtitles=true,p=>p.animation.shots[0].props=[{}],p=>p.animation.shots[0].artwork={},p=>p.animation.shots[0].placements[0].pose="walk",p=>p.animation.shots[0].dialogue[0].text="x",p=>p.animation.shots[0].dialogue[0].start=8,p=>p.animation.cast[0].artwork.images[0].image="bad"]){const p=valid();mutate(p);assert.throws(()=>portraitInput(p));}
});
test("cancellation revokes the callback token only for portrait jobs",()=>{
  assert.match(portraitCancelSQL,/'_jobToken'/);
  assert.match(portraitCancelSQL,/'portrait_queued','portrait_running'/);
  assert.match(portraitCancelSQL,/status='generating'/);
});
test("HTTP routes enforce admin and worker auth, queue transaction, atomic claim, and heartbeat",async()=>{
  const old={};for(const [k,v] of Object.entries({PORTRAIT_WORKER_TOKEN:secret,CHARACTER_SERVICE_URL:"http://localhost:1",CHARACTER_SERVICE_TOKEN:"test"})){old[k]=process.env[k];process.env[k]=v;}
  const calls=[];
  const client={query:async(sql,args)=>{calls.push({sql,args});return sql.startsWith("SELECT")?{rowCount:1,rows:[{status:"reviewed",production_plan:valid()}]}:{rowCount:1,rows:[]}},release(){}};
  const pool={connect:async()=>client,query:async(sql,args)=>{calls.push({sql,args});return {rowCount:0,rows:[]}}};
  const app=express();app.use(express.json());
  registerPortraitRoutes(app,{pool,auth:[(req,res,next)=>{if(req.get("x-test-admin")!=="yes")return res.status(403).end();req.admin={email:"test@example.invalid"};next();}],route:f=>(req,res,next)=>Promise.resolve(f(req,res,next)).catch(next),rateLimit:()=> (_req,_res,next)=>next(),auditChange:async()=>{}});
  const server=app.listen(0,"127.0.0.1");
  await new Promise(resolve=>server.once("listening",resolve));
  const url="http://127.0.0.1:"+server.address().port;
  const admin="/api/admin/content-studio",worker="/api/integrations/portrait-worker";
  const post=(path,headers={},body={})=>fetch(url+path,{method:"POST",headers:{"content-type":"application/json",...headers},body:JSON.stringify(body)});
  try{
    assert.equal((await fetch(url+admin+"/portrait/status")).status,403);
    assert.equal((await post(worker+"/claim")).status,401);
    assert.equal((await post(admin+"/"+id+"/portrait")).status,403);
    const status=await (await fetch(url+admin+"/portrait/status",{headers:{"x-test-admin":"yes"}})).json();
    assert.equal(status.configured,true);assert.equal(status.online,false);
    assert.equal((await post(admin+"/"+id+"/portrait",{"x-test-admin":"yes"})).status,202);
    assert.ok(calls.some(c=>c.sql.includes("FOR UPDATE")));
    assert.ok(calls.some(c=>c.sql.includes("portrait_queued")));
    assert.equal((await post(worker+"/claim",{authorization:"Bearer "+secret})).status,204);
    assert.ok(calls.some(c=>c.sql.includes("FOR UPDATE SKIP LOCKED")));
    assert.equal((await post(worker+"/heartbeat",{authorization:"Bearer "+secret},{id,jobToken:secret})).status,409);
    assert.ok(calls.some(c=>c.sql.includes("portrait_running")&&c.sql.includes("'_jobToken'=$2")));
    assert.equal((await (await fetch(url+admin+"/portrait/status",{headers:{"x-test-admin":"yes"}})).json()).online,true);
  }finally{await new Promise(resolve=>server.close(resolve));for(const [k,v] of Object.entries(old)){if(v===undefined)delete process.env[k];else process.env[k]=v;}}
});
