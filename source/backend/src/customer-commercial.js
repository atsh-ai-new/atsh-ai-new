import express from 'express';
import jwt from 'jsonwebtoken';
import {createHash} from 'node:crypto';
import {validateCheckoutGate,ensureInvoiceScheduleOnAcceptance} from './customer-checkout.js';
import {z} from 'zod';
import {transitionJourneyProject} from './customer-journey-state.js';

const tokenHash=value=>createHash('sha256').update(value).digest('hex');
import {canClaimQuote} from './customer-commercial-rules.js';
export function customerCommercialRouter({pool,allowedOrigins=[],queueJourneyEvent=async()=>{}}){
 const router=express.Router();
 const auth=async(req,res,next)=>{
  try{
   const payload=jwt.verify(req.cookies?.atsh_customer,process.env.JWT_SECRET,{issuer:'atsh-ai-api',audience:'atsh-customer'});
   if(payload.kind!=='customer')return res.status(401).json({error:'Sign in required'});
   const q=await pool.query('SELECT id,email,session_version,is_active,email_verified_at FROM customer_accounts WHERE id=$1',[payload.sub]);
   const user=q.rows[0];if(!user?.is_active||!user.email_verified_at||user.session_version!==payload.ver)return res.status(401).json({error:'Sign in required'});
   req.customer=user;next();
  }catch{return res.status(401).json({error:'Sign in required'});}
 };
 const safe=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
 router.use(auth);
 router.use((req,res,next)=>{
  if(['POST','PATCH','DELETE','PUT'].includes(req.method)&&(!req.get('origin')||!allowedOrigins.includes(req.get('origin'))))return res.status(403).json({error:'Customer commercial origin not allowed'});
  next();
 });
 // Customer-controlled approval, scoped strictly to their own linked project.
 router.get('/projects/:id/acceptance',safe(async(req,res)=>{
  if(!z.string().uuid().safeParse(req.params.id).success)return res.status(400).json({error:'Invalid project id'});
  const result=await pool.query('SELECT id,status,customer_approved_at,admin_approved_at FROM customer_journey_projects WHERE id=$1 AND customer_account_id=$2 AND status<>$3',[req.params.id,req.customer.id,'archived']);
  if(!result.rowCount)return res.status(404).json({error:'Project not found'});
  res.set('Cache-Control','private, no-store').json({project:result.rows[0]});
 }));
 router.post('/projects/:id/acceptance',safe(async(req,res)=>{
  if(!z.string().uuid().safeParse(req.params.id).success)return res.status(400).json({error:'Invalid project id'});
  const parsed=z.object({decision:z.enum(['approve','withdraw'])}).strict().safeParse(req.body);
  if(!parsed.success)return res.status(400).json({error:'Invalid approval decision'});
  const client=await pool.connect();
  try{
   await client.query('BEGIN');
   const found=await client.query('SELECT id,status,customer_approved_at,admin_approved_at FROM customer_journey_projects WHERE id=$1 AND customer_account_id=$2 FOR UPDATE',[req.params.id,req.customer.id]);
   if(!found.rowCount){await client.query('ROLLBACK');return res.status(404).json({error:'Project not found'});}
   if(found.rows[0].status==='archived'){await client.query('ROLLBACK');return res.status(409).json({error:'Archived project'});}
   const approve=parsed.data.decision==='approve';
   const result=await client.query('UPDATE customer_journey_projects SET customer_approved_at=CASE WHEN $2 THEN COALESCE(customer_approved_at,now()) ELSE NULL END,customer_approval_revoked_at=CASE WHEN $2 THEN customer_approval_revoked_at ELSE now() END,updated_at=now() WHERE id=$1 RETURNING id,status,customer_approved_at,admin_approved_at',[req.params.id,approve]);
   await client.query("INSERT INTO audit_logs(actor,action,entity_type,entity_id,before_data,after_data) VALUES($1,$2,'customer_journey_project',$3,$4::jsonb,$5::jsonb)",[req.customer.email,approve?'journey.customer_acceptance.approved':'journey.customer_acceptance.withdrawn',req.params.id,JSON.stringify({customerApprovedAt:found.rows[0].customer_approved_at}),JSON.stringify({customerApprovedAt:result.rows[0].customer_approved_at})]);
   await client.query('COMMIT');res.set('Cache-Control','private, no-store').json({project:result.rows[0]});
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
 }));
 router.post('/quotes/claim',safe(async(req,res)=>{
  const parsed=z.object({quoteId:z.number().int().positive(),reviewToken:z.string().min(20).max(512)}).strict().safeParse(req.body);
  if(!parsed.success)return res.status(400).json({error:'Invalid claim request'});
  const client=await pool.connect();try{
   await client.query('BEGIN');
   const q=await client.query('SELECT id,customer_email,customer_account_id FROM commercial_quotes WHERE id=$1 FOR UPDATE',[parsed.data.quoteId]);
   const link=await client.query('SELECT id FROM commercial_review_links WHERE quote_id=$1 AND token_hash=$2 AND revoked_at IS NULL AND expires_at>now() FOR UPDATE',[parsed.data.quoteId,tokenHash(parsed.data.reviewToken)]);
   if(!q.rowCount||!canClaimQuote({accountEmail:req.customer.email,quoteEmail:q.rows[0].customer_email,existingOwner:q.rows[0].customer_account_id,accountId:req.customer.id,linkActive:link.rowCount>0})){
    await client.query('ROLLBACK');return res.status(403).json({error:'Unable to claim quote'});
   }
   await client.query('UPDATE commercial_quotes SET customer_account_id=$1 WHERE id=$2',[req.customer.id,parsed.data.quoteId]);
   await client.query('COMMIT');return res.json({claimed:true});
  }catch(err){await client.query('ROLLBACK');throw err;}finally{client.release();}
 }));
 router.get('/quotes',safe(async(req,res)=>{
  const q=await pool.query('SELECT id,revision,status,items,total_piasters,currency,valid_until,created_at FROM commercial_quotes WHERE customer_account_id=$1 ORDER BY created_at DESC LIMIT 100',[req.customer.id]);res.json({quotes:q.rows});
 }));
 router.get('/quotes/:id',safe(async(req,res)=>{
  if(!/^\d+$/.test(req.params.id))return res.status(404).json({error:'Not found'});
  const q=await pool.query('SELECT id,revision,status,items,total_piasters,currency,valid_until,created_at FROM commercial_quotes WHERE id=$1 AND customer_account_id=$2',[req.params.id,req.customer.id]);
  if(!q.rowCount)return res.status(404).json({error:'Not found'});res.json({quote:q.rows[0]});
 }));
 router.get('/contracts',safe(async(req,res)=>{
  const q=await pool.query('SELECT c.id,c.quote_id,c.body_snapshot,c.status,c.signer_name,c.signed_at,c.created_at FROM customer_contracts c JOIN commercial_quotes q ON q.id=c.quote_id WHERE q.customer_account_id=$1 ORDER BY c.created_at DESC LIMIT 100',[req.customer.id]);res.json({contracts:q.rows});
 }));
 // PDF documents are available only to the verified account that owns the quote.
 router.get('/contracts/:id/pdf',safe(async(req,res)=>{
  const id=Number(req.params.id);if(!Number.isSafeInteger(id)||id<1)return res.status(404).json({error:'Not found'});
  const result=await pool.query("SELECT p.pdf_bytes,p.sha256 FROM commercial_contract_pdfs p JOIN customer_contracts c ON c.id=p.contract_id JOIN commercial_quotes q ON q.id=c.quote_id WHERE c.id=$1 AND q.customer_account_id=$2 AND c.status IN ('issued','signed')",[id,req.customer.id]);
  if(!result.rowCount)return res.status(404).json({error:'Not found'});
  res.set({'Cache-Control':'private, no-store','Content-Type':'application/pdf','Content-Disposition':'attachment; filename="contract-'+id+'.pdf"','X-Content-Type-Options':'nosniff'}).send(result.rows[0].pdf_bytes);
 }));
 router.get('/quotes/:id/payment-options',safe(async(req,res)=>{
  const id=Number(req.params.id);if(!Number.isSafeInteger(id)||id<1)return res.status(404).json({error:'Not found'});
  const q=await pool.query("SELECT q.status, EXISTS(SELECT 1 FROM customer_contracts c WHERE c.quote_id=q.id AND c.status='signed') AS signed, EXISTS(SELECT 1 FROM commercial_invoice_revision_requests r WHERE r.quote_id=q.id AND r.status='issued') AS pending FROM commercial_quotes q WHERE q.id=$1 AND q.customer_account_id=$2",[id,req.customer.id]);
  if(!q.rowCount)return res.status(404).json({error:'Not found'});
  const allowed=q.rows[0].status==='accepted'&&q.rows[0].signed&&!q.rows[0].pending;
  const invoices=await pool.query("SELECT id,amount_piasters,verified_paid_piasters,due_at,status,milestone,release_for_payment FROM commercial_invoices WHERE quote_id=$1 AND status<>'void' ORDER BY id",[id]);
  const payable=allowed&&invoices.rows.some(x=>x.release_for_payment&&Number(x.amount_piasters)>Number(x.verified_paid_piasters));
  const methods=payable?await pool.query("SELECT i.method,i.instructions FROM commercial_payment_instructions i JOIN commercial_payment_preferences p ON i.method=ANY(p.methods) WHERE p.quote_id=$1 AND i.enabled=true ORDER BY i.method",[id]):{rows:[]};
  res.set('Cache-Control','private, no-store').json({invoices:invoices.rows,methods:methods.rows,canPay:payable&&methods.rows.length>0,onlinePaymentEnabled:false});
 }));
 router.get('/invoices',safe(async(req,res)=>{
  const q=await pool.query('SELECT i.id,i.quote_id,i.amount_piasters,i.due_at,i.status,i.verified_paid_piasters,i.created_at FROM commercial_invoices i JOIN commercial_quotes q ON q.id=i.quote_id WHERE q.customer_account_id=$1 ORDER BY i.created_at DESC LIMIT 100',[req.customer.id]);res.json({invoices:q.rows});
 }));
 // Verified payment history: invoices are always scoped through the authenticated quote owner.
 router.get('/invoices/:id/payments',safe(async(req,res)=>{
  if(!/^\d+$/.test(req.params.id))return res.status(404).json({error:'Not found'});
  const q=await pool.query(`SELECT p.id,p.invoice_id,p.amount_piasters,p.paid_at,p.provider,p.created_at
   FROM commercial_invoice_payments p
   JOIN commercial_invoices i ON i.id=p.invoice_id
   JOIN commercial_quotes q ON q.id=i.quote_id
   WHERE i.id=$1 AND q.customer_account_id=$2 ORDER BY p.paid_at,p.id LIMIT 200`,[req.params.id,req.customer.id]);
  // Do not reveal whether another customer's invoice exists.
  const invoice=await pool.query(`SELECT i.id,i.amount_piasters,i.verified_paid_piasters,i.due_at,i.status
   FROM commercial_invoices i JOIN commercial_quotes q ON q.id=i.quote_id
   WHERE i.id=$1 AND q.customer_account_id=$2`,[req.params.id,req.customer.id]);
  if(!invoice.rowCount)return res.status(404).json({error:'Not found'});
  res.json({invoice:invoice.rows[0],payments:q.rows});
 }));
 // Orders are visible only through an explicitly owned project-to-order link.
 // Email similarity alone never grants access to an order.
 router.get('/orders',safe(async(req,res)=>{
  const q=await pool.query(`SELECT DISTINCT o.id,o.reference,o.status,o.total,o.currency,o.created_at,
      p.id AS project_id,p.status AS project_status
    FROM customer_journey_projects p
    JOIN customer_journey_order_links l ON l.project_id=p.id
    JOIN orders o ON o.id=l.order_id
    WHERE p.customer_account_id=$1
    ORDER BY o.created_at DESC LIMIT 100`,[req.customer.id]);
  res.json({orders:q.rows});
 }));
 router.get('/orders/:id',safe(async(req,res)=>{
  if(!/^[0-9a-f-]{36}$/i.test(req.params.id))return res.status(404).json({error:'Not found'});
  const q=await pool.query(`SELECT o.id,o.reference,o.status,o.total,o.currency,o.snapshot,o.created_at,
      p.id AS project_id
    FROM customer_journey_projects p
    JOIN customer_journey_order_links l ON l.project_id=p.id
    JOIN orders o ON o.id=l.order_id
    WHERE p.customer_account_id=$1 AND o.id=$2 LIMIT 1`,[req.customer.id,req.params.id]);
  if(!q.rowCount)return res.status(404).json({error:'Not found'});
  res.json({order:q.rows[0]});
 }));

 // Account-owned, read-only checkout. No account may retrieve another customer's
 // quote even when it knows the sequential identifier.
 router.get('/quotes/:id/checkout',safe(async(req,res)=>{
  const id=Number(req.params.id);if(!Number.isSafeInteger(id)||id<1)return res.status(404).json({error:'Not found'});
  const [quoteResult,contractResult,invoiceResult,feedbackResult,projectResult]=await Promise.all([
   pool.query('SELECT id,revision,status,items,total_piasters,currency,valid_until,accepted_at,created_at FROM commercial_quotes WHERE id=$1 AND customer_account_id=$2',[id,req.customer.id]),
   pool.query("SELECT c.id,c.quote_id,c.body_snapshot,c.status,c.signer_name,c.signed_at,c.template_revision,c.template_category,p.sha256 AS pdf_sha256,p.filename AS pdf_filename FROM customer_contracts c LEFT JOIN commercial_contract_pdfs p ON p.contract_id=c.id WHERE c.quote_id=$1 AND c.status<>'void' AND EXISTS(SELECT 1 FROM commercial_quotes WHERE id=$1 AND customer_account_id=$2) ORDER BY c.id DESC LIMIT 1",[id,req.customer.id]),
   pool.query("SELECT id,amount_piasters,verified_paid_piasters,due_at,status FROM commercial_invoices WHERE quote_id=$1 AND EXISTS(SELECT 1 FROM commercial_quotes WHERE id=$1 AND customer_account_id=$2) ORDER BY id",[id,req.customer.id]),
   pool.query("SELECT id,details,status,created_at,resolution_note FROM commercial_quote_change_requests WHERE quote_id=$1 AND customer_account_id=$2 ORDER BY created_at DESC LIMIT 30",[id,req.customer.id]),
   pool.query(`SELECT p.id,p.status,p.template_id,l.draft_id
   FROM (SELECT project_id,quote_id,draft_id FROM commercial_order_quote_links
         UNION ALL SELECT project_id,quote_id,draft_id FROM commercial_custom_quote_links) l
   JOIN customer_journey_projects p ON p.id=l.project_id
   WHERE l.quote_id=$1 AND p.customer_account_id=$2 LIMIT 1`,[id,req.customer.id])
  ]);
  if(!quoteResult.rowCount)return res.status(404).json({error:'Not found'});
  res.set('Cache-Control','private, no-store').json({quote:quoteResult.rows[0],contract:contractResult.rows[0]||null,invoices:invoiceResult.rows,changeRequests:feedbackResult.rows,project:projectResult.rows[0]||null,payment:{gatewayConnected:false,canPayOnline:false,note:'الدفع الإلكتروني غير مفعل بعد؛ لا تُدخل بيانات بطاقتك ولا تعتبر الفاتورة مدفوعة.'}});
 }));

 // A customer can request changes on an issued quote; an unresolved request
 // blocks acceptance. Admin resolves it or supersedes the unsigned contract.
 router.post('/quotes/:id/request-changes',safe(async(req,res)=>{
  const id=Number(req.params.id);if(!Number.isSafeInteger(id)||id<1)return res.status(404).json({error:'Not found'});
  const parsed=z.object({details:z.string().trim().min(10).max(2000)}).strict().safeParse(req.body);
  if(!parsed.success)return res.status(400).json({error:'Please describe required changes'});
  const client=await pool.connect();
  try{
   await client.query('BEGIN');
   const q=await client.query('SELECT id,status,revision,valid_until FROM commercial_quotes WHERE id=$1 AND customer_account_id=$2 FOR UPDATE',[id,req.customer.id]);
   if(!q.rowCount||q.rows[0].status!=='issued'){await client.query('ROLLBACK');return res.status(409).json({error:'Quote is not open for changes'});}
   const already=await client.query("SELECT id FROM commercial_quote_change_requests WHERE quote_id=$1 AND customer_account_id=$2 AND status='pending'",[id,req.customer.id]);
   if(already.rowCount){await client.query('ROLLBACK');return res.status(409).json({error:'A previous change request is awaiting admin review'});}
   const result=await client.query('INSERT INTO commercial_quote_change_requests(quote_id,customer_account_id,details) VALUES($1,$2,$3) RETURNING id,status,details,created_at',[id,req.customer.id,parsed.data.details]);
   await queueJourneyEvent(client,'quote.changes_requested',`quote.changes_requested:${result.rows[0].id}`,{quoteId:id,customerId:req.customer.id,requestId:result.rows[0].id});
   await client.query('COMMIT');res.status(201).set('Cache-Control','private, no-store').json({changeRequest:result.rows[0]});
  }catch(error){await client.query('ROLLBACK');if(error.code==='23505')return res.status(409).json({error:'Change request already pending'});throw error;}finally{client.release();}
 }));

 // Verified account + exact issued quote revision + current unsigned contract
 // + explicit consent. This records an electronic acknowledgement, NOT a
 // qualified national electronic signature. The payment gateway is separate.
 router.post('/quotes/:id/accept',safe(async(req,res)=>{
  const id=Number(req.params.id);if(!Number.isSafeInteger(id)||id<1)return res.status(404).json({error:'Not found'});
  const parsed=z.object({signerName:z.string().trim().min(3).max(160),consent:z.literal(true),quoteRevision:z.number().int().positive(),contractId:z.number().int().positive(),contractSha256:z.string().regex(/^[a-f0-9]{64}$/).optional()}).strict().safeParse(req.body);
  if(!parsed.success)return res.status(400).json({error:'Explicit consent and current document IDs required'});
  const client=await pool.connect();
  try{
   await client.query('BEGIN');
   const quoteResult=await client.query('SELECT id,revision,status,total_piasters,valid_until FROM commercial_quotes WHERE id=$1 AND customer_account_id=$2 FOR UPDATE',[id,req.customer.id]);
   if(!quoteResult.rowCount){await client.query('ROLLBACK');return res.status(404).json({error:'Not found'});}
   const contractResult=await client.query("SELECT id,status,body_snapshot FROM customer_contracts WHERE quote_id=$1 AND status='issued' ORDER BY id DESC LIMIT 1 FOR UPDATE",[id]);
   const pending=await client.query("SELECT id FROM commercial_quote_change_requests WHERE quote_id=$1 AND customer_account_id=$2 AND status='pending' LIMIT 1",[id,req.customer.id]);
   const quote=quoteResult.rows[0],contract=contractResult.rows[0];
   const gate=validateCheckoutGate({quote,contract,hasPendingChangeRequest:pending.rowCount>0,expectedRevision:parsed.data.quoteRevision,expectedContractId:parsed.data.contractId});
   if(gate){await client.query('ROLLBACK');return res.status(409).json({error:gate});}
   const pdf=await client.query('SELECT sha256 FROM commercial_contract_pdfs WHERE contract_id=$1',[contract.id]);
   if(pdf.rowCount&&parsed.data.contractSha256!==pdf.rows[0].sha256){await client.query('ROLLBACK');return res.status(409).json({error:'Review the current PDF before accepting'});}
   const evidence={method:'authenticated_account_approval',customerId:req.customer.id,verifiedEmail:req.customer.email,contractSha256:pdf.rows[0]?.sha256||createHash('sha256').update(contract.body_snapshot).digest('hex'),quoteRevision:quote.revision,contractId:contract.id,consent:true,ip:req.ip,userAgent:String(req.get('user-agent')||'').slice(0,250)};
   const accepted=await client.query("UPDATE commercial_quotes SET status='accepted',accepted_at=now() WHERE id=$1 AND status='issued' RETURNING id,accepted_at",[id]);
   const signed=await client.query("UPDATE customer_contracts SET status='signed',signer_name=$2,signed_at=now(),signature_evidence=$3::jsonb WHERE id=$1 AND status='issued' RETURNING id,signed_at",[contract.id,parsed.data.signerName,JSON.stringify(evidence)]);
   if(!accepted.rowCount||!signed.rowCount){await client.query('ROLLBACK');return res.status(409).json({error:'Document changed before acceptance'});}
   const schedule=await ensureInvoiceScheduleOnAcceptance(client,{quoteId:id,totalPiasters:quote.total_piasters});
   const linkedProjects=await client.query(`SELECT project_id FROM commercial_order_quote_links WHERE quote_id=$1 AND is_current=true
     UNION SELECT project_id FROM commercial_custom_quote_links WHERE quote_id=$1 AND is_current=true`,[id]);
   for(const linked of linkedProjects.rows){
    const moved=await transitionJourneyProject(client,{projectId:linked.project_id,next:'payment_pending',expectedStatus:'quoted',actor:req.customer.email});
    if(!moved.ok){await client.query('ROLLBACK');return res.status(409).json({error:'Project stage changed before quote acceptance',reason:moved.reason});}
   }
   await client.query('UPDATE commercial_review_links SET revoked_at=now() WHERE quote_id=$1 AND revoked_at IS NULL',[id]);
   await queueJourneyEvent(client,'contract.signed',`contract.signed:${signed.rows[0].id}`,{contractId:signed.rows[0].id,quoteId:id,signedAt:signed.rows[0].signed_at,customerAccount:true});
   await client.query('COMMIT');
   res.set('Cache-Control','private, no-store').json({accepted:true,quoteId:id,contractId:signed.rows[0].id,paymentStatus:'pending_gateway',invoiceIds:schedule.invoices.map(invoice=>invoice.id),onlinePaymentEnabled:false});
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
 }));
 // Customer reviews a revision only within the owning authenticated account.
 router.get('/quotes/:id/revisions',safe(async(req,res)=>{
  const id=Number(req.params.id);if(!Number.isSafeInteger(id)||id<1)return res.status(404).json({error:'Not found'});
  const q=await pool.query('SELECT id FROM commercial_quotes WHERE id=$1 AND customer_account_id=$2',[id,req.customer.id]);
  if(!q.rowCount)return res.status(404).json({error:'Not found'});
  const r=await pool.query("SELECT id,base_revision,proposed_items,proposed_total_piasters,proposed_schedule,reason,status,issued_at,accepted_at,contract_sha256 FROM commercial_invoice_revision_requests WHERE quote_id=$1 AND status IN ('issued','accepted','rejected') ORDER BY id DESC",[id]);
  res.set('Cache-Control','private, no-store').json({revisions:r.rows});
 }));
 router.get('/revisions/:id/pdf',safe(async(req,res)=>{
  const id=Number(req.params.id);if(!Number.isSafeInteger(id)||id<1)return res.status(404).json({error:'Not found'});
  const r=await pool.query("SELECT r.contract_pdf FROM commercial_invoice_revision_requests r JOIN commercial_quotes q ON q.id=r.quote_id WHERE r.id=$1 AND q.customer_account_id=$2 AND r.status IN ('issued','accepted','rejected')",[id,req.customer.id]);
  if(!r.rows[0]?.contract_pdf)return res.status(404).json({error:'Not found'});
  res.set({'Cache-Control':'private, no-store','Content-Type':'application/pdf','Content-Disposition':'attachment; filename="revision-'+id+'.pdf"','X-Content-Type-Options':'nosniff'}).send(r.rows[0].contract_pdf);
 }));
 router.post('/revisions/:id/decision',safe(async(req,res)=>{
  const id=Number(req.params.id);if(!Number.isSafeInteger(id)||id<1)return res.status(404).json({error:'Not found'});
  const parsed=z.object({decision:z.enum(['accept','reject']),contractSha256:z.string().regex(/^[a-f0-9]{64}$/),consent:z.boolean()}).strict().safeParse(req.body);
  if(!parsed.success||parsed.data.decision==='accept'&&!parsed.data.consent)return res.status(400).json({error:'Explicit decision and current PDF required'});
  const c=await pool.connect();try{await c.query('BEGIN');
   const q=await c.query("SELECT q.id,q.revision,q.status,q.total_piasters FROM commercial_quotes q JOIN commercial_invoice_revision_requests r ON r.quote_id=q.id WHERE r.id=$1 AND q.customer_account_id=$2 FOR UPDATE OF q",[id,req.customer.id]);
   if(!q.rowCount){await c.query('ROLLBACK');return res.status(404).json({error:'Not found'});}
   const r=await c.query('SELECT * FROM commercial_invoice_revision_requests WHERE id=$1 FOR UPDATE',[id]);
   const rev=r.rows[0],quote=q.rows[0];
   if(rev.status!=='issued'||quote.status!=='accepted'||Number(rev.base_revision)!==Number(quote.revision)||rev.contract_sha256!==parsed.data.contractSha256){await c.query('ROLLBACK');return res.status(409).json({error:'Revision changed or unavailable'});}
   if(parsed.data.decision==='reject'){
    await c.query("UPDATE commercial_invoice_revision_requests SET status='rejected' WHERE id=$1",[id]);
    await c.query('COMMIT');return res.json({status:'rejected'});
   }
   const invoices=await c.query("SELECT id,amount_piasters,verified_paid_piasters,status FROM commercial_invoices WHERE quote_id=$1 ORDER BY id FOR UPDATE",[quote.id]);
   const paid=await c.query("SELECT COALESCE(sum(p.amount_piasters),0) AS paid FROM commercial_invoice_payments p JOIN commercial_invoices i ON i.id=p.invoice_id WHERE i.quote_id=$1",[quote.id]);
   const grossPaidPiasters=Number(paid.rows[0].paid);
   const refund=await c.query("SELECT COALESCE(sum(amount_piasters),0) AS refunded FROM commercial_refund_payments WHERE quote_id=$1",[quote.id]);
   const paidPiasters=grossPaidPiasters-Number(refund.rows[0].refunded);
   const accounted=invoices.rows.reduce((n,x)=>n+Number(x.verified_paid_piasters),0);
   if(accounted!==grossPaidPiasters){await c.query('ROLLBACK');return res.status(409).json({error:'Existing ledger requires reconciliation'});}
   const {revisionProposal}=await import('./payment-revision-rules.js');
   let proposal;try{proposal=revisionProposal({items:rev.proposed_items,schedule:rev.proposed_schedule,reason:rev.reason,paidPiasters});}catch(e){await c.query('ROLLBACK');return res.status(409).json({error:'Payment balance changed; request updated revision'});}
   if(proposal.totalPiasters!==Number(rev.proposed_total_piasters)){await c.query('ROLLBACK');return res.status(409).json({error:'Revision total changed'});}
   const evidence={customerId:req.customer.id,email:req.customer.email,contractSha256:rev.contract_sha256,consent:true,previousItems:null,previousInvoices:invoices.rows,previousQuoteRevision:quote.revision};
   const previous=await c.query('SELECT items FROM commercial_quotes WHERE id=$1',[quote.id]);evidence.previousItems=previous.rows[0].items;
   for(const invoice of invoices.rows){
    if(invoice.status==='void'||invoice.status==='paid')continue;
    if(Number(invoice.verified_paid_piasters)>0){
     await c.query("UPDATE commercial_invoices SET amount_piasters=verified_paid_piasters,status='paid',release_for_payment=false WHERE id=$1",[invoice.id]);
    }else{
     await c.query("UPDATE commercial_invoices SET status='void',release_for_payment=false WHERE id=$1",[invoice.id]);
    }
   }
   for(const part of proposal.schedule){
    await c.query("INSERT INTO commercial_invoices(quote_id,amount_piasters,milestone,release_for_payment,status) VALUES($1,$2,$3,false,'unpaid')",[quote.id,part.amountPiasters,part.milestone]);
   }
   await c.query("INSERT INTO commercial_invoice_adjustment_ledger(revision_request_id,quote_id,previous_total_piasters,revised_total_piasters,paid_snapshot_piasters) VALUES($1,$2,$3,$4,$5)",[id,quote.id,quote.total_piasters,proposal.totalPiasters,paidPiasters]);
   await c.query("UPDATE commercial_quotes SET revision=revision+1,items=$2::jsonb,total_piasters=$3 WHERE id=$1",[quote.id,JSON.stringify(proposal.items),proposal.totalPiasters]);
   await c.query("UPDATE commercial_invoice_revision_requests SET status='accepted',accepted_at=now(),acceptance_evidence=$2::jsonb WHERE id=$1",[id,JSON.stringify(evidence)]);
   await c.query('COMMIT');res.json({status:'accepted',balance:proposal});
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 }));
 router.get('/quotes/:id/balance',safe(async(req,res)=>{
  const id=Number(req.params.id);if(!Number.isSafeInteger(id)||id<1)return res.status(404).json({error:'Not found'});
  const q=await pool.query("SELECT q.total_piasters,(SELECT COALESCE(sum(p.amount_piasters),0) FROM commercial_invoice_payments p JOIN commercial_invoices i ON i.id=p.invoice_id WHERE i.quote_id=q.id) AS gross,(SELECT COALESCE(sum(amount_piasters),0) FROM commercial_refund_payments WHERE quote_id=q.id) AS refunded FROM commercial_quotes q WHERE q.id=$1 AND q.customer_account_id=$2",[id,req.customer.id]);
  if(!q.rowCount)return res.status(404).json({error:'Not found'});
  const b=q.rows[0],gross=Number(b.gross),refunded=Number(b.refunded),total=Number(b.total_piasters);
  const {revisedBalance}=await import('./payment-revision-rules.js');
  const refunds=await pool.query("SELECT id,amount_piasters,method,recorded_at FROM commercial_refund_payments WHERE quote_id=$1 ORDER BY id DESC",[id]);
  res.set('Cache-Control','private, no-store').json({...revisedBalance(total,gross-refunded),grossPaidPiasters:gross,refundedPiasters:refunded,refunds:refunds.rows});
 }));
 return router;
}
