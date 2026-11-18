import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';
import {queueJourneyEvent} from './customer-event-outbox.js';

const emailSchema=z.string().trim().email().max(254).transform(v=>v.toLowerCase());
const passwordSchema=z.string().min(12).max(128);
const hash=v=>createHash('sha256').update(v).digest('hex');
const secret=()=>randomBytes(32).toString('hex');
const sessionCookie='atsh_customer';
const cookieOptions={httpOnly:true,secure:process.env.COOKIE_SECURE!=='false',sameSite:'lax',path:'/',maxAge:7*24*3600*1000};
const safe=(handler)=>(req,res,next)=>Promise.resolve(handler(req,res,next)).catch(next);

export function customerAuthRouter({pool,sendEmail,allowedOrigins=[]}){
 const router=Router();
 const publicUrl=process.env.PUBLIC_SITE_URL;
 const session=async(res,id)=>{const q=await pool.query('SELECT session_version FROM customer_accounts WHERE id=$1',[id]);res.cookie(sessionCookie,jwt.sign({sub:String(id),kind:'customer',ver:q.rows[0].session_version},process.env.JWT_SECRET,{issuer:'atsh-ai-api',audience:'atsh-customer',expiresIn:'7d'}),cookieOptions);};
 const issue=async(client,id,purpose)=>{const token=secret();await client.query('INSERT INTO customer_auth_tokens(customer_id,purpose,token_hash,expires_at) VALUES($1,$2,$3,now()+interval \'30 minutes\')',[id,purpose,hash(token)]);return token;};
 const sendLink=async({email,name,token,purpose})=>{
  if(!publicUrl||!process.env.BREVO_API_KEY)throw Error('Customer email delivery not configured');
  const path=purpose==='verify'?'verify':'reset-password';
  const url=new URL('/account/'+path,publicUrl);url.searchParams.set('token',token);
  await sendEmail({to:email,toName:name,subject:purpose==='verify'?'تأكيد حساب ATSH AI':'استعادة كلمة مرور ATSH AI',textContent:`افتح الرابط خلال 30 دقيقة:\n${url.toString()}\nإذا لم تطلب ذلك تجاهل الرسالة.`});
 };
 router.use((req,res,next)=>{if(['POST','PUT','PATCH','DELETE'].includes(req.method)){const origin=req.get('origin');if(!origin||!allowedOrigins.includes(origin))return res.status(403).json({error:'Origin not allowed'});}next();});
 router.post('/register',safe(async(req,res)=>{
  const p=z.object({name:z.string().trim().min(2).max(120),email:emailSchema,password:passwordSchema}).safeParse(req.body);
  if(!p.success)return res.status(400).json({error:'بيانات التسجيل غير صحيحة؛ راجع الاسم والبريد وكلمة المرور.'});
  if(!publicUrl||!process.env.BREVO_API_KEY)return res.status(503).json({error:'إنشاء الحسابات بالبريد غير مفعّل بعد: يجب إعداد عنوان الموقع وخدمة إرسال رسائل التأكيد.'});
  const {name,email,password}=p.data;
  const client=await pool.connect();let token=null;
  try{await client.query('BEGIN');
   const existing=await client.query('SELECT id FROM customer_accounts WHERE email=$1',[email]);
   if(!existing.rowCount){const passwordHash=await bcrypt.hash(password,12);const inserted=await client.query('INSERT INTO customer_accounts(name,email,password_hash) VALUES($1,$2,$3) RETURNING id',[name,email,passwordHash]);token=await issue(client,inserted.rows[0].id,'verify');await sendLink({email,name,token,purpose:'verify'});}
   await client.query('COMMIT');
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
  res.status(202).json({message:'If eligible, a verification email has been sent'});
 }));
 // Resend without revealing whether an account exists. SMTP must be available, no unverified account is activated.
 router.post('/verification/resend',safe(async(req,res)=>{
  const parsed=z.object({email:emailSchema}).safeParse(req.body);
  if(!parsed.success)return res.status(202).json({message:'لو البريد مسجل وغير مؤكد، هتوصلك رسالة تأكيد.'});
  if(!publicUrl||!process.env.BREVO_API_KEY)return res.status(503).json({error:'إرسال تأكيد الحساب غير مفعّل بعد على الخادم.'});
  const customer=await pool.query('SELECT id,name,email FROM customer_accounts WHERE email=$1 AND email_verified_at IS NULL AND is_active=true',[parsed.data.email]);
  if(customer.rowCount){
    const row=customer.rows[0];
    const client=await pool.connect();
    try{
      await client.query('BEGIN');
      await client.query("UPDATE customer_auth_tokens SET used_at=now() WHERE customer_id=$1 AND purpose='verify' AND used_at IS NULL",[row.id]);
      const token=await issue(client,row.id,'verify');
      await sendLink({email:row.email,name:row.name,token,purpose:'verify'});
      await client.query('COMMIT');
    }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
  }
  res.status(202).json({message:'لو البريد مسجل وغير مؤكد، هتوصلك رسالة تأكيد.'});
 }));
 router.post('/verify',safe(async(req,res)=>{
  const p=z.object({token:z.string().regex(/^[a-f0-9]{64}$/)}).safeParse(req.body);if(!p.success)return res.status(400).json({error:'Invalid token'});
  const client=await pool.connect();try{await client.query('BEGIN');const q=await client.query("UPDATE customer_auth_tokens SET used_at=now() WHERE token_hash=$1 AND purpose='verify' AND used_at IS NULL AND expires_at>now() RETURNING customer_id",[hash(p.data.token)]);
   if(!q.rowCount){await client.query('ROLLBACK');return res.status(400).json({error:'Invalid or expired token'});}
   await client.query('UPDATE customer_accounts SET email_verified_at=now() WHERE id=$1',[q.rows[0].customer_id]);await client.query('COMMIT');res.json({verified:true});
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
 }));
 router.post('/login',safe(async(req,res)=>{
  const p=z.object({email:emailSchema,password:z.string().max(128)}).safeParse(req.body);if(!p.success)return res.status(401).json({error:'Invalid credentials'});
  const q=await pool.query('SELECT id,name,email,password_hash,email_verified_at,is_active FROM customer_accounts WHERE email=$1',[p.data.email]);
  if(!q.rowCount||!q.rows[0].password_hash||!await bcrypt.compare(p.data.password,q.rows[0].password_hash)||!q.rows[0].email_verified_at||!q.rows[0].is_active)return res.status(401).json({error:'Invalid credentials or unverified account'});
  await session(res,q.rows[0].id);res.json({customer:{name:q.rows[0].name,email:q.rows[0].email}});
 }));
 router.post('/password/forgot',safe(async(req,res)=>{
  const p=z.object({email:emailSchema}).safeParse(req.body);if(!p.success)return res.status(202).json({message:'If the account exists, a reset email will be sent'});
  const q=await pool.query('SELECT id,name,email FROM customer_accounts WHERE email=$1 AND is_active=true AND password_hash IS NOT NULL',[p.data.email]);
  if(q.rowCount){const token=await issue(pool,q.rows[0].id,'reset');try{await sendLink({email:q.rows[0].email,name:q.rows[0].name,token,purpose:'reset'});}catch(e){console.error('Customer password reset email failed');}}
  res.status(202).json({message:'If the account exists, a reset email will be sent'});
 }));
 router.post('/password/reset',safe(async(req,res)=>{
  const p=z.object({token:z.string().regex(/^[a-f0-9]{64}$/),password:passwordSchema}).safeParse(req.body);if(!p.success)return res.status(400).json({error:'Invalid reset request'});
  const passwordHash=await bcrypt.hash(p.data.password,12);const client=await pool.connect();try{await client.query('BEGIN');const q=await client.query("UPDATE customer_auth_tokens SET used_at=now() WHERE token_hash=$1 AND purpose='reset' AND used_at IS NULL AND expires_at>now() RETURNING customer_id",[hash(p.data.token)]);
   if(!q.rowCount){await client.query('ROLLBACK');return res.status(400).json({error:'Invalid or expired token'});}
   await client.query('UPDATE customer_accounts SET password_hash=$1,session_version=session_version+1 WHERE id=$2',[passwordHash,q.rows[0].customer_id]);await client.query('COMMIT');res.clearCookie(sessionCookie,cookieOptions);res.json({reset:true});
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
 }));
 router.post('/google',safe(async(req,res)=>{
  const p=z.object({credential:z.string().min(30).max(5000)}).safeParse(req.body);if(!p.success)return res.status(400).json({error:'Invalid credential'});
  if(!process.env.GOOGLE_CLIENT_ID)return res.status(503).json({error:'Google login not configured'});
  const upstream=await fetch('https://oauth2.googleapis.com/tokeninfo?id_token='+encodeURIComponent(p.data.credential),{signal:AbortSignal.timeout(8000)});
  if(!upstream.ok)return res.status(401).json({error:'Google authentication failed'});
  const identity=await upstream.json();
  if(identity.aud!==process.env.GOOGLE_CLIENT_ID||!['accounts.google.com','https://accounts.google.com'].includes(identity.iss)||identity.email_verified!=='true'||!identity.sub||!identity.email)return res.status(401).json({error:'Google authentication failed'});
  const email=emailSchema.parse(identity.email);const name=String(identity.name||email.split('@')[0]).slice(0,120);
  const client=await pool.connect();let id;
  try{await client.query('BEGIN');const byGoogle=await client.query('SELECT id,is_active FROM customer_accounts WHERE google_sub=$1 FOR UPDATE',[identity.sub]);
   if(byGoogle.rowCount){if(!byGoogle.rows[0].is_active){await client.query('ROLLBACK');return res.status(403).json({error:'Account disabled'});}id=byGoogle.rows[0].id;}
   else{const byEmail=await client.query('SELECT id FROM customer_accounts WHERE email=$1 FOR UPDATE',[email]);
    if(byEmail.rowCount){await client.query('ROLLBACK');return res.status(409).json({error:'Existing email account: sign in with password first; account linking requires verification'});}
    const inserted=await client.query('INSERT INTO customer_accounts(name,email,google_sub,email_verified_at) VALUES($1,$2,$3,now()) RETURNING id',[name,email,identity.sub]);id=inserted.rows[0].id;}
   await client.query('COMMIT');
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
  await session(res,id);res.json({customer:{name,email}});
 }));
 const requireCustomer=safe(async(req,res,next)=>{let payload;try{payload=jwt.verify(req.cookies?.[sessionCookie],process.env.JWT_SECRET,{issuer:'atsh-ai-api',audience:'atsh-customer'});}catch{return res.status(401).json({error:'Sign in required'});}const q=await pool.query('SELECT id,name,email,is_active,session_version FROM customer_accounts WHERE id=$1',[payload.sub]);if(!q.rowCount||!q.rows[0].is_active)return res.status(401).json({error:'Session revoked'});if(payload.ver!==undefined&&payload.ver!==q.rows[0].session_version)return res.status(401).json({error:'Session revoked'});req.customer=q.rows[0];next();});
 router.get('/me',requireCustomer,(req,res)=>res.json({customer:{name:req.customer.name,email:req.customer.email}}));
 // Project ownership is explicit: a matching email address alone never grants access.
 router.post('/projects/claim',requireCustomer,safe(async(req,res)=>{
  const p=z.object({projectId:z.string().uuid(),accessToken:z.string().regex(/^[a-f0-9]{64}$/)}).safeParse(req.body);
  if(!p.success)return res.status(400).json({error:'Invalid claim request'});
  const client=await pool.connect();
  try{
   await client.query('BEGIN');
   const q=await client.query(`SELECT p.id,p.customer_email,p.customer_account_id,a.token_hash,a.expires_at,a.revoked_at
     FROM customer_journey_projects p JOIN customer_journey_access a ON a.project_id=p.id
     WHERE p.id=$1 FOR UPDATE OF p,a`,[p.data.projectId]);
   const row=q.rows[0];
   if(!row||row.customer_account_id&&String(row.customer_account_id)!==String(req.customer.id)||
      !row.customer_email||row.customer_email.toLowerCase()!==req.customer.email.toLowerCase()||
      row.revoked_at||new Date(row.expires_at)<=new Date()||row.token_hash!==hash(p.data.accessToken)){
    await client.query('ROLLBACK');return res.status(403).json({error:'Unable to claim project'});
   }
   await client.query('UPDATE customer_journey_projects SET customer_account_id=$1 WHERE id=$2',[req.customer.id,row.id]);
   await client.query('UPDATE customer_journey_access SET revoked_at=now() WHERE project_id=$1',[row.id]);
   await client.query('COMMIT');res.json({claimed:true,projectId:row.id});
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
 }));
 // Shared draft is intentionally a limited preference snapshot, never a priced quote.
 const draftSchema=z.object({
  sectorSlug:z.string().regex(/^[a-z0-9-]{1,100}$/).optional(),
  sectorName:z.string().max(120).optional(),
  packageId:z.string().max(100).optional(),
  businessName:z.string().max(120).optional(),
  businessDescription:z.string().max(500).optional(),
  domainName:z.string().trim().toLowerCase().max(253).optional(),
  brandColor:z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  options:z.array(z.string().max(100)).max(30).optional(),
  deliveryMethod:z.enum(['managed','source-code','undecided']).optional(),
  source:z.enum(['catalog','configurator','concierge','preview','account']).optional()
 }).strict();
 // Multi-project drafts: customer ownership and optimistic revision are enforced server-side.
 router.get('/project-drafts',requireCustomer,safe(async(req,res)=>{
  const result=await pool.query("SELECT id,title,draft,revision,updated_at,created_at FROM customer_project_drafts WHERE customer_id=$1 ORDER BY updated_at DESC LIMIT 100",[req.customer.id]);
  res.set('Cache-Control','private, no-store').json({drafts:result.rows});
 }));
 router.post('/project-drafts',requireCustomer,safe(async(req,res)=>{
  const parsed=z.object({title:z.string().trim().min(1).max(120).default('مشروع جديد'),draft:draftSchema.default({})}).strict().safeParse(req.body);
  if(!parsed.success)return res.status(400).json({error:'Invalid project draft'});
  const count=await pool.query("SELECT count(*)::int AS count FROM customer_project_drafts WHERE customer_id=$1",[req.customer.id]);
  if(count.rows[0].count>=100)return res.status(409).json({error:'Maximum number of drafts reached'});
  const result=await pool.query("INSERT INTO customer_project_drafts(customer_id,title,draft) VALUES($1,$2,$3::jsonb) RETURNING id,title,draft,revision,updated_at",[req.customer.id,parsed.data.title,JSON.stringify(parsed.data.draft)]);
  res.status(201).set('Cache-Control','private, no-store').json({projectDraft:result.rows[0]});
 }));
 router.get('/project-drafts/:id',requireCustomer,safe(async(req,res)=>{
  if(!z.string().uuid().safeParse(req.params.id).success)return res.status(404).json({error:'Not found'});
  const result=await pool.query("SELECT id,title,draft,revision,updated_at FROM customer_project_drafts WHERE id=$1 AND customer_id=$2",[req.params.id,req.customer.id]);
  if(!result.rowCount)return res.status(404).json({error:'Not found'});
  res.set('Cache-Control','private, no-store').json({projectDraft:result.rows[0]});
 }));
 router.patch('/project-drafts/:id',requireCustomer,safe(async(req,res)=>{
  if(!z.string().uuid().safeParse(req.params.id).success)return res.status(404).json({error:'Not found'});
  const parsed=z.object({expectedRevision:z.number().int().positive(),title:z.string().trim().min(1).max(120).optional(),patch:draftSchema.optional()}).strict().safeParse(req.body);
  if(!parsed.success||(!parsed.data.title&&!parsed.data.patch))return res.status(400).json({error:'Invalid project draft update'});
  const result=await pool.query(`UPDATE customer_project_drafts SET
    title=COALESCE($3,title),draft=draft||$4::jsonb,revision=revision+1,updated_at=now()
    WHERE id=$1 AND customer_id=$2 AND revision=$5
    RETURNING id,title,draft,revision,updated_at`,
    [req.params.id,req.customer.id,parsed.data.title??null,JSON.stringify(parsed.data.patch??{}),parsed.data.expectedRevision]);
  if(!result.rowCount)return res.status(409).json({error:'Draft missing or changed on another device; reload before saving'});
  res.set('Cache-Control','private, no-store').json({projectDraft:result.rows[0]});
 }));
 // Immutable preview revision generated from an account-owned project draft.
 router.post('/project-drafts/:id/previews',requireCustomer,safe(async(req,res)=>{
  const id=req.params.id;
  if(!z.string().uuid().safeParse(id).success)return res.status(404).json({error:'Project not found'});
  const client=await pool.connect();
  try{
   await client.query('BEGIN');
   const owned=await client.query('SELECT id,title,draft,revision FROM customer_project_drafts WHERE id=$1 AND customer_id=$2 FOR UPDATE',[id,req.customer.id]);
   if(!owned.rowCount){await client.query('ROLLBACK');return res.status(404).json({error:'Project not found'});}
   const row=owned.rows[0];
   const latest=await client.query('SELECT max(revision)::bigint AS revision FROM customer_preview_versions WHERE draft_id=$1',[id]);
   const next=Number(latest.rows[0].revision||0)+1;
   const snapshot={...row.draft,projectTitle:row.title,sourceRevision:row.revision,mode:'customer_customization_demo'};
   const inserted=await client.query('INSERT INTO customer_preview_versions(draft_id,revision,snapshot) VALUES($1,$2,$3::jsonb) RETURNING id,revision,approval_status,created_at',[id,next,JSON.stringify(snapshot)]);
   const logo=await client.query('SELECT mime_type,data FROM customer_project_logos WHERE draft_id=$1 FOR SHARE',[id]);
   if(logo.rowCount){
     const digest=hash(logo.rows[0].data);
     await client.query('INSERT INTO customer_preview_logo_versions(preview_id,mime_type,data,digest) VALUES($1,$2,$3,$4)',[inserted.rows[0].id,logo.rows[0].mime_type,logo.rows[0].data,digest]);
   }
   await client.query('COMMIT');
   res.status(201).set('Cache-Control','private, no-store').json({preview:inserted.rows[0]});
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
 }));
 router.get('/project-drafts/:id/previews',requireCustomer,safe(async(req,res)=>{
  if(!z.string().uuid().safeParse(req.params.id).success)return res.status(404).json({error:'Not found'});
  const owned=await pool.query('SELECT id FROM customer_project_drafts WHERE id=$1 AND customer_id=$2',[req.params.id,req.customer.id]);
  if(!owned.rowCount)return res.status(404).json({error:'Not found'});
  const result=await pool.query('SELECT id,revision,snapshot,approval_status,customer_comment,decided_at,created_at FROM customer_preview_versions WHERE draft_id=$1 ORDER BY revision DESC LIMIT 100',[req.params.id]);
  res.set('Cache-Control','private, no-store').json({previews:result.rows});
 }));
 router.get('/project-drafts/:id/previews/:previewId/logo',requireCustomer,safe(async(req,res)=>{
  if(!z.string().uuid().safeParse(req.params.id).success||!z.string().uuid().safeParse(req.params.previewId).success)return res.status(404).end();
  const result=await pool.query(`SELECT assets.mime_type,assets.data FROM customer_preview_logo_versions assets
    JOIN customer_preview_versions previews ON previews.id=assets.preview_id
    JOIN customer_project_drafts drafts ON drafts.id=previews.draft_id
    WHERE assets.preview_id=$1 AND drafts.id=$2 AND drafts.customer_id=$3`,
    [req.params.previewId,req.params.id,req.customer.id]);
  if(!result.rowCount)return res.status(404).end();
  res.set({'Content-Type':result.rows[0].mime_type,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}).send(result.rows[0].data);
 }));
 router.post('/project-drafts/:id/previews/:previewId/decision',requireCustomer,safe(async(req,res)=>{
  const p=z.object({decision:z.enum(['approved','changes_requested']),comment:z.string().max(2000).default('')}).strict().safeParse(req.body);
  if(!p.success||!z.string().uuid().safeParse(req.params.id).success||!z.string().uuid().safeParse(req.params.previewId).success)return res.status(400).json({error:'Invalid approval request'});
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const owned=await client.query('SELECT id FROM customer_project_drafts WHERE id=$1 AND customer_id=$2 FOR UPDATE',[req.params.id,req.customer.id]);
    if(!owned.rowCount){await client.query('ROLLBACK');return res.status(404).json({error:'Not found'});}
    const result=await client.query(`UPDATE customer_preview_versions SET approval_status=$3,customer_comment=$4,decided_at=now()
     WHERE id=$1 AND draft_id=$2 AND approval_status='pending' AND revision=(SELECT max(revision) FROM customer_preview_versions WHERE draft_id=$2)
     RETURNING id,revision,approval_status,decided_at`,
     [req.params.previewId,req.params.id,p.data.decision,p.data.comment]);
    if(!result.rowCount){await client.query('ROLLBACK');return res.status(409).json({error:'Preview already reviewed or superseded'});}
    const preview=result.rows[0];
    await queueJourneyEvent(client,p.data.decision==="approved"?"preview.approved":"preview.changes_requested",
      `preview.${p.data.decision}:${preview.id}`,{previewId:preview.id,projectDraftId:req.params.id,revision:preview.revision,status:preview.approval_status});
    await client.query('COMMIT');
    res.set('Cache-Control','private, no-store').json({preview});
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
 }));
 // A draft's logo is owned by the draft's customer. Never expose it by account email.
 router.post('/project-drafts/:id/logo',requireCustomer,safe(async(req,res)=>{
  const draftId=req.params.id;
  if(!z.string().uuid().safeParse(draftId).success)return res.status(404).json({error:'Not found'});
  const owned=await pool.query("SELECT id FROM customer_project_drafts WHERE id=$1 AND customer_id=$2",[draftId,req.customer.id]);
  if(!owned.rowCount)return res.status(404).json({error:'Not found'});
  const mime=String(req.get('content-type')||'').split(';')[0].trim().toLowerCase(),data=req.body;
  if(!Buffer.isBuffer(data)||!data.length||data.length>2097152)return res.status(413).json({error:'Logo must be an image up to 2 MB'});
  const png=data.length>=8&&data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  const jpeg=data.length>=3&&data[0]===255&&data[1]===216&&data[2]===255;
  const webp=data.length>=12&&data.toString('ascii',0,4)==='RIFF'&&data.toString('ascii',8,12)==='WEBP';
  const actual=png?'image/png':jpeg?'image/jpeg':webp?'image/webp':null;
  if(!actual||actual!==mime)return res.status(415).json({error:'Invalid image type'});
  await pool.query(`INSERT INTO customer_project_logos(draft_id,mime_type,data) VALUES($1,$2,$3)
    ON CONFLICT(draft_id) DO UPDATE SET mime_type=EXCLUDED.mime_type,data=EXCLUDED.data,updated_at=now()`,[draftId,actual,data]);
  res.set('Cache-Control','private, no-store').json({saved:true,draftId});
 }));
 router.get('/project-drafts/:id/logo',requireCustomer,safe(async(req,res)=>{
  if(!z.string().uuid().safeParse(req.params.id).success)return res.status(404).end();
  const result=await pool.query(`SELECT l.mime_type,l.data FROM customer_project_logos l
   JOIN customer_project_drafts d ON d.id=l.draft_id
   WHERE l.draft_id=$1 AND d.customer_id=$2`,[req.params.id,req.customer.id]);
  if(!result.rowCount)return res.status(404).end();
  res.set({'Content-Type':result.rows[0].mime_type,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}).send(result.rows[0].data);
 }));
 router.get('/workspace',requireCustomer,safe(async(req,res)=>{
  const result=await pool.query('SELECT draft,revision,updated_at FROM customer_workspace_drafts WHERE customer_id=$1',[req.customer.id]);
  res.set('Cache-Control','no-store').json({workspace:result.rows[0]||{draft:{},revision:0}});
 }));
 router.patch('/workspace',requireCustomer,safe(async(req,res)=>{
  const parsed=draftSchema.safeParse(req.body);
  if(!parsed.success||!Object.keys(parsed.data).length)return res.status(400).json({error:'Invalid draft'});
  // Atomic top-level merge, so entering through another section does not erase existing choices.
  const result=await pool.query(`INSERT INTO customer_workspace_drafts(customer_id,draft)
   VALUES($1,$2::jsonb)
   ON CONFLICT(customer_id) DO UPDATE SET draft=customer_workspace_drafts.draft||EXCLUDED.draft,
      revision=customer_workspace_drafts.revision+1,updated_at=now()
   RETURNING draft,revision,updated_at`,[req.customer.id,JSON.stringify(parsed.data)]);
  res.set('Cache-Control','no-store').json({workspace:result.rows[0]});
 }));

 // Branding belongs to a specific project draft and may be read only by its verified owner.
 router.post('/project-drafts/:id/logo',requireCustomer,safe(async(req,res)=>{
  if(!z.string().uuid().safeParse(req.params.id).success)return res.status(404).json({error:'Project not found'});
  const owned=await pool.query("SELECT id FROM customer_project_drafts WHERE id=$1 AND customer_id=$2",[req.params.id,req.customer.id]);
  if(!owned.rowCount)return res.status(404).json({error:'Project not found'});
  const mime=String(req.get('content-type')||'').split(';')[0].trim().toLowerCase();
  const bytes=req.body;
  if(!Buffer.isBuffer(bytes)||!bytes.length||bytes.length>2097152)return res.status(413).json({error:'Logo must be an image up to 2 MB'});
  const png=bytes.length>=8&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  const jpeg=bytes.length>=3&&bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff;
  const webp=bytes.length>=12&&bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP';
  const actual=png?'image/png':jpeg?'image/jpeg':webp?'image/webp':null;
  if(!actual||actual!==mime)return res.status(415).json({error:'Invalid image type'});
  await pool.query(`INSERT INTO customer_project_logos(draft_id,mime_type,data) VALUES($1,$2,$3)
   ON CONFLICT(draft_id) DO UPDATE SET mime_type=EXCLUDED.mime_type,data=EXCLUDED.data,updated_at=now()`,[req.params.id,actual,bytes]);
  res.set('Cache-Control','private, no-store').json({saved:true});
 }));
 router.get('/project-drafts/:id/logo',requireCustomer,safe(async(req,res)=>{
  if(!z.string().uuid().safeParse(req.params.id).success)return res.status(404).end();
  const result=await pool.query(`SELECT logos.mime_type,logos.data FROM customer_project_logos logos
   JOIN customer_project_drafts projects ON projects.id=logos.draft_id
   WHERE logos.draft_id=$1 AND projects.customer_id=$2`,[req.params.id,req.customer.id]);
  if(!result.rowCount)return res.status(404).end();
  res.set({'Content-Type':result.rows[0].mime_type,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}).send(result.rows[0].data);
 }));
 router.post('/workspace/logo',requireCustomer,safe(async(req,res)=>{
  const mime=String(req.get('content-type')||'').split(';')[0].trim().toLowerCase();
  const data=req.body;
  if(!Buffer.isBuffer(data)||data.length===0||data.length>2097152)return res.status(413).json({error:'Logo must be an image up to 2 MB'});
  const png=data.length>=8&&data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  const jpeg=data.length>=3&&data[0]===0xff&&data[1]===0xd8&&data[2]===0xff;
  const webp=data.length>=12&&data.toString('ascii',0,4)==='RIFF'&&data.toString('ascii',8,12)==='WEBP';
  const actual=png?'image/png':jpeg?'image/jpeg':webp?'image/webp':null;
  if(!actual||actual!==mime)return res.status(415).json({error:'Invalid image type'});
  await pool.query(`INSERT INTO customer_workspace_logos(customer_id,mime_type,data)
     VALUES($1,$2,$3) ON CONFLICT(customer_id) DO UPDATE
     SET mime_type=EXCLUDED.mime_type,data=EXCLUDED.data,updated_at=now()`,[req.customer.id,actual,data]);
  res.set('Cache-Control','private, no-store').json({saved:true});
 }));
 router.get('/workspace/logo',requireCustomer,safe(async(req,res)=>{
  const result=await pool.query('SELECT mime_type,data FROM customer_workspace_logos WHERE customer_id=$1',[req.customer.id]);
  if(!result.rowCount)return res.status(404).end();
  res.set({'Content-Type':result.rows[0].mime_type,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}).send(result.rows[0].data);
 }));
 router.get('/projects',requireCustomer,safe(async(req,res)=>{const q=await pool.query('SELECT id,customer_name,status,created_at,updated_at FROM customer_journey_projects WHERE customer_account_id=$1 ORDER BY created_at DESC LIMIT 100',[req.customer.id]);res.json({projects:q.rows});}));
 router.post('/logout',(_req,res)=>{res.clearCookie(sessionCookie,cookieOptions);res.json({ok:true});});
 return router;
}
