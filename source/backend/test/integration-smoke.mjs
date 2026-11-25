import pg from "pg";
import jwt from "jsonwebtoken";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {signInternalPaymentEvent} from "../src/payment-webhook.js";
import {deliverJourneyEvents} from "../src/customer-event-outbox.js";
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
 // Empty database bootstraps only clearly labeled demos, from the SAME persisted CMS table.
 const starter=await req("/api/site-content/catalog");
 assert.equal(starter.status,200);
 assert.equal(starter.result.page?.slug,"catalog");
 assert.equal(starter.result.page?.content?.items?.length,4);
 assert.equal(starter.result.page?.content?.sectors?.length,3);
 assert.ok(starter.result.page.content.items.every(x=>x.published===true&&x.basePrice===null));
 const readiness=await req("/api/admin/integrations/status",{cookie:`atsh_admin=${ownerToken}`});
 assert.equal(readiness.status,200,JSON.stringify(readiness));
 assert.equal(readiness.result.catalog.total,4);
 assert.equal(readiness.result.catalog.visible,4);
 assert.equal(readiness.result.domains.configured,true);
 assert.equal(readiness.result.domains.mode,"rdap-registry");
 assert.equal(readiness.result.gpt.configured,false);
 assert.equal(readiness.result.registration.ready,false);
 const unauthorizedStatus=await req("/api/admin/integrations/status");
 assert.equal(unauthorizedStatus.status,401);
 const badSignup=await req("/api/customer/auth/register",{method:"POST",body:{name:"CI Customer",email:`signup-${suffix}@example.test`,password:"password-long-ci-12345"}});
 assert.equal(badSignup.status,503,"Registration requires an actual verified-email provider");
 const unsent=await pool.query("SELECT count(*)::int AS n FROM customer_accounts WHERE email=$1",[`signup-${suffix}@example.test`]);
 assert.equal(unsent.rows[0].n,0,"No unusable unverified account should be persisted when email provider is missing");
 const resendUnavailable=await req("/api/customer/auth/verification/resend",{method:"POST",body:{email:`signup-${suffix}@example.test`}});
 assert.equal(resendUnavailable.status,503);
 const domainCheck=await req("/api/domains/check?domain=example.com");
 assert.equal(domainCheck.status,200,"RDAP fallback should respond without registrar credentials");

 await pool.query("INSERT INTO customer_accounts(id,name,email,password_hash,email_verified_at) VALUES($1,'Client A',$2,'ci-salted-not-for-login',now()),($3,'Client B',$4,'ci-salted-not-for-login',now())",[accountA,`first-${suffix}@example.test`,accountB,`second-${suffix}@example.test`]);
 const cookieFor=id=>`atsh_customer=${jwt.sign({sub:id,kind:"customer",ver:0},process.env.JWT_SECRET,{issuer:"atsh-ai-api",audience:"atsh-customer",expiresIn:"10m"})}`;
 const adminCookie=`atsh_admin=${ownerToken}`;
 const chatA=randomUUID(),chatB=randomUUID(),chatC=randomUUID();
 for(const [id,name] of [[chatA,"Chat A"],[chatB,"Chat B"],[chatC,"Chat C"]])await pool.query("INSERT INTO team_members(id,email,display_name,role,password_hash,is_active) VALUES($1,$2,$3,'viewer','ci-test',true)",[id,id+"@example.test",name]);
 const teamCookie=id=>"atsh_admin="+jwt.sign({role:"viewer",userId:id,email:id+"@example.test"},process.env.JWT_SECRET,{issuer:"atsh-ai-api",audience:"atsh-admin",expiresIn:"10m"});
 const chatPath="/api/admin/internal-chat/";
 assert.equal((await req(chatPath+"contacts")).status,401);
 assert.equal((await req(chatPath+"contacts",{cookie:cookieFor(accountA)})).status,401);
 assert.equal((await req(chatPath+"contacts",{cookie:teamCookie(chatA)})).status,200);
 const sentChat=await req(chatPath+chatB,{method:"POST",cookie:teamCookie(chatA),body:{body:"CI private message"}});
 assert.equal(sentChat.status,201,JSON.stringify(sentChat));
 const receivedChat=await req(chatPath+chatA,{cookie:teamCookie(chatB)});
 assert.equal(receivedChat.status,200);assert.ok(receivedChat.result.messages.some(m=>m.body==="CI private message"));
 const isolatedChat=await req(chatPath+chatA,{cookie:teamCookie(chatC)});
 assert.equal(isolatedChat.status,200);assert.equal(isolatedChat.result.messages.length,0);
 assert.equal((await pool.query("SELECT count(*)::int AS n FROM platform_notifications WHERE recipient_id=$1 AND event_type='internal.message'",[chatB])).rows[0].n,1);
 const chatProject=(await pool.query("INSERT INTO customer_journey_projects(customer_name,customer_email,created_by) VALUES('CI chat','chat@example.test','ci') RETURNING id")).rows[0].id;
 await pool.query("INSERT INTO customer_journey_tasks(project_id,title,assigned_to,created_by,updated_by) VALUES($1,'CI task',$2,'ci','ci')",[chatProject,chatA]);
 const groupPath="/api/admin/internal-groups/"+chatProject;
 assert.equal((await req(groupPath,{cookie:teamCookie(chatC)})).status,404);
 assert.equal((await req(groupPath,{method:"POST",cookie:teamCookie(chatC),body:{body:"forbidden"}})).status,404);
 const groupSent=await req(groupPath,{method:"POST",cookie:adminCookie,body:{body:"CI group message"}});
 assert.equal(groupSent.status,201,JSON.stringify(groupSent));
 const groupReceived=await req(groupPath,{cookie:teamCookie(chatA)});
 assert.equal(groupReceived.status,200);assert.ok(groupReceived.result.messages.some(m=>m.body==="CI group message"));
 assert.equal((await pool.query("SELECT count(*)::int AS n FROM platform_notifications WHERE recipient_id=$1 AND project_id=$2 AND event_type='internal.group'",[chatA,chatProject])).rows[0].n,1);
 await pool.query("DELETE FROM customer_journey_projects WHERE id=$1",[chatProject]);
 assert.equal((await pool.query("SELECT count(*)::int AS n FROM internal_project_messages WHERE project_id=$1",[chatProject])).rows[0].n,0);
 await pool.query("UPDATE team_members SET is_active=false WHERE id=$1",[chatA]);
 assert.equal((await req(chatPath+"contacts",{cookie:teamCookie(chatA)})).status,401);

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
 // Exact order → customer project → approved preview → commercial quote → versioned contract.
 const journey=await pool.query(`INSERT INTO customer_journey_projects(customer_name,customer_email,created_by,customer_account_id)
   VALUES('Client A',$1,'integration-test',$2) RETURNING id`,[`first-${suffix}@example.test`,accountA]);
 await pool.query("UPDATE customer_project_drafts SET linked_journey_id=$1 WHERE id=$2",[journey.rows[0].id,id]);
 const packageId="11111111-1111-4111-8111-111111111111";
 const originalSnapshot={package:{name:"موقع صفحة واحدة",price:1000},options:[],sector:null,
  subtotal:1000,vatRate:14,vatAmount:140,total:1140,currency:"EGP"};
 const ownedOrder=await pool.query(`INSERT INTO orders(reference,customer_name,phone,email,notes,package_id,currency,subtotal,vat_rate,vat_amount,total,snapshot)
   VALUES($1,'Client A','01000000000',$2,'test',$3,'EGP',1000,14,140,1140,$4::jsonb) RETURNING id`,
   [`CI-${randomUUID().slice(0,12)}`,`first-${suffix}@example.test`,packageId,JSON.stringify(originalSnapshot)]);
 await pool.query("INSERT INTO customer_journey_order_links(project_id,order_id,linked_by) VALUES($1,$2,'integration-test')",[journey.rows[0].id,ownedOrder.rows[0].id]);
 const derived=await req(`/api/admin/commercial/orders/${ownedOrder.rows[0].id}/quote`,{method:"POST",cookie:adminCookie,body:{}});
 assert.equal(derived.status,201,JSON.stringify(derived));
 assert.equal(Number(derived.result.quote.total_piasters),114000);
 const duplicatedQuote=await req(`/api/admin/commercial/orders/${ownedOrder.rows[0].id}/quote`,{method:"POST",cookie:adminCookie,body:{}});
 assert.equal(duplicatedQuote.status,409);
 const approvedToIssue=await req(`/api/admin/commercial/quotes/${derived.result.quote.id}/issue`,{method:"POST",cookie:adminCookie,body:{}});
 assert.equal(approvedToIssue.status,200,JSON.stringify(approvedToIssue));
 const issueNew=await req("/api/admin/commercial/contracts/issue",{method:"POST",cookie:adminCookie,body:{quoteId:Number(derived.result.quote.id),templateId}});
 assert.equal(issueNew.status,201,JSON.stringify(issueNew));
 const newlyIssued=await pool.query("SELECT template_revision,body_snapshot FROM customer_contracts WHERE id=$1",[issueNew.result.contract.id]);
 assert.equal(newlyIssued.rows[0].template_revision,2);
 assert.match(newlyIssued.rows[0].body_snapshot,/عقد محدث/);
 // Signed quote + fully paid invoice gates actual journey paid state.
 const reviewLink=await req(`/api/admin/commercial/quotes/${derived.result.quote.id}/review-link`,{method:"POST",cookie:adminCookie,body:{}});
 assert.equal(reviewLink.status,201,JSON.stringify(reviewLink));
 const customerSigned=await req(`/api/commercial/review/${reviewLink.result.reviewToken}/accept-and-sign`,{method:"POST",body:{signerName:"Client A Verified",consent:true}});
 assert.equal(customerSigned.status,200,JSON.stringify(customerSigned));
 const statusBefore=await pool.query("SELECT status FROM customer_journey_projects WHERE id=$1",[journey.rows[0].id]);
 assert.equal(statusBefore.rows[0].status,"payment_pending");
 // Acceptance automatically issues the pending invoice. A duplicate would block full settlement.
 const targetInvoice=await pool.query("SELECT id,amount_piasters,status FROM commercial_invoices WHERE quote_id=$1 ORDER BY id",[derived.result.quote.id]);
 assert.equal(targetInvoice.rowCount,1,"Contract acceptance creates exactly one unpaid invoice");
 assert.equal(Number(targetInvoice.rows[0].amount_piasters),114000);
 assert.equal(targetInvoice.rows[0].status,"unpaid");
 const eventFor=(amountPiasters,reference)=>Buffer.from(JSON.stringify({invoiceId:Number(targetInvoice.rows[0].id),amountPiasters,providerReference:reference,paidAt:new Date().toISOString(),status:"settled"}));
 const bridge=async(raw)=>{
  const timestamp=Math.floor(Date.now()/1000).toString();
  const signed=signInternalPaymentEvent({raw,secret:process.env.ATSH_VERIFIED_PAYMENT_SECRET,timestamp});
  const response=await fetch(base+"/api/internal/verified-payments",{method:"POST",headers:{"content-type":"application/json","x-atsh-timestamp":timestamp,"x-atsh-signature":signed},body:raw});
  return {status:response.status,result:await response.json()};
 };
 const partialBridge=await bridge(eventFor(50000,"ci-partial-"+randomUUID()));
 assert.equal(partialBridge.status,201,JSON.stringify(partialBridge));
 const during=await pool.query("SELECT status FROM customer_journey_projects WHERE id=$1",[journey.rows[0].id]);
 assert.equal(during.rows[0].status,"payment_pending","Partial payment must not allow delivery");
 const settledBridge=await bridge(eventFor(64000,"ci-rest-"+randomUUID()));
 assert.equal(settledBridge.status,201,JSON.stringify(settledBridge));
 const after=await pool.query("SELECT status FROM customer_journey_projects WHERE id=$1",[journey.rows[0].id]);
 assert.equal(after.rows[0].status,"paid");
 // Checkout: authenticated ownership, customer change request and staff resolution.
 const ownedQuote=await pool.query(`INSERT INTO commercial_quotes(customer_email,customer_account_id,status,items,total_piasters,currency,valid_until)
   VALUES($1,$2,'issued',$3::jsonb,22500,'EGP',now()+interval '12 days') RETURNING id`,
   [`first-${suffix}@example.test`,accountA,JSON.stringify([{label:"نظام إدارة أعمال مخصص",quantity:1,unitPricePiasters:22500}])]);
 const ownedQuoteId=Number(ownedQuote.rows[0].id);
 const ownedContract=await req("/api/admin/commercial/contracts/issue",{method:"POST",cookie:adminCookie,body:{quoteId:ownedQuoteId,templateId}});
 assert.equal(ownedContract.status,201,JSON.stringify(ownedContract));
 const otherAccountCheckout=await req(`/api/customer/commercial/quotes/${ownedQuoteId}/checkout`,{cookie:cookieFor(accountB)});
 assert.equal(otherAccountCheckout.status,404,"Cross-customer quote access must be denied");
 const ownedCheckout=await req(`/api/customer/commercial/quotes/${ownedQuoteId}/checkout`,{cookie:cookieFor(accountA)});
 assert.equal(ownedCheckout.status,200,JSON.stringify(ownedCheckout));
 assert.equal(ownedCheckout.result.payment.canPayOnline,false);
 const change=await req(`/api/customer/commercial/quotes/${ownedQuoteId}/request-changes`,{
   method:"POST",cookie:cookieFor(accountA),body:{details:"أحتاج توضيحًا حول رسوم الصيانة السنوية وشروط الخدمة."}});
 assert.equal(change.status,201,JSON.stringify(change));
 const acceptPayload={signerName:"Client A Verified",consent:true,quoteRevision:1,contractId:Number(ownedContract.result.contract.id)};
 const blocked=await req(`/api/customer/commercial/quotes/${ownedQuoteId}/accept`,{method:"POST",cookie:cookieFor(accountA),body:acceptPayload});
 assert.equal(blocked.status,409,"Pending changes block acceptance");
 const resolved=await req(`/api/admin/commercial/change-requests/${change.result.changeRequest.id}/resolve`,{
   method:"POST",cookie:adminCookie,body:{resolutionNote:"تم توضيح نطاق الصيانة في العقد الحالي؛ لا تغيير في البنود."}});
 assert.equal(resolved.status,200,JSON.stringify(resolved));
 const acceptedOwned=await req(`/api/customer/commercial/quotes/${ownedQuoteId}/accept`,{method:"POST",cookie:cookieFor(accountA),body:acceptPayload});
 assert.equal(acceptedOwned.status,200,JSON.stringify(acceptedOwned));
 assert.equal(acceptedOwned.result.paymentStatus,"pending_gateway");
 const afterAcceptance=await req(`/api/customer/commercial/quotes/${ownedQuoteId}/checkout`,{cookie:cookieFor(accountA)});
 assert.equal(afterAcceptance.result.invoices.length,1,"Acceptance must make exactly one invoice");
 assert.equal(afterAcceptance.result.invoices[0].status,"unpaid","Acceptance is not payment");
 assert.equal(Number(afterAcceptance.result.invoices[0].verified_paid_piasters),0);
 const replay=await req(`/api/customer/commercial/quotes/${ownedQuoteId}/accept`,{method:"POST",cookie:cookieFor(accountA),body:acceptPayload});
 assert.equal(replay.status,409,"Repeated acceptance must not duplicate invoices");
 // Bespoke projects use a staff-reviewed price, not a browser-supplied amount.
 const customPreview=await req(`/api/customer/auth/project-drafts/${two.result.projectDraft.id}/previews`,{method:"POST",cookie:cookieFor(accountA),body:{}});
 assert.equal(customPreview.status,201,JSON.stringify(customPreview));
 const customDecision=await req(`/api/customer/auth/project-drafts/${two.result.projectDraft.id}/previews/${customPreview.result.preview.id}/decision`,{method:"POST",cookie:cookieFor(accountA),body:{decision:"approved",comment:"المعاينة المخصصة مناسبة"}});
 assert.equal(customDecision.status,200,JSON.stringify(customDecision));
 const customQuote=await req(`/api/admin/commercial/project-drafts/${two.result.projectDraft.id}/quote`,{
  method:"POST",cookie:adminCookie,body:{items:[{label:"منصة محاماة مخصصة",quantity:1,unitPricePiasters:1200000,period:"fixed"}]}
 });
 assert.equal(customQuote.status,201,JSON.stringify(customQuote));
 assert.equal(Number(customQuote.result.quote.total_piasters),1368000,"VAT is added by server to reviewed custom price");
 const duplicateCustom=await req(`/api/admin/commercial/project-drafts/${two.result.projectDraft.id}/quote`,{
  method:"POST",cookie:adminCookie,body:{items:[{label:"منصة محاماة مخصصة",quantity:1,unitPricePiasters:1200000}]}
 });
 assert.equal(duplicateCustom.status,409,"Do not silently create two active quotes for one project");
 const issuedCustom=await req(`/api/admin/commercial/quotes/${customQuote.result.quote.id}/issue`,{method:"POST",cookie:adminCookie,body:{}});
 assert.equal(issuedCustom.status,200,JSON.stringify(issuedCustom));
 const contractCustom=await req("/api/admin/commercial/contracts/issue",{method:"POST",cookie:adminCookie,body:{quoteId:Number(customQuote.result.quote.id),templateId}});
 assert.equal(contractCustom.status,201,JSON.stringify(contractCustom));
 const customAccept=await req(`/api/customer/commercial/quotes/${customQuote.result.quote.id}/accept`,{
  method:"POST",cookie:cookieFor(accountA),body:{signerName:"Client A Verified",consent:true,quoteRevision:1,contractId:Number(contractCustom.result.contract.id)}
 });
 assert.equal(customAccept.status,200,JSON.stringify(customAccept));
 const customJourney=await pool.query("SELECT status FROM customer_journey_projects WHERE id=$1",[customQuote.result.projectId]);
 assert.equal(customJourney.rows[0].status,"payment_pending");
 const unpaidCustom=await req(`/api/customer/commercial/quotes/${customQuote.result.quote.id}/checkout`,{cookie:cookieFor(accountA)});
 assert.equal(unpaidCustom.status,200);
 assert.equal(unpaidCustom.result.project?.status,"payment_pending");
 assert.equal(unpaidCustom.result.invoices[0]?.status,"unpaid");
 // Project-specific image ownership, even for separate drafts of the same customer.
 const png=Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0]);
 const writeLogo=await fetch(base+`/api/customer/auth/project-drafts/${id}/logo`,{method:"POST",headers:{origin,"content-type":"image/png",cookie:cookieFor(accountA)},body:png});
 assert.equal(writeLogo.status,200,await writeLogo.text());
 const logoOwner=await fetch(base+`/api/customer/auth/project-drafts/${id}/logo`,{headers:{cookie:cookieFor(accountA)}});
 assert.equal(logoOwner.status,200);assert.equal(logoOwner.headers.get("content-type"),"image/png");
 const logoOther=await fetch(base+`/api/customer/auth/project-drafts/${id}/logo`,{headers:{cookie:cookieFor(accountB)}});
 assert.equal(logoOther.status,404);
 const logoAnotherProject=await fetch(base+`/api/customer/auth/project-drafts/${two.result.projectDraft.id}/logo`,{headers:{cookie:cookieFor(accountA)}});
 assert.equal(logoAnotherProject.status,404);
 const revisionWithLogo=await req(`/api/customer/auth/project-drafts/${id}/previews`,{method:"POST",cookie:cookieFor(accountA),body:{}});
 assert.equal(revisionWithLogo.status,201,JSON.stringify(revisionWithLogo));
 const snapUrl=base+`/api/customer/auth/project-drafts/${id}/previews/${revisionWithLogo.result.preview.id}/logo`;
 const logoFromSnapshot=await fetch(snapUrl,{headers:{cookie:cookieFor(accountA)}});
 assert.equal(logoFromSnapshot.status,200);
 assert.deepEqual(Buffer.from(await logoFromSnapshot.arrayBuffer()),png);
 const logoFromOtherAccount=await fetch(snapUrl,{headers:{cookie:cookieFor(accountB)}});
 assert.equal(logoFromOtherAccount.status,404);
 const changedPng=Buffer.from([...png,1,2,3]);
 const rewrittenLogo=await fetch(base+`/api/customer/auth/project-drafts/${id}/logo`,{method:"POST",headers:{origin,"content-type":"image/png",cookie:cookieFor(accountA)},body:changedPng});
 assert.equal(rewrittenLogo.status,200);
 const oldSnapshot=await fetch(snapUrl,{headers:{cookie:cookieFor(accountA)}});
 assert.deepEqual(Buffer.from(await oldSnapshot.arrayBuffer()),png,"Old customer preview logo must remain immutable");
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
 // All customer events were queued in the same committed DB transactions; the test worker is idempotent.
 const queued=await pool.query("SELECT event_type FROM customer_event_outbox WHERE event_type IN ('preview.approved','payment.verified')");
 assert.ok(queued.rows.some(row=>row.event_type==="preview.approved"));
 assert.ok(queued.rows.some(row=>row.event_type==="payment.verified"));
 let eventsSent=0;
 const dispatched=await deliverJourneyEvents(pool,{env:{ATSH_N8N_EVENT_URL:"https://n8n.example.test/webhook/atsh",ATSH_N8N_EVENT_TOKEN:"integration-test-n8n-token-do-not-use"},
  fetchFn:async (_url,options)=>{eventsSent++;assert.ok(options.headers["X-ATSH-Idempotency-Key"]);return {ok:true,status:200};}});
 assert.equal(dispatched.configured,true);
 assert.ok(dispatched.delivered>=2);
 assert.ok(eventsSent>=2);
 // The outbox intentionally dispatches in bounded batches of five.
 for(let tick=0;tick<10;tick++){
  const pending=await pool.query("SELECT count(*)::int AS n FROM customer_event_outbox WHERE status!='delivered'");
  if(pending.rows[0].n===0)break;
  const batch=await deliverJourneyEvents(pool,{env:{ATSH_N8N_EVENT_URL:"https://n8n.example.test/webhook/atsh",ATSH_N8N_EVENT_TOKEN:"integration-test-n8n-token-do-not-use"},
   fetchFn:async (_url,options)=>{eventsSent++;assert.ok(options.headers["X-ATSH-Idempotency-Key"]);return {ok:true,status:200};}});
  assert.equal(batch.failed,0);
 }
 const pending=await pool.query("SELECT count(*)::int AS n FROM customer_event_outbox WHERE status!='delivered'");
 assert.equal(pending.rows[0].n,0);
 const other=await req(`/api/customer/auth/project-drafts/${two.result.projectDraft.id}`,{cookie:cookieFor(accountA)});
 assert.equal(other.status,200);assert.equal(other.result.projectDraft.draft.sectorSlug,"avocato");
 // A second administrator cannot silently overwrite the catalog based on a stale version.
 const existingPages=await req("/api/admin/pages",{cookie:adminCookie});
 assert.equal(existingPages.status,200);
 const oldCatalog=existingPages.result.pages.find(p=>p.slug==="catalog"&&p.locale==="ar");
 const expectedUpdatedAt=oldCatalog?.updated_at??null;
 // Verify distinct uploaded HTML survives the real admin API and public readback.
 const catalogHtml='<!doctype html><html><head><title>Gallery CI</title></head><body><button onclick="this.textContent=42">Gallery</button><!--'+ "x".repeat(6*1024*1024) +'--></body></html>';
 const homeHtml='<!doctype html><html><head><title>Home CI</title></head><body><button onclick="this.textContent=73">Home</button><!--'+ "y".repeat(1024*1024) +'--></body></html>';
 const existingHome=existingPages.result.pages.find(p=>p.slug==="home"&&p.locale==="ar");
 const homeContent={...(existingHome?.content??{}),featuredSystemSlugs:["eyadaty"],featuredSystemHtml:{eyadaty:{html:homeHtml,name:"home-ci.html"}}};
 const galleryContent={...oldCatalog.content,items:oldCatalog.content.items.map(x=>x.slug==="eyadaty"?{...x,previewHtml:catalogHtml,previewHtmlName:"gallery-ci.html"}:x)};
 const galleryWrite=await req("/api/admin/pages/catalog",{method:"PATCH",cookie:adminCookie,body:{locale:"ar",isPublished:true,expectedUpdatedAt,content:galleryContent}});
 assert.equal(galleryWrite.status,200,JSON.stringify(galleryWrite));
 const homeWrite=await req("/api/admin/pages/home",{method:"PATCH",cookie:adminCookie,body:{locale:"ar",isPublished:true,content:homeContent}});
 assert.equal(homeWrite.status,200,JSON.stringify(homeWrite));
 const galleryPublic=await req("/api/site-content/catalog?locale=ar");
 const homePublic=await req("/api/site-content/home?locale=ar");
 assert.equal(galleryPublic.result.page.content.items.find(x=>x.slug==="eyadaty").previewHtml,catalogHtml);
 assert.equal(homePublic.result.page.content.featuredSystemHtml.eyadaty.html,homeHtml);
 assert.notEqual(galleryPublic.result.page.content.items.find(x=>x.slug==="eyadaty").previewHtml,homePublic.result.page.content.featuredSystemHtml.eyadaty.html);
 const oversize=await req("/api/admin/pages/home",{method:"PATCH",cookie:adminCookie,body:{locale:"ar",isPublished:true,content:{...homeContent,featuredSystemHtml:{eyadaty:{html:"z".repeat(10*1024*1024+1),name:"oversize.html"}}}}});
 assert.equal(oversize.status,400,"Reject HTML above 10 MiB");
 const directHomeHtml=homeHtml.replace("Home CI","Direct publisher CI");
 const direct=await req("/api/admin/home-featured",{method:"PATCH",cookie:adminCookie,body:{slugs:["eyadaty"],files:{eyadaty:{html:directHomeHtml,name:"direct.html"}}}});
 assert.equal(direct.status,200,JSON.stringify({status:direct.status,error:direct.result.error}));
 const directPublic=await req("/api/site-content/home?locale=ar");
 assert.equal(directPublic.result.page.content.featuredSystemHtml.eyadaty.html,directHomeHtml);
 assert.deepEqual(directPublic.result.page.content,{...homeContent,featuredSystemHtml:{eyadaty:{html:directHomeHtml,name:"direct.html"}}});
 const unchangedGallery=await req("/api/site-content/catalog?locale=ar");
 assert.equal(unchangedGallery.result.page.content.items.find(x=>x.slug==="eyadaty").previewHtml,catalogHtml);
 const invalidSelection=await req("/api/admin/home-featured",{method:"PATCH",cookie:adminCookie,body:{slugs:["not-a-system"],files:{}}});
 assert.equal(invalidSelection.status,400);
 console.log("PASS: independent featured homepage publishing, public readback and unchanged gallery");
 console.log("PASS: independent large homepage and gallery HTML save and public readback, oversize rejection");
 const nextCatalog={title:"كتالوج اختبار التكامل",sectors:[],items:[]};
 const firstCatalog=await req("/api/admin/pages/catalog",{method:"PATCH",cookie:adminCookie,
   body:{locale:"ar",expectedUpdatedAt:galleryWrite.result.page.updated_at,isPublished:true,content:nextCatalog}});
 assert.equal(firstCatalog.status,200,JSON.stringify(firstCatalog));
 const staleCatalog=await req("/api/admin/pages/catalog",{method:"PATCH",cookie:adminCookie,
   body:{locale:"ar",expectedUpdatedAt,isPublished:true,content:{...nextCatalog,title:"كتالوج نسخة قديمة"}}});
 assert.equal(staleCatalog.status,409,"Stale admin write must fail without erasing newer data");
 const savedCatalog=await pool.query("SELECT content->>'title' AS title FROM site_pages WHERE slug='catalog' AND locale='ar'");
 assert.equal(savedCatalog.rows[0].title,"كتالوج اختبار التكامل");
 // Private GPT usage dashboard and safe unconfigured fallback (no live provider credentials).
 const usageAdmin=await req("/api/admin/visitor-ai-usage",{cookie:adminCookie});
 assert.equal(usageAdmin.status,200);
 assert.ok(Array.isArray(usageAdmin.result.days));
 const usageGuest=await req("/api/admin/visitor-ai-usage");
 assert.equal(usageGuest.status,401);
 const assistantDisabled=await req("/api/visitor/assistant",{method:"POST",body:{messages:[{role:"user",content:"كم سعر الموقع؟"}]}});
 assert.equal(assistantDisabled.status,503);
 // Verify real PostgreSQL deletion, linked-project protection, and archive visibility.
 const removable=await pool.query("INSERT INTO customer_journey_projects(customer_name,customer_email,created_by) VALUES('Delete CI',$1,'integration-test') RETURNING id",[`delete-${suffix}@example.test`]);
 const removableId=removable.rows[0].id;
 const removed=await req(`/api/admin/journey/projects/${removableId}`,{method:"DELETE",cookie:adminCookie});
 assert.equal(removed.status,200,JSON.stringify(removed));
 assert.equal(removed.result.deleted,true);
 assert.equal((await pool.query("SELECT 1 FROM customer_journey_projects WHERE id=$1",[removableId])).rowCount,0,"Project must actually disappear from PostgreSQL");
 const protectedDelete=await req(`/api/admin/journey/projects/${journey.rows[0].id}`,{method:"DELETE",cookie:adminCookie});
 assert.equal(protectedDelete.status,409,"Linked commercial project cannot be physically deleted");
 const archived=await req(`/api/admin/journey/projects/${journey.rows[0].id}/archive`,{method:"PATCH",cookie:adminCookie});
 assert.equal(archived.status,200,JSON.stringify(archived));
 assert.equal(archived.result.project.status,"archived");
 const activeProjects=await req("/api/admin/journey/projects",{cookie:adminCookie});
 assert.equal(activeProjects.status,200);
 assert.equal(activeProjects.result.projects.some(p=>p.id===journey.rows[0].id),false,"Archived project must be hidden from active list");
 assert.equal((await pool.query("SELECT status FROM customer_journey_projects WHERE id=$1",[journey.rows[0].id])).rows[0].status,"archived");
 console.log("PASS: PostgreSQL physical deletion, protected commercial links, archive persistence and list filtering");
 console.log("PASS: contract revisions, immutable issuance, owner authorization, project isolation, conflict detection, customer preview approval and signed payment settlement");
}finally{await pool.end();}
