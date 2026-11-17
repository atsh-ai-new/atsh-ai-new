import pg from "pg";
import jwt from "jsonwebtoken";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {signInternalPaymentEvent} from "../src/payment-webhook.js";
const origin="http://127.0.0.1:3017",base="http://127.0.0.1:3017";
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
const ownerToken=jwt.sign({role:"owner",email:"ci-owner@example.test"},process.env.JWT_SECRET,{issuer:"atsh-ai-api",audience:"atsh-admin",expiresIn:"10m"});
async function req(path,{method="GET",cookie="",body}={}){
 const response=await fetch(base+path,{method,headers:{origin,cookie,...(body!==undefined?{"content-type":"application/json"}:{})},body:body===undefined?undefined:JSON.stringify(body),redirect:"manual"});
 const result=await response.json().catch(()=>({}));
 return {status:response.status,result};
}
try{
 const suffix=randomUUID().slice(0,8);
 const accountA=randomUUID(),accountB=randomUUID();
 await pool.query("INSERT INTO customer_accounts(id,name,email,password_hash,email_verified_at) VALUES($1,'Client A',$2,'ci-salted-not-for-login',now()),($3,'Client B',$4,'ci-salted-not-for-login',now())",[accountA,`first-${suffix}@example.test`,accountB,`second-${suffix}@example.test`]);
 const cookieFor=id=>`atsh_customer=${jwt.sign({sub:id,kind:"customer",ver:0},process.env.JWT_SECRET,{issuer:"atsh-ai-api",audience:"atsh-customer",expiresIn:"10m"})}`;
 const adminCookie=`atsh_admin=${ownerToken}`;
 // Owner creates, versions and archives a contract template; historical signed snapshots are immutable.
 let v=await req("/api/admin/commercial/contracts/templates",{method:"POST",cookie:adminCookie,body:{title:"اشتراك مُدار تجريبي",body:"العقد الأصلي بنطاق خدمة مُدار وتوصيف مبدئي لحقوق العميل.",category:"managed_monthly",isPublished:true}});
 assert.equal(v.status,201,JSON.stringify(v));
 const templateId=v.result.template.id;
 const initialBody="العقد الأصلي بنطاق خدمة مُدار وتوصيف مبدئي لحقوق العميل.";
 assert.equal(v.result.template.revision,1);
 const quote=await pool.query("INSERT INTO commercial_quotes(customer_email,items,total_piasters,status) VALUES($1,'[]'::jsonb,10000,'issued') RETURNING id",[`first-${suffix}@example.test`]);
 let issued=await req("/api/admin/commercial/contracts/issue",{method:"POST",cookie:adminCookie,body:{quoteId:quote.rows[0].id,templateId}});
 assert.equal(issued.status,201,JSON.stringify(issued));
 v=await req(`/api/admin/commercial/contracts/templates/${templateId}`,{method:"PATCH",cookie:adminCookie,body:{expectedRevision:1,title:"اشتراك مُدار تجريبي",body:"عقد محدث للعميل الجديد، ولا يؤثر مطلقًا على العقد الأصلي الذي سبق إصداره.",category:"managed_monthly",isPublished:true,isArchived:false}});
 assert.equal(v.status,200,JSON.stringify(v));assert.equal(v.result.template.revision,2);
 const conflict=await req(`/api/admin/commercial/contracts/templates/${templateId}`,{method:"PATCH",cookie:adminCookie,body:{expectedRevision:1,title:"قديم",body:"محاولة كتابة قديمة لا يجب قبولها ولا إعادة الكتابة.",category:"general",isPublished:true}});
 assert.equal(conflict.status,409);
 const snapshot=await pool.query("SELECT body_snapshot,template_revision,template_category FROM customer_contracts WHERE id=$1",[issued.result.contract.id]);
 assert.equal(snapshot.rows[0].body_snapshot,initialBody);
 assert.equal(snapshot.rows[0].template_revision,1);
 assert.equal(snapshot.rows[0].template_category,"managed_monthly");
 const versions=await req(`/api/admin/commercial/contracts/templates/${templateId}/versions`,{cookie:adminCookie});
 assert.equal(versions.status,200);assert.equal(versions.result.versions.length,2);
 // Two projects are isolated to one account; stale writes and cross-account reads are denied.
 const one=await req("/api/customer/auth/project-drafts",{method:"POST",cookie:cookieFor(accountA),body:{title:"Project One",draft:{sectorSlug:"eyadaty"}}});
 const two=await req("/api/customer/auth/project-drafts",{method:"POST",cookie:cookieFor(accountA),body:{title:"Project Two",draft:{sectorSlug:"avocato"}}});
 assert.equal(one.status,201,JSON.stringify(one));assert.equal(two.status,201,JSON.stringify(two));
 assert.notEqual(one.result.projectDraft.id,two.result.projectDraft.id);
 const id=one.result.projectDraft.id;
 const forbidden=await req(`/api/customer/auth/project-drafts/${id}`,{cookie:cookieFor(accountB)});
 assert.equal(forbidden.status,404);
 const updated=await req(`/api/customer/auth/project-drafts/${id}`,{method:"PATCH",cookie:cookieFor(accountA),body:{expectedRevision:1,patch:{businessName:"عيادتي الجديدة"}}});
 assert.equal(updated.status,200,JSON.stringify(updated));assert.equal(Number(updated.result.projectDraft.revision),2);
 const stale=await req(`/api/customer/auth/project-drafts/${id}`,{method:"PATCH",cookie:cookieFor(accountA),body:{expectedRevision:1,patch:{businessName:"بيانات قديمة"}}});
 assert.equal(stale.status,409);
 const preview=await req(`/api/customer/auth/project-drafts/${id}/previews`,{method:"POST",cookie:cookieFor(accountA),body:{}});
 assert.equal(preview.status,201,JSON.stringify(preview));
 const decision=await req(`/api/customer/auth/project-drafts/${id}/previews/${preview.result.preview.id}/decision`,{method:"POST",cookie:cookieFor(accountA),body:{decision:"approved",comment:"موافق على المعاينة التجريبية"}});
 assert.equal(decision.status,200,JSON.stringify(decision));
 const repeated=await req(`/api/customer/auth/project-drafts/${id}/previews/${preview.result.preview.id}/decision`,{method:"POST",cookie:cookieFor(accountA),body:{decision:"approved",comment:"تكرار"}});
 assert.equal(repeated.status,409);
 // Signed settlement bridge: reject unsigned, duplicate and excessive payments.
 const invoice=await pool.query("INSERT INTO commercial_invoices(quote_id,amount_piasters) VALUES($1,10000) RETURNING id",[quote.rows[0].id]);
 const gatewayEvent={invoiceId:Number(invoice.rows[0].id),amountPiasters:4000,providerReference:"integration-"+randomUUID(),paidAt:new Date().toISOString(),status:"settled"};
 const gatewayRaw=Buffer.from(JSON.stringify(gatewayEvent));
 const gatewayTimestamp=Math.floor(Date.now()/1000).toString();
 const gatewayUrl=base+"/api/internal/verified-payments";
 let response=await fetch(gatewayUrl,{method:"POST",headers:{"content-type":"application/json"},body:gatewayRaw});
 assert.equal(response.status,401,"Unsigned gateway event must fail");
 const postGateway=async(raw,eventTime=gatewayTimestamp)=>{
  const signature=signInternalPaymentEvent({raw,secret:process.env.ATSH_VERIFIED_PAYMENT_SECRET,timestamp:eventTime});
  const response=await fetch(gatewayUrl,{method:"POST",headers:{"content-type":"application/json","x-atsh-timestamp":eventTime,"x-atsh-signature":signature},body:raw});
  return {status:response.status,body:await response.json()};
 };
 const settled=await postGateway(gatewayRaw);
 assert.equal(settled.status,201,JSON.stringify(settled));
 const duplicate=await postGateway(gatewayRaw);
 assert.equal(duplicate.status,200,JSON.stringify(duplicate));assert.equal(duplicate.body.duplicate,true);
 const excessive=await postGateway(Buffer.from(JSON.stringify({...gatewayEvent,amountPiasters:7000,providerReference:"integration-"+randomUUID()})));
 assert.equal(excessive.status,409);
 const staleTime=Math.floor((Date.now()-700000)/1000).toString();
 const stalePayment=await postGateway(gatewayRaw,staleTime);
 assert.equal(stalePayment.status,401);
 const finalPayment=await postGateway(Buffer.from(JSON.stringify({...gatewayEvent,amountPiasters:6000,providerReference:"integration-"+randomUUID()})));
 assert.equal(finalPayment.status,201,JSON.stringify(finalPayment));
 const paid=await pool.query("SELECT status,verified_paid_piasters FROM commercial_invoices WHERE id=$1",[invoice.rows[0].id]);
 assert.equal(paid.rows[0].status,"paid");assert.equal(Number(paid.rows[0].verified_paid_piasters),10000);
 const other=await req(`/api/customer/auth/project-drafts/${two.result.projectDraft.id}`,{cookie:cookieFor(accountA)});
 assert.equal(other.status,200);assert.equal(other.result.projectDraft.draft.sectorSlug,"avocato");
 console.log("PASS: contract revisions, immutable issuance, owner authorization, project isolation, conflict detection, customer preview approval and signed payment settlement");
}finally{await pool.end();}
