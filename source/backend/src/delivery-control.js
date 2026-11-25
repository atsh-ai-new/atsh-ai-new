import {mkdir,writeFile,unlink,stat} from 'node:fs/promises';
import {createReadStream,createWriteStream} from 'node:fs';
import {pipeline} from 'node:stream/promises';
import {Transform} from 'node:stream';
import {join,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import express from 'express';
import jwt from 'jsonwebtoken';
import {z} from 'zod';
const wrap=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
const uuid=z.string().uuid();
const asset=z.object({projectId:uuid,title:z.string().trim().min(1).max(180),kind:z.enum(['video','brand','image','document','archive','other']),assetUrl:z.union([z.literal(''),z.string().url().max(2048)]).default('')}).strict();
const allowedMime = new Set(['video/mp4','video/webm','image/png','image/jpeg','image/webp','application/pdf','application/zip']);
const privateDir = resolve(process.env.ATSH_PRIVATE_FILES_DIR || '/var/lib/atsh-ai/private-deliverables');
const maxFileBytes = 512*1024*1024;
const mimeFor = value => allowedMime.has(value) ? value : null;
const serviceKeys=['customer_assistant','content_studio','project_builder','new_orders','customer_deliveries'];
import {safeAssetUrl} from './delivery-validation.js';
import {operationGuard} from './operation-guards.js';
import {fullPaymentGateSql} from './customer-journey-state.js';

export function deliveryAdminRouter({pool,operationsOnly=false}){
 const r=express.Router();
 r.get('/services',wrap(async(_req,res)=>{const q=await pool.query('SELECT service_key,enabled,note,updated_at FROM platform_service_controls ORDER BY service_key');res.json({services:serviceKeys.map(key=>q.rows.find(x=>x.service_key===key)||{service_key:key,enabled:true,note:null})});}));
 r.patch('/services/:key',wrap(async(req,res)=>{if(!serviceKeys.includes(req.params.key))return res.status(404).json({error:'Unknown service'});const parsed=z.object({enabled:z.boolean(),note:z.string().max(500).optional()}).strict().safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'Invalid settings'});const q=await pool.query(`INSERT INTO platform_service_controls(service_key,enabled,note,updated_by) VALUES($1,$2,$3,$4) ON CONFLICT(service_key) DO UPDATE SET enabled=EXCLUDED.enabled,note=EXCLUDED.note,updated_by=EXCLUDED.updated_by,updated_at=now() RETURNING *`,[req.params.key,parsed.data.enabled,parsed.data.note||null,req.admin.email||req.admin.userId||'owner']);res.json({service:q.rows[0],notice:'Control flag saved; external workers require separate enforcement'});}));
 if(operationsOnly)return r;
 r.use((req,res,next)=>['POST','PATCH','PUT','DELETE'].includes(req.method)?operationGuard(pool,'customer_deliveries')(req,res,next):next());
 r.get('/',wrap(async(req,res)=>{const id=uuid.safeParse(req.query.projectId);if(!id.success)return res.status(400).json({error:'projectId required'});const q=await pool.query('SELECT * FROM customer_deliverables WHERE project_id=$1 ORDER BY created_at DESC LIMIT 100',[id.data]);res.json({deliverables:q.rows});}));
 r.post('/',wrap(async(req,res)=>{const d=asset.safeParse(req.body);if(!d.success||(d.data.assetUrl && !safeAssetUrl(d.data.assetUrl)))return res.status(400).json({error:'Invalid deliverable or HTTPS URL'});const q=await pool.query('INSERT INTO customer_deliverables(project_id,title,kind,asset_url,created_by) VALUES($1,$2,$3,$4,$5) RETURNING *',[d.data.projectId,d.data.title,d.data.kind,d.data.assetUrl,req.admin.email||req.admin.userId||'owner']);res.status(201).json({deliverable:q.rows[0]});}));
 r.put('/:id/file',wrap(async(req,res)=>{
  if(!uuid.safeParse(req.params.id).success)return res.status(400).json({error:'Invalid ID'});
  const mime=mimeFor(req.get('content-type')?.split(';')[0]?.trim());
  if(!mime)return res.status(415).json({error:'Unsupported file type'});
  const declared=Number(req.get('content-length'));
  if(req.get('content-length') && (!Number.isSafeInteger(declared)||declared<1||declared>maxFileBytes))return res.status(413).json({error:'File exceeds 512 MiB limit'});
  const fileId=randomUUID();
  await mkdir(privateDir,{recursive:true,mode:0o700});
  const filePath=join(privateDir,fileId);
  let bytes=0;
  const first=[];
  const meter=new Transform({transform(chunk,_encoding,callback){
   bytes+=chunk.length;
   if(bytes>maxFileBytes)return callback(Object.assign(new Error('File too large'),{status:413}));
   if(first.reduce((n,b)=>n+b.length,0)<16)first.push(chunk.subarray(0,16));
   callback(null,chunk);
  }});
  try{await pipeline(req,meter,createWriteStream(filePath,{flags:'wx',mode:0o600}));}
  catch(e){await unlink(filePath).catch(()=>{});if(e.status===413)return res.status(413).json({error:'File exceeds 512 MiB limit'});throw e;}
  if(!bytes){await unlink(filePath).catch(()=>{});return res.status(400).json({error:'Empty file'});}
  const signature=Buffer.concat(first).subarray(0,16);
  const starts=(value)=>signature.subarray(0,value.length).equals(Buffer.from(value));
  const valid=mime==='video/mp4'?(signature.toString('ascii',4,8)==='ftyp'):
   mime==='video/webm'?starts([0x1a,0x45,0xdf,0xa3]):
   mime==='image/png'?starts([137,80,78,71,13,10,26,10]):
   mime==='image/jpeg'?starts([255,216,255]):
   mime==='image/webp'?signature.toString('ascii',0,4)==='RIFF'&&signature.toString('ascii',8,12)==='WEBP':
   mime==='application/pdf'?signature.toString('ascii',0,5)==='%PDF-':
   mime==='application/zip'?starts([80,75,3,4]):false;
  if(!valid){await unlink(filePath).catch(()=>{});return res.status(415).json({error:'File signature does not match declared type'});}
  try{
   const q=await pool.query(`INSERT INTO customer_deliverable_files(deliverable_id,storage_key,mime_type,byte_size,uploaded_by)
    SELECT id,$2,$3,$4,$5 FROM customer_deliverables WHERE id=$1 AND status='draft'
    ON CONFLICT(deliverable_id) DO UPDATE SET storage_key=EXCLUDED.storage_key,mime_type=EXCLUDED.mime_type,byte_size=EXCLUDED.byte_size,uploaded_by=EXCLUDED.uploaded_by,updated_at=now()
    RETURNING storage_key`,[req.params.id,fileId,mime,bytes,req.admin.email||req.admin.userId||'owner']);
   if(!q.rowCount){await unlink(filePath).catch(()=>{});return res.status(409).json({error:'Deliverable missing or not draft'});}
   res.status(201).json({stored:true,bytes});
  }catch(e){await unlink(filePath).catch(()=>{});throw e;}
 }));
 r.patch('/:id',wrap(async(req,res)=>{if(!uuid.safeParse(req.params.id).success)return res.status(400).json({error:'Invalid ID'});const d=z.object({status:z.enum(['draft','published','withdrawn'])}).strict().safeParse(req.body);if(!d.success)return res.status(400).json({error:'Invalid status'});const q=await pool.query(`UPDATE customer_deliverables d
   SET status=$2,published_at=CASE WHEN $2='published' THEN now() ELSE d.published_at END,updated_at=now()
   FROM customer_journey_projects p
   WHERE d.id=$1 AND p.id=d.project_id
     AND ($2<>'published' OR (p.status IN ('paid','building','preview_ready','approved','delivered','support')
       AND ${fullPaymentGateSql('p.id')}
       AND (d.asset_url<>'' OR EXISTS (SELECT 1 FROM customer_deliverable_files f WHERE f.deliverable_id=d.id))))
   RETURNING d.*`,[req.params.id,d.data.status]);
  if(!q.rowCount)return res.status(409).json({error:'Deliverable not found, no artifact is attached, or project payment has not been confirmed'});await pool.query('INSERT INTO delivery_events(deliverable_id,actor_type,actor_id,event_type) VALUES($1,$2,$3,$4)',[req.params.id,'admin',req.admin.email||req.admin.userId||'owner',d.data.status]);res.json({deliverable:q.rows[0]});}));
 return r;
}
export function deliveryCustomerRouter({pool,allowedOrigins=[]}){
 const r=express.Router();
 r.use(wrap(async(req,res,next)=>{try{const token=req.cookies?.atsh_customer;const p=jwt.verify(token,process.env.JWT_SECRET,{issuer:'atsh-ai-api',audience:'atsh-customer'});if(p.kind!=='customer')throw Error();const q=await pool.query('SELECT id,session_version,is_active,email_verified_at FROM customer_accounts WHERE id=$1',[p.sub]);const u=q.rows[0];if(!u?.is_active||!u.email_verified_at||u.session_version!==p.ver)throw Error();req.customer=u;next();}catch{return res.status(401).json({error:'Sign in required'});}}));
 r.get('/',wrap(async(req,res)=>{const q=await pool.query(`SELECT d.id,d.project_id,d.title,d.kind,d.asset_url,d.version,d.customer_decision,d.customer_feedback,d.published_at,(f.deliverable_id IS NOT NULL) AS has_private_file FROM customer_deliverables d LEFT JOIN customer_deliverable_files f ON f.deliverable_id=d.id JOIN customer_journey_projects p ON p.id=d.project_id WHERE p.customer_account_id=$1 AND d.status='published' AND ${fullPaymentGateSql('p.id')} ORDER BY d.published_at DESC LIMIT 100`,[req.customer.id]);res.json({deliverables:q.rows});}));
 r.get('/:id/file',wrap(async(req,res)=>{
  if(!uuid.safeParse(req.params.id).success)return res.status(400).json({error:'Invalid ID'});
  const q=await pool.query(`SELECT f.storage_key,f.mime_type,f.byte_size,d.title
   FROM customer_deliverable_files f JOIN customer_deliverables d ON d.id=f.deliverable_id
   JOIN customer_journey_projects p ON p.id=d.project_id
   WHERE d.id=$1 AND p.customer_account_id=$2 AND d.status='published' AND ${fullPaymentGateSql('p.id')}`,[req.params.id,req.customer.id]);
  if(!q.rowCount)return res.status(404).json({error:'File unavailable'});
  const file=q.rows[0];
  if(!/^[0-9a-f-]{36}$/.test(file.storage_key))return res.status(500).json({error:'Invalid storage key'});
  const path=join(privateDir,file.storage_key);
  let metadata;
  try{metadata=await stat(path);}catch(e){if(e.code==='ENOENT')return res.status(404).json({error:'File missing'});throw e;}
  if(!metadata.isFile() || metadata.size!==Number(file.byte_size))return res.status(409).json({error:'Stored file integrity mismatch'});
  res.set('Content-Type',file.mime_type);
  res.set('Content-Disposition',`attachment; filename="deliverable-${req.params.id}"`);
  res.set('Content-Length',String(metadata.size));
  res.set('Cache-Control','private, no-store');
  res.set('X-Content-Type-Options','nosniff');
  const stream=createReadStream(path);
  stream.on('error',err=>{if(!res.headersSent)res.status(500).end();else res.destroy(err);});
  stream.pipe(res);
 }));
 r.post('/:id/decision',operationGuard(pool,'customer_deliveries'),wrap(async(req,res)=>{if(!allowedOrigins.includes(req.get('origin')))return res.status(403).json({error:'Origin not allowed'});if(!uuid.safeParse(req.params.id).success)return res.status(400).json({error:'Invalid ID'});const d=z.object({decision:z.enum(['approved','revision_requested']),feedback:z.string().max(3000).default('')}).strict().safeParse(req.body);if(!d.success||d.data.decision==='revision_requested'&&!d.data.feedback.trim())return res.status(400).json({error:'Feedback required for revision'});const client=await pool.connect();try{await client.query('BEGIN');const q=await client.query(`UPDATE customer_deliverables d SET customer_decision=$3,customer_feedback=$4,updated_at=now() FROM customer_journey_projects p WHERE d.project_id=p.id AND d.id=$1 AND p.customer_account_id=$2 AND d.status='published' AND ${fullPaymentGateSql('p.id')} AND d.customer_decision='pending' RETURNING d.id,d.customer_decision`,[req.params.id,req.customer.id,d.data.decision,d.data.feedback]);if(!q.rowCount){await client.query('ROLLBACK');return res.status(404).json({error:'Not found or already reviewed'});}await client.query('INSERT INTO delivery_events(deliverable_id,actor_type,actor_id,event_type,details) VALUES($1,$2,$3,$4,$5)',[req.params.id,'customer',String(req.customer.id),d.data.decision,JSON.stringify({feedback:d.data.feedback})]);await client.query('COMMIT');res.json({deliverable:q.rows[0]});}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}}));
 return r;
}
