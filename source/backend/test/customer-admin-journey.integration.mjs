import test from "node:test";
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {randomUUID} from "node:crypto";
import bcrypt from "bcryptjs";
import pg from "pg";
import {readFile} from "node:fs/promises";
test("real customer login, concurrent submission and admin parity", {timeout:120000},async()=>{
 const db=process.env.TEST_DATABASE_URL;assert.ok(db);
 const pool=new pg.Pool({connectionString:db});
 const port=35000+Math.floor(Math.random()*1000),base="http://127.0.0.1:"+port,origin="https://example.test";
 const password="test-customer-password",adminPassword="test-admin-password";
 const adminHash=await bcrypt.hash(adminPassword,4);
 const child=spawn(process.execPath,["src/server.js"],{cwd:process.cwd(),env:{...process.env,DATABASE_URL:db,PORT:String(port),ADMIN_EMAIL:"admin@example.test",ADMIN_PASSWORD_HASH:adminHash,JWT_SECRET:"test-secret-at-least-32-characters-long",ALLOWED_ORIGINS:origin,PUBLIC_SITE_URL:origin,COOKIE_SECURE:"false"},stdio:["ignore","pipe","pipe"]});
 let output="";for(const stream of [child.stdout,child.stderr])stream.on("data",d=>output+=String(d).slice(0,3000));
 const api=async(path,method="GET",body,cookie)=>{const r=await fetch(base+path,{method,headers:{...(body?{"Content-Type":"application/json"}:{}),...(method!=="GET"?{Origin:origin}:{}),...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json(),cookie:r.headers.get("set-cookie")?.split(";")[0]};};
 try{
  let ready=false;for(let i=0;i<90;i++){if(child.exitCode!==null)break;try{const r=await fetch(base+"/api/catalog",{signal:AbortSignal.timeout(1000)});if(r.status<500){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}
  assert.ok(ready,"API failed to start: "+output.slice(-3000));
  // The server bootstraps the base schema; apply additive acceptance columns before HTTP assertions.
  await pool.query(await readFile(new URL("../db/project_acceptance_gate_20261123.sql",import.meta.url),"utf8"));
  await pool.query(await readFile(new URL("../db/notification_foundation_20261123.sql",import.meta.url),"utf8"));
  const email="journey-"+randomUUID()+"@example.test";
  await pool.query("INSERT INTO customer_accounts(name,email,password_hash,email_verified_at,is_active) VALUES($1,$2,$3,now(),true)",["Journey Test",email,await bcrypt.hash(password,4)]);
  const login=await api("/api/customer/auth/login","POST",{email,password});assert.equal(login.status,200,JSON.stringify(login.data));assert.ok(login.cookie);
  const draft={sectorSlug:"websites",sectorName:"مواقع",packageId:"test-package",businessName:"Test Business",requirements:"A complete test website",pages:7,bilingual:true,identity:"custom",contentMode:"writing",hosting:true,domainChoice:"new",maintenance:true,startWindow:"next month",contactWindow:"evening",stylePreference:"minimal",inspirationLinks:["https://example.test/reference"],compliance:"test requirements",logoName:"brand.svg",customerName:"Journey Test",customerEmail:email,customerPhone:"01012345678",optionQuantities:{page:7}};
  const created=await api("/api/customer/auth/project-drafts","POST",{title:"Journey Test Project",draft},login.cookie);assert.equal(created.status,201,JSON.stringify(created.data));
  const draftId=created.data.projectDraft.id;
  const submissions=await Promise.all(Array.from({length:8},()=>api("/api/customer/auth/project-drafts/"+draftId+"/submit","POST",undefined,login.cookie)));
  assert.equal(submissions.filter(x=>x.status===201).length,1,JSON.stringify(submissions));
  assert.equal(submissions.filter(x=>x.status===200).length,7,JSON.stringify(submissions));
  const ids=new Set(submissions.map(x=>x.data.projectId));assert.equal(ids.size,1);
  const projectId=[...ids][0];assert.ok(projectId);
  const count=await pool.query("SELECT count(*)::int AS n FROM customer_journey_projects WHERE id=$1",[projectId]);assert.equal(count.rows[0].n,1);
  const linked=await pool.query("SELECT linked_journey_id,draft FROM customer_project_drafts WHERE id=$1",[draftId]);assert.equal(linked.rows[0].linked_journey_id,projectId);assert.deepEqual(linked.rows[0].draft,draft);
  const admin=await api("/api/admin/login","POST",{email:"admin@example.test",password:adminPassword});assert.equal(admin.status,200,JSON.stringify(admin.data));assert.ok(admin.cookie);
  // Live support: real database and HTTP, two independent guest sessions.
  const start=await api("/api/visitor/live-support/start","POST");assert.equal(start.status,201);
  const second=await api("/api/visitor/live-support/start","POST");assert.equal(second.status,201);
  const token=start.data.token,thread=start.data.id;
  const support=async(path,method="GET",body,key=token,extra={})=>fetch(base+"/api/visitor/live-support/"+path,{method,headers:{Origin:origin,"x-support-token":key,...extra},body});
  let sr=await support("messages","POST",JSON.stringify({body:"Live support acceptance"}),token,{"Content-Type":"application/json"});assert.equal(sr.status,201,await sr.text());
  const inbox=await api("/api/admin/live-support","GET",undefined,admin.cookie);assert.equal(inbox.status,200);assert.ok(inbox.data.threads.some(t=>t.id===thread));
  const reply=await api("/api/admin/live-support/"+thread,"POST",{body:"Owner reply"},admin.cookie);assert.equal(reply.status,201);
  sr=await support("messages");assert.equal(sr.status,200);assert.deepEqual((await sr.json()).messages.map(m=>m.body),["Live support acceptance","Owner reply"]);
  sr=await support("messages","GET",undefined,second.data.token);assert.equal((await sr.json()).messages.length,0);
  sr=await support("messages","GET",undefined,"invalid");assert.equal(sr.status,401);
  sr=await support("messages/files","POST",Buffer.from("attachment-test"),token,{"Content-Type":"application/octet-stream","x-file-name":"test.txt"});assert.equal(sr.status,201);const file=(await sr.json()).message.file_id;assert.ok(file);
  sr=await support("messages/files/"+file);assert.equal(sr.status,200);assert.equal(await sr.text(),"attachment-test");
  sr=await support("messages/files/"+file,"GET",undefined,second.data.token);assert.equal(sr.status,404);
  sr=await fetch(base+"/api/admin/live-support/"+thread+"/files/"+file,{headers:{Cookie:admin.cookie}});assert.equal(sr.status,200);assert.equal(await sr.text(),"attachment-test");
  for(const filename of ["document.pdf","document.doc","document.docx"]){
   const bytes=Buffer.from("attachment-"+filename);
   sr=await support("messages/files","POST",bytes,token,{"Content-Type":"application/octet-stream","x-file-name":filename});assert.equal(sr.status,201);const uploaded=(await sr.json()).message;assert.equal(uploaded.filename,filename);
   const downloaded=await fetch(base+"/api/admin/live-support/"+thread+"/files/"+uploaded.file_id,{headers:{Cookie:admin.cookie}});assert.equal(downloaded.status,200);assert.deepEqual(Buffer.from(await downloaded.arrayBuffer()),bytes);
   const sent=await fetch(base+"/api/admin/live-support/"+thread+"/files",{method:"POST",headers:{Cookie:admin.cookie,Origin:origin,"Content-Type":"application/octet-stream","x-file-name":filename},body:bytes});assert.equal(sent.status,201);const replyFile=(await sent.json()).message;sr=await support("messages/files/"+replyFile.file_id);assert.equal(sr.status,200);assert.deepEqual(Buffer.from(await sr.arrayBuffer()),bytes);
  }
  const ping=await api("/api/admin/live-support-presence","POST",undefined,admin.cookie);assert.equal(ping.status,200);
  sr=await support("status");assert.equal((await sr.json()).online,true);
  const notices=await pool.query("SELECT count(*)::int AS n FROM platform_notifications WHERE recipient_id=$1 AND event_type='support.message'",["00000000-0000-4000-8000-000000000001"]);assert.ok(notices.rows[0].n>=2);
  const staffEmail="support-"+randomUUID()+"@example.test",otherEmail="other-"+randomUUID()+"@example.test";
  const staffHash=await bcrypt.hash(password,4);
  const staffRows=await pool.query("INSERT INTO team_members(email,display_name,role,password_hash,is_active) VALUES($1,'Support Test','viewer',$3,true),($2,'Other Test','viewer',$3,true) RETURNING id,email",[staffEmail,otherEmail,staffHash]);
  const staffId=staffRows.rows.find(x=>x.email===staffEmail).id;
  const staff=await api("/api/admin/login","POST",{email:staffEmail,password});assert.equal(staff.status,200);
  const other=await api("/api/admin/login","POST",{email:otherEmail,password});assert.equal(other.status,200);
  const assign=await api("/api/admin/live-support/"+thread+"/assignment","PUT",{assigned_to:staffId},admin.cookie);assert.equal(assign.status,200);
  const staffInbox=await api("/api/admin/live-support","GET",undefined,staff.cookie);assert.ok(staffInbox.data.threads.some(t=>t.id===thread));
  const otherInbox=await api("/api/admin/live-support","GET",undefined,other.cookie);assert.ok(!otherInbox.data.threads.some(t=>t.id===thread));
  const denied=await fetch(base+"/api/admin/live-support/"+thread,{headers:{Cookie:other.cookie}});assert.equal(denied.status,404);
  const staffReply=await api("/api/admin/live-support/"+thread,"POST",{body:"Assigned staff reply"},staff.cookie);assert.equal(staffReply.status,201);
  sr=await support("messages");assert.ok((await sr.json()).messages.some(m=>m.body==="Assigned staff reply"));
  const deniedAssign=await fetch(base+"/api/admin/live-support-assignment",{method:"PUT",headers:{Cookie:staff.cookie,Origin:origin,"Content-Type":"application/json"},body:JSON.stringify({assigned_to:null})});assert.equal(deniedAssign.status,403);
  sr=await support("messages","POST",JSON.stringify({body:"Assigned notification"}),token,{"Content-Type":"application/json"});assert.equal(sr.status,201);
  const staffNotices=await api("/api/admin/notifications","GET",undefined,staff.cookie);assert.ok(staffNotices.data.notifications.some(n=>n.event_type==="support.message"&&n.target_path==="/admin?view=messages&chat=support&thread="+thread));
  const detail=await api("/api/admin/journey/projects/"+projectId,"GET",undefined,admin.cookie);
  assert.equal(detail.status,200,JSON.stringify(detail.data));assert.equal(detail.data.project.id,projectId);assert.equal(detail.data.submittedDraft.id,draftId);assert.deepEqual(detail.data.submittedDraft.draft,draft);
  const retry=await api("/api/customer/auth/project-drafts/"+draftId+"/submit","POST",undefined,login.cookie);
  assert.equal(retry.status,200);assert.equal(retry.data.projectId,projectId);assert.equal(retry.data.alreadySubmitted,true);
  const edit=await api("/api/customer/auth/project-drafts/"+draftId,"PATCH",{expectedRevision:1,patch:{pages:100}},login.cookie);assert.equal(edit.status,409);
 }finally{child.kill("SIGTERM");await pool.end();}
});
