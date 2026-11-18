// Staging/CI ONLY. Proves credentials + content survive a second backend startup
// against the SAME PostgreSQL database. No secrets are logged.
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {randomUUID} from "node:crypto";
import bcrypt from "bcryptjs";
import pg from "pg";

const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
const original="http://127.0.0.1:3017";
const restarted="http://127.0.0.1:3018";
const allowedOrigin=original;
const suffix=randomUUID().slice(0,12);
const ownerPassword="ci-owner-override-"+suffix;
const staffPassword="ci-staff-password-"+suffix;
const staffEmail=`ci-staff-${suffix}@example.test`;
const marker=`ci-cms-persistence-${suffix}`;
async function request(base,path,{method="GET",body,cookie}={}){
 const response=await fetch(base+path,{method,headers:{Origin:allowedOrigin,...(body!==undefined?{"Content-Type":"application/json"}:{}),...(cookie?{Cookie:cookie}:{})},
   ...(body!==undefined?{body:JSON.stringify(body)}:{}),redirect:"manual"});
 const payload=await response.json().catch(()=>({}));
 return {status:response.status,payload,headers:response.headers};
}
function cookieOf(response){
 const value=response.headers.get("set-cookie")?.split(";")[0]||"";
 assert.match(value,/^atsh_admin=/);
 return value;
}
let child,logs="";
try{
 // The production admin credentials are not touched: these are isolated CI DB accounts.
 const ownerHash=await bcrypt.hash(ownerPassword,10);
 const staffHash=await bcrypt.hash(staffPassword,10);
 await pool.query(`INSERT INTO owner_password_overrides(id,password_hash,updated_at)
 VALUES(1,$1,now()) ON CONFLICT(id) DO UPDATE SET password_hash=EXCLUDED.password_hash,updated_at=now()`,[ownerHash]);
 await pool.query(`INSERT INTO team_members(email,display_name,role,password_hash,is_active)
 VALUES($1,'CI Persisted Editor','editor',$2,true)`,[staffEmail,staffHash]);

 const firstLogin=await request(original,"/api/admin/login",{method:"POST",body:{email:process.env.ADMIN_EMAIL,password:ownerPassword}});
 assert.equal(firstLogin.status,200,"Owner override login must work before restart");
 const session=cookieOf(firstLogin);
 const save=await request(original,"/api/admin/pages/persistence-probe",{method:"PATCH",cookie:session,body:{locale:"ar",isPublished:false,content:{title:"اختبار حفظ لوحة الإدارة",marker}}});
 assert.equal(save.status,200,JSON.stringify(save.payload));
 const before=await pool.query("SELECT content,updated_by FROM site_pages WHERE slug='persistence-probe' AND locale='ar'");
 assert.equal(before.rows[0].content.marker,marker);
 assert.equal(before.rows[0].updated_by,process.env.ADMIN_EMAIL);

 // A second isolated API process runs every SQL migration again. No database recreation.
 child=spawn(process.execPath,["src/server.js"],{cwd:process.cwd(),env:{...process.env,PORT:"3018"},stdio:["ignore","pipe","pipe"]});
 for(const stream of [child.stdout,child.stderr])stream.on("data",chunk=>{logs=(logs+chunk.toString()).slice(-6000);});
 let healthy=false;
 for(let i=0;i<80;i++){
   if(child.exitCode!==null)break;
   try{const x=await fetch(restarted+"/api/health",{signal:AbortSignal.timeout(900)});if(x.ok){healthy=true;break;}}catch{}
   await new Promise(resolve=>setTimeout(resolve,250));
 }
 assert.ok(healthy,"The same database must survive repeat startup migrations. "+logs.replace(/postgres(?:ql)?:\/\/[^\s]+/gi,"[db-url]"));
 const ownerLoginAfter=await request(restarted,"/api/admin/login",{method:"POST",body:{email:process.env.ADMIN_EMAIL,password:ownerPassword}});
 assert.equal(ownerLoginAfter.status,200,"Owner password override was changed after startup");
 const staffLoginAfter=await request(restarted,"/api/admin/login",{method:"POST",body:{email:staffEmail,password:staffPassword}});
 assert.equal(staffLoginAfter.status,200,"Staff login was lost after startup");
 const pages=await request(restarted,"/api/admin/pages",{cookie:cookieOf(ownerLoginAfter)});
 assert.equal(pages.status,200);
 const saved=pages.payload.pages?.find(page=>page.slug==="persistence-probe"&&page.locale==="ar");
 assert.equal(saved?.content?.marker,marker,"Admin CMS update disappeared after restarting API");
 const savedAfter=await pool.query("SELECT content,updated_by FROM site_pages WHERE slug='persistence-probe' AND locale='ar'");
 assert.equal(savedAfter.rows[0].content.marker,marker);
 console.log("PASS: same-database API restart preserves owner override, staff access and admin CMS edits");
}finally{
 if(child&&!child.killed)child.kill("SIGTERM");
 // Test DB is disposable. Cleanup only the temporary CI records, never a real account.
 await pool.query("DELETE FROM site_pages WHERE slug='persistence-probe' AND content->>'marker'=$1",[marker]).catch(()=>undefined);
 await pool.query("DELETE FROM team_members WHERE email=$1",[staffEmail]).catch(()=>undefined);
 await pool.end();
}
